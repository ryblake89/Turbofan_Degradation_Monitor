"""Integration tests for the LangGraph multi-agent system.

Tests run against the live PostgreSQL database and the real Claude API (Haiku).
Each test validates one of the three conversation flows end-to-end.
"""

import pytest
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from src.agents.graph import compile_graph


@pytest.fixture(scope="module")
def graph():
    """Compile the agent graph with a MemorySaver checkpointer."""
    return compile_graph(checkpointer=MemorySaver())


def _run_graph(graph, user_message: str, thread_id: str = "test"):
    """Helper to invoke the graph with a single user message."""
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke(
        {"messages": [HumanMessage(content=user_message)]},
        config=config,
    )
    return result, config


# ---- Flow 1: Status Check ----

class TestStatusCheck:
    """Flow 1: 'How is unit 14 doing?' → supervisor → diagnostic → response → trace."""

    def test_status_check_end_to_end(self, graph):
        result, _ = _run_graph(graph, "How is unit 14 doing?", thread_id="status-14")

        # Should have classified intent
        assert result["current_intent"] == "status_check"
        assert result["current_unit_id"] == 14

        # Should have tool results from diagnostic agent
        tool_names = [tr["tool"] for tr in result["tool_results"]]
        assert "anomaly_check" in tool_names
        assert "rul_estimate" in tool_names
        assert "health_index" in tool_names

        # Should NOT require approval
        assert result["requires_approval"] is False

        # Should have an AI response message
        ai_messages = [m for m in result["messages"] if m.type == "ai"]
        assert len(ai_messages) >= 1
        assert len(ai_messages[-1].content) > 20  # Non-trivial response

        # Should have logged a decision trace
        assert result.get("decision_trace", {}).get("trace_id") is not None


# ---- Flow 2: Maintenance Request (HITL) ----

class TestMaintenanceRequest:
    """Flow 2: maintenance request → diagnostic → ops_planning → approval → action."""

    def test_maintenance_request_approve(self, graph):
        config = {"configurable": {"thread_id": "maint-approve-7"}}

        # First invocation — should pause at approval gate
        result = graph.invoke(
            {"messages": [HumanMessage(content="Schedule maintenance on unit 7, it's been acting up.")]},
            config=config,
        )

        # Should have classified as maintenance_request
        assert result["current_intent"] == "maintenance_request"
        assert result["current_unit_id"] == 7

        # Should have diagnostic + ops_planning tool results
        tool_names = [tr["tool"] for tr in result["tool_results"]]
        assert "anomaly_check" in tool_names
        assert "rul_estimate" in tool_names
        assert "maintenance_scheduler" in tool_names

        # Should have a pending action
        assert result["pending_action"] is not None
        log_id = result["pending_action"]["log_id"]
        assert log_id > 0

        # Resume with approval
        result2 = graph.invoke(
            Command(resume="yes"),
            config=config,
        )

        # After approval, action should be executed
        ai_messages = [m for m in result2["messages"] if m.type == "ai"]
        assert any("approved" in m.content.lower() for m in ai_messages)

        # Trace should be logged
        assert result2.get("decision_trace", {}).get("trace_id") is not None

    def test_maintenance_request_reject(self, graph):
        config = {"configurable": {"thread_id": "maint-reject-7"}}

        # First invocation — pause at approval gate
        result = graph.invoke(
            {"messages": [HumanMessage(content="Schedule maintenance on unit 12.")]},
            config=config,
        )

        assert result["pending_action"] is not None

        # Resume with rejection
        result2 = graph.invoke(
            Command(resume="no"),
            config=config,
        )

        ai_messages = [m for m in result2["messages"] if m.type == "ai"]
        assert any("reject" in m.content.lower() for m in ai_messages)


# ---- Flow 3: Fleet Overview ----

class TestFleetOverview:
    """Flow 3: fleet overview → supervisor → ops_planning → response → trace."""

    def test_fleet_overview_end_to_end(self, graph):
        result, _ = _run_graph(
            graph,
            "What's the fleet status? Any units I should worry about?",
            thread_id="fleet-1",
        )

        # Should have classified intent
        assert result["current_intent"] == "fleet_overview"

        # Should have fleet_summary in tool results
        tool_names = [tr["tool"] for tr in result["tool_results"]]
        assert "fleet_summary" in tool_names

        # Should NOT require approval
        assert result["requires_approval"] is False

        # Should have an AI response
        ai_messages = [m for m in result["messages"] if m.type == "ai"]
        assert len(ai_messages) >= 1

        # Fleet summary tool result should have expected fields
        fleet_result = next(
            tr["result"] for tr in result["tool_results"] if tr["tool"] == "fleet_summary"
        )
        assert "total_units" in fleet_result
        assert "priority_list" in fleet_result
        assert fleet_result["total_units"] == 100

        # Trace logged
        assert result.get("decision_trace", {}).get("trace_id") is not None


# ---- Edge cases ----

class TestEdgeCases:
    """Edge case handling."""

    def test_unknown_unit_id(self, graph):
        """Unit 999 doesn't exist — diagnostic should handle gracefully."""
        result, _ = _run_graph(graph, "How is unit 999 doing?", thread_id="edge-999")

        # Should still produce a response (error message via response_generator)
        tool_results = result.get("tool_results", [])
        has_error = any(tr.get("tool") == "error" for tr in tool_results)
        assert has_error

    def test_anomaly_investigation(self, graph):
        """Anomaly investigation should include trend analysis."""
        result, _ = _run_graph(
            graph,
            "Unit 3 sensors look weird, investigate the anomaly.",
            thread_id="anomaly-3",
        )

        assert result["current_intent"] == "anomaly_investigation"
        tool_names = [tr["tool"] for tr in result["tool_results"]]
        assert "sensor_trend_analysis" in tool_names
        assert "anomaly_check" in tool_names

    def test_ambiguous_query(self, graph):
        """Ambiguous query with no unit_id should not crash."""
        result, _ = _run_graph(
            graph,
            "Tell me about the engines",
            thread_id="edge-ambiguous",
        )
        # Should classify as some intent and produce a response
        assert result["current_intent"] in (
            "status_check", "anomaly_investigation",
            "maintenance_request", "fleet_overview",
        )
        ai_messages = [m for m in result["messages"] if m.type == "ai"]
        assert len(ai_messages) >= 1

    def test_nonsensical_query(self, graph):
        """Off-topic query should not crash the graph."""
        result, _ = _run_graph(
            graph,
            "What's the weather like today?",
            thread_id="edge-nonsense",
        )
        # Supervisor classifies it as something — graph should still complete
        assert result["current_intent"] in (
            "status_check", "anomaly_investigation",
            "maintenance_request", "fleet_overview",
        )

    def test_multi_unit_query(self, graph):
        """Multi-unit query should not crash — supervisor picks one unit."""
        result, _ = _run_graph(
            graph,
            "Compare unit 3 and unit 7",
            thread_id="edge-multi-unit",
        )
        assert result["current_intent"] in (
            "status_check", "anomaly_investigation",
            "maintenance_request", "fleet_overview",
        )
        # Should not crash even if only one unit_id is extracted
