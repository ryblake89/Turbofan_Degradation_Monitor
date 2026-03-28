"""Trace logger node — logs decision traces after each agent interaction."""

import logging

from src.memory.decision_trace import build_sensor_context, log_decision_trace

logger = logging.getLogger(__name__)


def _extract_tool_result(tool_results: list[dict], tool_name: str) -> dict | None:
    """Find a specific tool result from the accumulated list."""
    for tr in tool_results:
        if tr.get("tool") == tool_name:
            return tr.get("result")
    return None


def trace_logger_node(state: dict) -> dict:
    """Log a decision trace for this interaction."""
    unit_id = state.get("current_unit_id")
    intent = state.get("current_intent", "")
    tool_results = state.get("tool_results", [])

    # Extract the user's original query
    query = ""
    for msg in state.get("messages", []):
        if msg.type == "human":
            query = msg.content
            break

    # Extract the agent's final response
    recommendation = ""
    for msg in reversed(state.get("messages", [])):
        if msg.type == "ai":
            recommendation = msg.content
            break

    # Build sensor context from tool results
    anomaly_result = _extract_tool_result(tool_results, "anomaly_check")
    rul_result = _extract_tool_result(tool_results, "rul_estimate")
    trend_result = _extract_tool_result(tool_results, "sensor_trend_analysis")
    health_result = _extract_tool_result(tool_results, "health_index")

    health_val = health_result["health_index"] if health_result else None
    sensor_context = build_sensor_context(
        anomaly_result=anomaly_result,
        rul_result=rul_result,
        trend_result=trend_result,
        health_index=health_val,
    )

    # Build tools_called summary
    tools_called = [
        {"tool": tr["tool"], "has_result": "result" in tr}
        for tr in tool_results
        if tr.get("tool") != "error"
    ]

    # Determine action/outcome
    approval = state.get("decision_trace", {}).get("approval")
    pending = state.get("pending_action")

    if approval == "approved":
        action_taken = "maintenance_approved"
        outcome = "approved"
    elif approval == "rejected":
        action_taken = "maintenance_rejected"
        outcome = "rejected"
    elif pending:
        action_taken = "maintenance_proposed"
        outcome = "pending"
    else:
        action_taken = "informational"
        outcome = "informational"

    # Log the trace (use unit_id=0 for fleet queries with no specific unit)
    trace_unit = unit_id if unit_id is not None else 0

    try:
        trace_id = log_decision_trace(
            unit_id=trace_unit,
            sensor_context=sensor_context,
            query=query,
            intent=intent,
            tools_called=tools_called,
            recommendation=recommendation[:2000],  # Truncate long responses
            action_taken=action_taken,
            outcome=outcome,
        )
        logger.info("Trace logged: id=%d, unit=%s, intent=%s", trace_id, trace_unit, intent)
    except Exception:
        logger.exception("Failed to log decision trace")
        trace_id = None

    return {"decision_trace": {"trace_id": trace_id}}
