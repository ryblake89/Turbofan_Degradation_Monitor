"""End-to-end tests for the FastAPI REST API.

Tests run against the live database and real Claude API (Haiku).
Each test validates an API endpoint or a full conversation flow over HTTP.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.app import app


@pytest.fixture(scope="module")
def client():
    """Create a TestClient that triggers the lifespan (graph compilation)."""
    with TestClient(app) as c:
        yield c


# ---- Health check ----

class TestHealth:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


# ---- Direct tool endpoints ----

class TestUnitStatus:
    def test_unit_status_valid(self, client):
        resp = client.get("/units/14/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["unit_id"] == 14
        assert 0 <= data["health_index"] <= 100
        assert data["health_label"] in ("healthy", "degrading", "critical", "near_failure")
        assert "anomaly" in data
        assert "rul" in data

    def test_unit_status_invalid(self, client):
        resp = client.get("/units/999/status")
        assert resp.status_code == 404

    def test_unit_zero(self, client):
        resp = client.get("/units/0/status")
        assert resp.status_code == 404

    def test_unit_negative(self, client):
        resp = client.get("/units/-1/status")
        assert resp.status_code == 404


class TestFleetSummary:
    def test_fleet_summary(self, client):
        resp = client.get("/fleet/summary?top_n=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_units"] == 100
        assert len(data["priority_list"]) <= 5
        assert "units_critical" in data

    def test_fleet_summary_default(self, client):
        resp = client.get("/fleet/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["priority_list"]) <= 10

    def test_fleet_summary_top_n_zero(self, client):
        """top_n=0 should be rejected by ge=1 constraint."""
        resp = client.get("/fleet/summary?top_n=0")
        assert resp.status_code == 422

    def test_fleet_summary_top_n_negative(self, client):
        resp = client.get("/fleet/summary?top_n=-5")
        assert resp.status_code == 422

    def test_fleet_summary_top_n_over_limit(self, client):
        resp = client.get("/fleet/summary?top_n=101")
        assert resp.status_code == 422


class TestMaintenanceLog:
    def test_maintenance_log_all(self, client):
        resp = client.get("/maintenance/log")
        assert resp.status_code == 200
        data = resp.json()
        assert "entries" in data
        assert "total" in data

    def test_maintenance_log_filtered(self, client):
        resp = client.get("/maintenance/log?status=pending&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        for entry in data["entries"]:
            assert entry["status"] == "pending"


class TestTraces:
    def test_list_traces(self, client):
        resp = client.get("/traces?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "traces" in data
        assert "total" in data

    def test_trace_not_found(self, client):
        resp = client.get("/traces/999999")
        assert resp.status_code == 404


# ---- Chat endpoints ----

class TestChat:
    def test_status_check(self, client):
        """Full flow: status check via POST /chat."""
        resp = client.post("/chat", json={"message": "How is unit 14 doing?"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"]
        assert data["intent"] == "status_check"
        assert data["unit_id"] == 14
        assert data["requires_approval"] is False
        assert len(data["response"]) > 20

    def test_fleet_overview(self, client):
        """Full flow: fleet overview via POST /chat."""
        resp = client.post("/chat", json={"message": "Fleet status overview"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "fleet_overview"
        assert data["requires_approval"] is False

    def test_session_id_returned(self, client):
        """Auto-generated session_id should be returned."""
        resp = client.post("/chat", json={"message": "How is unit 1 doing?"})
        data = resp.json()
        assert data["session_id"].startswith("sess-")

    def test_custom_session_id(self, client):
        """Provided session_id should be used."""
        resp = client.post(
            "/chat",
            json={"message": "How is unit 2 doing?", "session_id": "my-session"},
        )
        data = resp.json()
        assert data["session_id"] == "my-session"


class TestHITLFlow:
    """Full HITL maintenance approval flow over REST."""

    def test_approve_flow(self, client):
        # Step 1: request maintenance
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 7, it's degrading fast.",
                "session_id": "hitl-approve-test",
            },
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["intent"] == "maintenance_request"
        assert data1["requires_approval"] is True
        assert data1["pending_action"] is not None
        assert data1["pending_action"]["log_id"] > 0

        # Step 2: approve
        resp2 = client.post(
            "/chat/hitl-approve-test/approve",
            json={"approved": True},
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["requires_approval"] is False
        assert "approved" in data2["response"].lower()

    def test_reject_flow(self, client):
        # Step 1: request maintenance
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 12.",
                "session_id": "hitl-reject-test",
            },
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["requires_approval"] is True

        # Step 2: reject
        resp2 = client.post(
            "/chat/hitl-reject-test/approve",
            json={"approved": False},
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["requires_approval"] is False
        # After rejection, the graph completes (trace logged, no pending action)
        assert data2["pending_action"] is None
        assert data2["trace_id"] is not None

    def test_approve_no_pending(self, client):
        """Approving a session with no pending action → 409."""
        resp = client.post(
            "/chat/nonexistent-session/approve",
            json={"approved": True},
        )
        assert resp.status_code == 409

    def test_double_approve(self, client):
        """Approve same session twice → second should return 409."""
        # Step 1: request maintenance
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 5.",
                "session_id": "hitl-double-approve",
            },
        )
        assert resp1.status_code == 200
        assert resp1.json()["requires_approval"] is True

        # Step 2: first approve succeeds
        resp2 = client.post(
            "/chat/hitl-double-approve/approve",
            json={"approved": True},
        )
        assert resp2.status_code == 200

        # Step 3: second approve fails
        resp3 = client.post(
            "/chat/hitl-double-approve/approve",
            json={"approved": True},
        )
        assert resp3.status_code == 409


class TestChatEdgeCases:
    """Edge cases for chat endpoints."""

    def test_empty_message(self, client):
        """Empty message should be rejected with 422."""
        resp = client.post("/chat", json={"message": ""})
        assert resp.status_code == 422

    def test_whitespace_only_message(self, client):
        """Whitespace-only message should be rejected with 422."""
        resp = client.post("/chat", json={"message": "   "})
        assert resp.status_code == 422

    def test_missing_message_field(self, client):
        """Missing message field should be rejected with 422."""
        resp = client.post("/chat", json={})
        assert resp.status_code == 422

    def test_message_to_paused_session(self, client):
        """Sending a new message to a session awaiting approval → 409."""
        # Step 1: create a pending session
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 10.",
                "session_id": "hitl-paused-msg",
            },
        )
        assert resp1.status_code == 200
        assert resp1.json()["requires_approval"] is True

        # Step 2: try to send a new message to the paused session
        resp2 = client.post(
            "/chat",
            json={
                "message": "How is unit 1 doing?",
                "session_id": "hitl-paused-msg",
            },
        )
        assert resp2.status_code == 409


class TestTraceCompleteness:
    """Verify that every interaction produces a decision trace."""

    def test_status_check_has_trace(self, client):
        resp = client.post(
            "/chat",
            json={"message": "How is unit 14 doing?", "session_id": "trace-status"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["trace_id"] is not None

    def test_fleet_overview_has_trace(self, client):
        resp = client.post(
            "/chat",
            json={"message": "Fleet status overview", "session_id": "trace-fleet"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["trace_id"] is not None

    def test_maintenance_approve_has_trace(self, client):
        """HITL approve flow should produce a trace after completion."""
        # Step 1: maintenance request
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 8.",
                "session_id": "trace-maint-approve",
            },
        )
        assert resp1.status_code == 200

        # Step 2: approve
        resp2 = client.post(
            "/chat/trace-maint-approve/approve",
            json={"approved": True},
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["trace_id"] is not None

    def test_maintenance_reject_has_trace(self, client):
        """HITL reject flow should produce a trace after completion."""
        resp1 = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 9.",
                "session_id": "trace-maint-reject",
            },
        )
        assert resp1.status_code == 200

        resp2 = client.post(
            "/chat/trace-maint-reject/approve",
            json={"approved": False},
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["trace_id"] is not None

    def test_trace_has_correct_intent(self, client):
        """Verify trace stored in DB matches the interaction."""
        resp = client.post(
            "/chat",
            json={"message": "How is unit 20 doing?", "session_id": "trace-verify"},
        )
        data = resp.json()
        trace_id = data["trace_id"]
        assert trace_id is not None

        # Query the DB to verify
        trace_resp = client.get(f"/traces/{trace_id}")
        assert trace_resp.status_code == 200
        trace = trace_resp.json()
        assert trace["intent"] == "status_check"
        assert trace["unit_id"] == 20
        assert trace["tools_called"] is not None
        assert len(trace["tools_called"]) > 0
        assert trace["action_taken"] == "informational"


class TestApprovalFlowHardening:
    """Detailed approval flow DB state verification."""

    def test_multi_session_isolation(self, client):
        """Two sessions can each have pending approvals simultaneously."""
        # Create two pending sessions
        resp_a = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 15.",
                "session_id": "hitl-multi-a",
            },
        )
        resp_b = client.post(
            "/chat",
            json={
                "message": "Schedule maintenance on unit 16.",
                "session_id": "hitl-multi-b",
            },
        )
        assert resp_a.json()["requires_approval"] is True
        assert resp_b.json()["requires_approval"] is True

        # Approve A, reject B — they should not interfere
        resp_a2 = client.post(
            "/chat/hitl-multi-a/approve", json={"approved": True},
        )
        resp_b2 = client.post(
            "/chat/hitl-multi-b/approve", json={"approved": False},
        )
        assert resp_a2.status_code == 200
        assert "approved" in resp_a2.json()["response"].lower()

        assert resp_b2.status_code == 200
        assert resp_b2.json()["pending_action"] is None
