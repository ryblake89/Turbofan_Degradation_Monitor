"""Tests for maintenance tool functions.

Tests create and update rows in maintenance_log against the live database.
"""

import pytest

from src.tools.maintenance_tools import (
    approve_maintenance,
    maintenance_scheduler,
    reject_maintenance,
)


@pytest.fixture
def sample_evidence():
    return {
        "health_index": 32.5,
        "anomaly_score": -0.08,
        "normalized_score": 15.0,
        "estimated_rul": 12,
        "degradation_stage": "critical",
    }


class TestMaintenanceScheduler:
    def test_creates_proposal(self, sample_evidence):
        result = maintenance_scheduler(
            unit_id=1,
            action_type="inspect",
            urgency="soon",
            evidence=sample_evidence,
        )

        assert result["unit_id"] == 1
        assert result["proposed_action"] == "inspect"
        assert result["urgency"] == "soon"
        assert result["requires_approval"] is True
        assert isinstance(result["log_id"], int)
        assert result["proposed_window"] == "within 5 cycles"
        assert isinstance(result["evidence_summary"], str)
        assert isinstance(result["cmms_work_order_draft"], dict)

    def test_cmms_draft_structure(self, sample_evidence):
        result = maintenance_scheduler(
            unit_id=5, action_type="replace", urgency="immediate",
            evidence=sample_evidence,
        )
        draft = result["cmms_work_order_draft"]
        assert "work_order_id" in draft
        assert draft["work_order_id"].startswith("WO-")
        assert draft["equipment_id"] == "TURBOFAN-005"
        assert draft["action"] == "replace"
        assert draft["priority"] == "immediate"

    def test_urgency_windows(self, sample_evidence):
        for urgency, expected in [
            ("routine", "within 20 cycles"),
            ("soon", "within 5 cycles"),
            ("immediate", "within 1 cycle"),
        ]:
            result = maintenance_scheduler(
                unit_id=1, action_type="inspect", urgency=urgency,
                evidence=sample_evidence,
            )
            assert result["proposed_window"] == expected

    def test_invalid_action_type(self, sample_evidence):
        with pytest.raises(ValueError, match="Invalid action_type"):
            maintenance_scheduler(
                unit_id=1, action_type="demolish", urgency="soon",
                evidence=sample_evidence,
            )

    def test_invalid_urgency(self, sample_evidence):
        with pytest.raises(ValueError, match="Invalid urgency"):
            maintenance_scheduler(
                unit_id=1, action_type="inspect", urgency="whenever",
                evidence=sample_evidence,
            )


class TestApproveReject:
    def test_approve_flow(self, sample_evidence):
        proposal = maintenance_scheduler(
            unit_id=2, action_type="service", urgency="routine",
            evidence=sample_evidence,
        )
        result = approve_maintenance(proposal["log_id"], approved_by="test_operator")

        assert result["status"] == "approved"
        assert result["updated_by"] == "test_operator"
        assert result["log_id"] == proposal["log_id"]

    def test_reject_flow(self, sample_evidence):
        proposal = maintenance_scheduler(
            unit_id=3, action_type="inspect", urgency="soon",
            evidence=sample_evidence,
        )
        result = reject_maintenance(proposal["log_id"], approved_by="test_operator")

        assert result["status"] == "rejected"
        assert result["log_id"] == proposal["log_id"]

    def test_double_approve_raises(self, sample_evidence):
        proposal = maintenance_scheduler(
            unit_id=4, action_type="inspect", urgency="routine",
            evidence=sample_evidence,
        )
        approve_maintenance(proposal["log_id"])

        with pytest.raises(ValueError, match="No pending maintenance"):
            approve_maintenance(proposal["log_id"])

    def test_nonexistent_log_raises(self):
        with pytest.raises(ValueError, match="No pending maintenance"):
            approve_maintenance(999999)
