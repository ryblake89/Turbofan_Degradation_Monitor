"""Tests for the memory layer — decision trace logging.

Tests run against the live PostgreSQL database (Docker Compose).
"""

import numpy as np
import pytest
from sqlalchemy import text

from src.data.database import engine
from src.memory.decision_trace import (
    EMBED_DIM,
    build_sensor_context,
    compute_embedding,
    log_decision_trace,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def _cleanup_test_traces():
    """Clean up test traces after the module runs."""
    yield
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM decision_traces WHERE session_id LIKE 'test-%'"))
        conn.commit()


# ---------------------------------------------------------------------------
# build_sensor_context tests
# ---------------------------------------------------------------------------

class TestBuildSensorContext:
    def test_defaults_when_no_inputs(self):
        ctx = build_sensor_context()
        assert ctx["normalized_score"] == 50.0
        assert ctx["estimated_rul"] == 100
        assert ctx["degradation_stage"] == "unknown"
        assert ctx["health_index"] == 50.0
        assert ctx["trend_summary"] == "unknown"
        assert ctx["top_sensors"] == []
        assert ctx["divergence_scores"] == {}

    def test_from_anomaly_result(self):
        anomaly = {
            "normalized_score": 23.5,
            "top_contributing_sensors": [
                {"sensor": "sensor_11", "importance": 0.3},
                {"sensor": "sensor_12", "importance": 0.2},
            ],
        }
        ctx = build_sensor_context(anomaly_result=anomaly)
        assert ctx["normalized_score"] == 23.5
        assert ctx["top_sensors"] == ["sensor_11", "sensor_12"]

    def test_from_rul_result(self):
        rul = {"estimated_rul": 42, "degradation_stage": "critical"}
        ctx = build_sensor_context(rul_result=rul)
        assert ctx["estimated_rul"] == 42
        assert ctx["degradation_stage"] == "critical"

    def test_from_trend_result(self):
        trend = {
            "trend_summary": "accelerating",
            "cross_sensor_divergence": {"sensor_11/sensor_12": 0.85},
        }
        ctx = build_sensor_context(trend_result=trend)
        assert ctx["trend_summary"] == "accelerating"
        assert ctx["divergence_scores"]["sensor_11/sensor_12"] == 0.85

    def test_explicit_health_index_overrides_computed(self):
        anomaly = {"normalized_score": 80.0}
        rul = {"estimated_rul": 50}
        ctx = build_sensor_context(anomaly_result=anomaly, rul_result=rul, health_index=99.0)
        assert ctx["health_index"] == 99.0

    def test_health_index_auto_computed(self):
        anomaly = {"normalized_score": 80.0}
        rul = {"estimated_rul": 100}
        ctx = build_sensor_context(anomaly_result=anomaly, rul_result=rul)
        # 0.4 * 80 + 0.6 * min(100/200, 1) * 100 = 32 + 30 = 62
        assert abs(ctx["health_index"] - 62.0) < 0.1


# ---------------------------------------------------------------------------
# compute_embedding tests
# ---------------------------------------------------------------------------

class TestComputeEmbedding:
    def test_output_shape(self):
        ctx = build_sensor_context()
        emb = compute_embedding(ctx)
        assert len(emb) == EMBED_DIM

    def test_deterministic(self):
        ctx = build_sensor_context(
            anomaly_result={"normalized_score": 30.0},
            rul_result={"estimated_rul": 50, "degradation_stage": "critical"},
        )
        emb1 = compute_embedding(ctx)
        emb2 = compute_embedding(ctx)
        assert emb1 == emb2

    def test_unit_normalized(self):
        ctx = build_sensor_context(
            anomaly_result={"normalized_score": 30.0},
            rul_result={"estimated_rul": 50, "degradation_stage": "critical"},
        )
        emb = np.array(compute_embedding(ctx))
        norm = np.linalg.norm(emb)
        assert abs(norm - 1.0) < 1e-6

    def test_different_contexts_produce_different_embeddings(self):
        ctx_healthy = build_sensor_context(
            anomaly_result={"normalized_score": 90.0},
            rul_result={"estimated_rul": 200, "degradation_stage": "healthy"},
        )
        ctx_critical = build_sensor_context(
            anomaly_result={"normalized_score": 10.0},
            rul_result={"estimated_rul": 5, "degradation_stage": "critical"},
        )
        emb_h = compute_embedding(ctx_healthy)
        emb_c = compute_embedding(ctx_critical)
        assert emb_h != emb_c

    def test_similar_contexts_high_cosine_similarity(self):
        ctx1 = build_sensor_context(
            anomaly_result={"normalized_score": 25.0},
            rul_result={"estimated_rul": 30, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating"},
        )
        ctx2 = build_sensor_context(
            anomaly_result={"normalized_score": 27.0},
            rul_result={"estimated_rul": 28, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating"},
        )
        emb1 = np.array(compute_embedding(ctx1))
        emb2 = np.array(compute_embedding(ctx2))
        similarity = np.dot(emb1, emb2)
        assert similarity > 0.99  # very similar contexts → very high similarity

    def test_opposite_contexts_low_cosine_similarity(self):
        ctx_good = build_sensor_context(
            anomaly_result={"normalized_score": 95.0},
            rul_result={"estimated_rul": 250, "degradation_stage": "healthy"},
            trend_result={"trend_summary": "stable"},
        )
        ctx_bad = build_sensor_context(
            anomaly_result={"normalized_score": 5.0},
            rul_result={"estimated_rul": 2, "degradation_stage": "near_failure"},
            trend_result={"trend_summary": "accelerating"},
        )
        emb_g = np.array(compute_embedding(ctx_good))
        emb_b = np.array(compute_embedding(ctx_bad))
        similarity = np.dot(emb_g, emb_b)
        assert similarity < 0.5  # very different → low similarity


# ---------------------------------------------------------------------------
# Integration tests (require DB)
# ---------------------------------------------------------------------------

class TestDecisionTraceLogging:
    def test_log_and_retrieve(self, _cleanup_test_traces):
        ctx = build_sensor_context(
            anomaly_result={"normalized_score": 20.0,
                            "top_contributing_sensors": [{"sensor": "sensor_11", "importance": 0.4}]},
            rul_result={"estimated_rul": 15, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating"},
            health_index=18.0,
        )
        trace_id = log_decision_trace(
            unit_id=7,
            sensor_context=ctx,
            query="How is unit 7?",
            intent="diagnostic",
            tools_called=[{"tool": "anomaly_check", "input": {"unit_id": 7}}],
            recommendation="Unit 7 critical — recommend service.",
            action_taken="maintenance_proposed",
            outcome="approved",
            session_id="test-log-001",
        )
        assert isinstance(trace_id, int)
        assert trace_id > 0

        # Verify it's in the database
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT unit_id, intent, action_taken FROM decision_traces WHERE id = :id"),
                {"id": trace_id},
            ).fetchone()
        assert row is not None
        assert row[0] == 7
        assert row[1] == "diagnostic"
        assert row[2] == "maintenance_proposed"


