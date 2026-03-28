"""Playbook retrieval — semantic similarity search over past decision traces.

Uses pgvector cosine similarity to find past traces with similar sensor
patterns. Returns the most relevant past decisions with their outcomes
so the agent can reference them ("Unit 3 showed this same pattern 50
cycles before failure — recommend immediate inspection").
"""

import json
import logging
from collections import Counter

from sqlalchemy import text

from src.config import KEY_SENSORS
from src.data.database import engine
from src.memory.decision_trace import compute_embedding

logger = logging.getLogger(__name__)

# Similarity threshold — don't return matches below this (cosine similarity).
# Numeric feature vectors are sparse (39 active dims in 384), so cosine
# similarities are lower than dense text embeddings. 0.50 is a good cutoff.
_MIN_SIMILARITY = 0.50

# Maximum results to return
_MAX_RESULTS = 5

# Named failure patterns: sensor signature → pattern name + description
# These are matched when the top contributing sensors align with known modes.
FAILURE_PATTERNS = {
    "hpc_degradation": {
        "description": "HPC efficiency loss — Ps30 and fuel-flow/Ps30 ratio diverging",
        "signature_sensors": {"sensor_11", "sensor_12"},
    },
    "fan_degradation": {
        "description": "Fan efficiency loss — inlet temperature trending with bypass ratio stable",
        "signature_sensors": {"sensor_2", "sensor_15"},
    },
    "lpt_degradation": {
        "description": "LPT efficiency loss — LPT outlet temperature anomalous",
        "signature_sensors": {"sensor_7"},
    },
    "general_wear": {
        "description": "Multi-sensor degradation consistent with end-of-life wear",
        "signature_sensors": {"sensor_4", "sensor_11", "sensor_12"},
    },
}


def _match_failure_pattern(sensor_context: dict) -> str | None:
    """Check if the sensor context matches a known failure pattern.

    Matches when the top contributing sensors overlap significantly with
    a known pattern's signature sensors.
    """
    top_sensors = set(sensor_context.get("top_sensors", []))
    if not top_sensors:
        return None

    best_pattern = None
    best_score = 0.0

    for pattern_name, pattern in FAILURE_PATTERNS.items():
        sig = pattern["signature_sensors"]
        overlap = len(top_sensors & sig)
        # Require at least half the signature sensors to be present
        if overlap >= max(1, len(sig) // 2):
            # Score by fraction of signature matched (prefer specific patterns)
            score = overlap / len(sig)
            if score > best_score:
                best_score = score
                best_pattern = pattern_name

    return best_pattern


def playbook_retrieval(
    unit_id: int,
    current_context: dict,
    top_k: int = _MAX_RESULTS,
    min_similarity: float = _MIN_SIMILARITY,
) -> dict:
    """Search past decision traces for similar situations.

    Uses pgvector cosine similarity on the sensor_context embedding
    to find the most relevant past cases. Excludes traces from the
    same unit (we want cross-unit pattern transfer).

    Args:
        unit_id: Current unit being analyzed (excluded from results).
        current_context: Sensor context dict (same schema as decision_traces.sensor_context).
        top_k: Maximum number of similar cases to return.
        min_similarity: Minimum cosine similarity threshold.

    Returns:
        Dict with similar_cases, recommended_action, confidence, pattern_name.
    """
    embedding = compute_embedding(current_context)

    # pgvector cosine distance: 1 - cosine_similarity
    # So similarity = 1 - distance. We want similarity >= threshold.
    max_distance = 1.0 - min_similarity

    query = text("""
        SELECT
            id, unit_id, query, intent, recommendation,
            action_taken, outcome, sensor_context,
            1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM decision_traces
        WHERE unit_id != :exclude_unit
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> CAST(:embedding AS vector))) >= :min_sim
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)

    with engine.connect() as conn:
        rows = conn.execute(query, {
            "embedding": str(embedding),
            "exclude_unit": unit_id,
            "min_sim": min_similarity,
            "top_k": top_k,
        }).fetchall()

    if not rows:
        return {
            "similar_cases": [],
            "recommended_action": None,
            "confidence": 0.0,
            "pattern_name": None,
        }

    similar_cases = []
    actions = []
    for row in rows:
        ctx = row[7] if isinstance(row[7], dict) else json.loads(row[7])
        case = {
            "trace_id": row[0],
            "unit_id": row[1],
            "query": row[2],
            "intent": row[3],
            "recommendation": row[4],
            "action_taken": row[5],
            "outcome": row[6],
            "sensor_context": ctx,
            "similarity": round(float(row[8]), 4),
        }
        similar_cases.append(case)
        if row[5]:  # action_taken
            actions.append(row[5])

    # Recommended action = most common action among similar cases
    recommended_action = None
    if actions:
        action_counts = Counter(actions)
        recommended_action = action_counts.most_common(1)[0][0]

    # Confidence = average similarity of returned cases
    avg_similarity = sum(c["similarity"] for c in similar_cases) / len(similar_cases)

    # Check for named failure pattern
    pattern_name = _match_failure_pattern(current_context)

    return {
        "similar_cases": similar_cases,
        "recommended_action": recommended_action,
        "confidence": round(avg_similarity, 4),
        "pattern_name": pattern_name,
    }
