"""Tests for the memory layer — decision trace logging and playbook retrieval.

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
from src.memory.playbook import (
    FAILURE_PATTERNS,
    _match_failure_pattern,
    playbook_retrieval,
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
# Pattern matching tests
# ---------------------------------------------------------------------------

class TestPatternMatching:
    def test_hpc_pattern(self):
        ctx = {"top_sensors": ["sensor_11", "sensor_12", "sensor_4"]}
        assert _match_failure_pattern(ctx) == "hpc_degradation"

    def test_fan_pattern(self):
        ctx = {"top_sensors": ["sensor_2", "sensor_15"]}
        assert _match_failure_pattern(ctx) == "fan_degradation"

    def test_no_match_empty(self):
        ctx = {"top_sensors": []}
        assert _match_failure_pattern(ctx) is None

    def test_no_match_irrelevant_sensors(self):
        ctx = {"top_sensors": ["sensor_1", "sensor_5"]}
        # sensor_1 and sensor_5 are constant sensors, not in any pattern
        assert _match_failure_pattern(ctx) is None


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


class TestPlaybookRetrieval:
    @pytest.fixture(autouse=True)
    def _seed_test_traces(self, _cleanup_test_traces):
        """Seed a few traces for retrieval testing."""
        # Critical unit with HPC pattern
        ctx_critical = build_sensor_context(
            anomaly_result={"normalized_score": 15.0,
                            "top_contributing_sensors": [
                                {"sensor": "sensor_11", "importance": 0.4},
                                {"sensor": "sensor_12", "importance": 0.3},
                            ]},
            rul_result={"estimated_rul": 10, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating",
                          "cross_sensor_divergence": {"sensor_11/sensor_12": 0.8}},
            health_index=12.0,
        )
        log_decision_trace(
            unit_id=3, sensor_context=ctx_critical,
            query="Unit 3 is degrading fast",
            intent="maintenance_planning",
            recommendation="Immediate service for unit 3",
            action_taken="maintenance_proposed", outcome="approved",
            session_id="test-seed-001",
        )

        # Healthy unit
        ctx_healthy = build_sensor_context(
            anomaly_result={"normalized_score": 88.0},
            rul_result={"estimated_rul": 180, "degradation_stage": "healthy"},
            trend_result={"trend_summary": "stable"},
            health_index=85.0,
        )
        log_decision_trace(
            unit_id=50, sensor_context=ctx_healthy,
            query="Status of unit 50",
            intent="status_check",
            recommendation="Unit 50 healthy",
            action_taken="informational", outcome="informational",
            session_id="test-seed-002",
        )

        # Another critical unit (different unit, similar to ctx_critical)
        ctx_critical2 = build_sensor_context(
            anomaly_result={"normalized_score": 18.0,
                            "top_contributing_sensors": [
                                {"sensor": "sensor_11", "importance": 0.35},
                                {"sensor": "sensor_12", "importance": 0.25},
                            ]},
            rul_result={"estimated_rul": 14, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating",
                          "cross_sensor_divergence": {"sensor_11/sensor_12": 0.75}},
            health_index=16.0,
        )
        log_decision_trace(
            unit_id=8, sensor_context=ctx_critical2,
            query="Unit 8 showing HPC issues",
            intent="maintenance_planning",
            recommendation="Service unit 8 within 5 cycles",
            action_taken="maintenance_proposed", outcome="approved",
            session_id="test-seed-003",
        )

    def test_similar_critical_finds_matches(self):
        """A critical context should find the seeded critical traces."""
        query_ctx = build_sensor_context(
            anomaly_result={"normalized_score": 16.0,
                            "top_contributing_sensors": [
                                {"sensor": "sensor_11", "importance": 0.38},
                                {"sensor": "sensor_12", "importance": 0.28},
                            ]},
            rul_result={"estimated_rul": 12, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating",
                          "cross_sensor_divergence": {"sensor_11/sensor_12": 0.78}},
            health_index=14.0,
        )
        result = playbook_retrieval(unit_id=99, current_context=query_ctx, min_similarity=0.5)

        assert len(result["similar_cases"]) > 0
        assert result["recommended_action"] is not None
        assert result["confidence"] > 0.5
        # Should detect HPC pattern
        assert result["pattern_name"] == "hpc_degradation"

    def test_healthy_context_finds_healthy_matches(self):
        """A healthy context should find the seeded healthy trace, not critical ones."""
        query_ctx = build_sensor_context(
            anomaly_result={"normalized_score": 90.0},
            rul_result={"estimated_rul": 190, "degradation_stage": "healthy"},
            trend_result={"trend_summary": "stable"},
            health_index=87.0,
        )
        result = playbook_retrieval(unit_id=99, current_context=query_ctx, min_similarity=0.5)

        if result["similar_cases"]:
            # The top match should be the healthy trace, not a critical one
            top = result["similar_cases"][0]
            assert top["action_taken"] == "informational"

    def test_excludes_same_unit(self):
        """Retrieval should exclude traces from the queried unit."""
        query_ctx = build_sensor_context(
            anomaly_result={"normalized_score": 15.0},
            rul_result={"estimated_rul": 10, "degradation_stage": "critical"},
            trend_result={"trend_summary": "accelerating"},
            health_index=12.0,
        )
        # Query as unit 3 — should not find the unit 3 trace
        result = playbook_retrieval(unit_id=3, current_context=query_ctx, min_similarity=0.5)
        for case in result["similar_cases"]:
            assert case["unit_id"] != 3

    def test_no_results_below_threshold(self):
        """With an impossibly high threshold, no results should be returned."""
        # Use a distinctive context that won't accidentally match default-embedding
        # traces (fleet_overview / error traces produce the same default vector).
        query_ctx = build_sensor_context(
            anomaly_result={"normalized_score": 77.7},
            rul_result={"estimated_rul": 777, "degradation_stage": "healthy"},
            trend_result={"trend_summary": "stable"},
            health_index=77.7,
        )
        result = playbook_retrieval(unit_id=99, current_context=query_ctx, min_similarity=0.999)
        assert result["similar_cases"] == []
        assert result["recommended_action"] is None
        assert result["confidence"] == 0.0

    def test_result_structure(self):
        """Verify the return dict matches the spec."""
        query_ctx = build_sensor_context(
            anomaly_result={"normalized_score": 16.0},
            rul_result={"estimated_rul": 12, "degradation_stage": "critical"},
        )
        result = playbook_retrieval(unit_id=99, current_context=query_ctx, min_similarity=0.5)

        assert "similar_cases" in result
        assert "recommended_action" in result
        assert "confidence" in result
        assert "pattern_name" in result
        assert isinstance(result["similar_cases"], list)
        assert isinstance(result["confidence"], float)
