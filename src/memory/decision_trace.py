"""Decision trace logging with numeric feature vector embeddings.

Embedding strategy: deterministic numeric feature vectors (no ML model).
Sensor data similarity is inherently numeric — we match patterns like
(normalized_score=12.7, estimated_rul=24, trend=accelerating) to similar
past patterns. A 384-dim vector built from normalized sensor features is
faster, lighter, more precise, and deterministic compared to text embeddings.

Vector layout (384 dimensions):
  [0]       normalized_score (0-100 → 0-1)
  [1]       estimated_rul (clamped 0-300 → 0-1)
  [2]       health_index (0-100 → 0-1)
  [3:7]     degradation_stage one-hot (healthy, degrading, critical, near_failure)
  [7:11]    trend_summary one-hot (stable, gradual_degradation, accelerating, unknown)
  [11:18]   top_sensors binary flags (sensor_2,3,4,7,11,12,15 = KEY_SENSORS)
  [18:39]   divergence_scores for 21 sensor pairs (normalized)
  [39:384]  zero-padded
"""

import json
import logging
import uuid

import numpy as np
from sqlalchemy import text

from src.config import KEY_SENSORS
from src.data.database import engine

logger = logging.getLogger(__name__)

# Embedding dimension (matches VECTOR(384) column)
EMBED_DIM = 384

# Canonical orderings for one-hot encoding
_DEGRADATION_STAGES = ["healthy", "degrading", "critical", "near_failure"]
_TREND_SUMMARIES = ["stable", "gradual_degradation", "accelerating", "unknown"]

# Canonical divergence pair keys (sorted for determinism)
# Cross-sensor divergence from trend_analyzer uses pairs of KEY_SENSORS
_DIVERGENCE_PAIRS = []
for i, s1 in enumerate(KEY_SENSORS):
    for s2 in KEY_SENSORS[i + 1:]:
        _DIVERGENCE_PAIRS.append(f"{s1}/{s2}")


def build_sensor_context(
    anomaly_result: dict | None = None,
    rul_result: dict | None = None,
    trend_result: dict | None = None,
    health_index: float | None = None,
) -> dict:
    """Build a standardized sensor_context dict from tool outputs.

    Accepts any combination of tool results. Missing fields get sensible
    defaults so the embedding function always has a consistent schema.
    """
    ctx: dict = {
        "normalized_score": 50.0,
        "estimated_rul": 100,
        "degradation_stage": "unknown",
        "health_index": 50.0,
        "trend_summary": "unknown",
        "top_sensors": [],
        "divergence_scores": {},
    }

    if anomaly_result:
        ctx["normalized_score"] = anomaly_result.get("normalized_score", 50.0)
        top = anomaly_result.get("top_contributing_sensors", [])
        ctx["top_sensors"] = (
            [s["sensor"] for s in top] if top and isinstance(top[0], dict) else top
        )

    if rul_result:
        ctx["estimated_rul"] = rul_result.get("estimated_rul", 100)
        ctx["degradation_stage"] = rul_result.get("degradation_stage", "unknown")

    if trend_result:
        ctx["trend_summary"] = trend_result.get("trend_summary", "unknown")
        ctx["divergence_scores"] = trend_result.get("cross_sensor_divergence", {})

    if health_index is not None:
        ctx["health_index"] = health_index
    elif anomaly_result and rul_result:
        # Compute inline if both are available (same formula as health_index.py)
        norm = anomaly_result.get("normalized_score", 50.0)
        rul = rul_result.get("estimated_rul", 100)
        rul_norm = min(rul / 200.0, 1.0) * 100
        ctx["health_index"] = 0.4 * norm + 0.6 * rul_norm

    return ctx


def compute_embedding(sensor_context: dict) -> list[float]:
    """Convert a sensor_context dict into a 384-dim numeric feature vector.

    Deterministic: same input always produces the same output.
    """
    vec = np.zeros(EMBED_DIM, dtype=np.float64)
    idx = 0

    # [0] normalized_score: 0-100 → 0-1
    vec[idx] = np.clip(sensor_context.get("normalized_score", 50.0) / 100.0, 0, 1)
    idx += 1

    # [1] estimated_rul: clamped 0-300 → 0-1
    vec[idx] = np.clip(sensor_context.get("estimated_rul", 100) / 300.0, 0, 1)
    idx += 1

    # [2] health_index: 0-100 → 0-1
    vec[idx] = np.clip(sensor_context.get("health_index", 50.0) / 100.0, 0, 1)
    idx += 1

    # [3:7] degradation_stage one-hot
    stage = sensor_context.get("degradation_stage", "unknown")
    if stage in _DEGRADATION_STAGES:
        vec[idx + _DEGRADATION_STAGES.index(stage)] = 1.0
    idx += len(_DEGRADATION_STAGES)

    # [7:11] trend_summary one-hot
    trend = sensor_context.get("trend_summary", "unknown")
    if trend in _TREND_SUMMARIES:
        vec[idx + _TREND_SUMMARIES.index(trend)] = 1.0
    idx += len(_TREND_SUMMARIES)

    # [11:18] top_sensors binary flags (KEY_SENSORS order)
    top_sensors = sensor_context.get("top_sensors", [])
    for i, sensor in enumerate(KEY_SENSORS):
        if sensor in top_sensors:
            vec[idx + i] = 1.0
    idx += len(KEY_SENSORS)

    # [18:18+len(_DIVERGENCE_PAIRS)] divergence scores (clamped 0-1)
    divergence = sensor_context.get("divergence_scores", {})
    for i, pair_key in enumerate(_DIVERGENCE_PAIRS):
        if pair_key in divergence:
            vec[idx + i] = np.clip(float(divergence[pair_key]), 0, 1)
    idx += len(_DIVERGENCE_PAIRS)

    # Normalize to unit length for cosine similarity
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm

    return vec.tolist()


def log_decision_trace(
    unit_id: int,
    sensor_context: dict,
    query: str = "",
    intent: str = "",
    tools_called: list[dict] | None = None,
    recommendation: str = "",
    action_taken: str = "informational",
    outcome: str = "informational",
    session_id: str | None = None,
) -> int:
    """Log a decision trace with its embedding to the database.

    Args:
        unit_id: Engine unit this trace is about.
        sensor_context: Standardized sensor context dict.
        query: Original user query.
        intent: Classified intent (diagnostic, maintenance_planning, etc.).
        tools_called: Ordered list of tool calls with inputs/outputs.
        recommendation: Agent's final response text.
        action_taken: What happened (informational, maintenance_proposed, etc.).
        outcome: Result (approved, rejected, informational).
        session_id: Conversation session ID (auto-generated if not provided).

    Returns:
        The id of the inserted decision_traces row.
    """
    if session_id is None:
        session_id = f"sess-{uuid.uuid4().hex[:12]}"

    embedding = compute_embedding(sensor_context)

    insert = text("""
        INSERT INTO decision_traces
            (session_id, unit_id, query, intent, tools_called,
             recommendation, action_taken, outcome, sensor_context, embedding)
        VALUES
            (:session_id, :unit_id, :query, :intent, :tools_called,
             :recommendation, :action_taken, :outcome, :sensor_context, :embedding)
        RETURNING id
    """)

    with engine.connect() as conn:
        result = conn.execute(insert, {
            "session_id": session_id,
            "unit_id": unit_id,
            "query": query,
            "intent": intent,
            "tools_called": json.dumps(tools_called or []),
            "recommendation": recommendation,
            "action_taken": action_taken,
            "outcome": outcome,
            "sensor_context": json.dumps(sensor_context),
            "embedding": str(embedding),
        })
        trace_id = result.fetchone()[0]
        conn.commit()

    logger.info("Decision trace logged: id=%d, unit=%d, intent=%s", trace_id, unit_id, intent)
    return trace_id
