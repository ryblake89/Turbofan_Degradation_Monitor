"""Operations planning agent — maintenance scheduling and fleet management."""

import logging

from src.memory.decision_trace import build_sensor_context
from src.memory.playbook import playbook_retrieval
from src.tools.fleet_tools import fleet_summary
from src.tools.maintenance_tools import maintenance_scheduler

logger = logging.getLogger(__name__)


def _extract_tool_result(tool_results: list[dict], tool_name: str) -> dict | None:
    """Find a specific tool result from the accumulated list."""
    for tr in tool_results:
        if tr.get("tool") == tool_name:
            return tr.get("result")
    return None


def _determine_action_and_urgency(health_result: dict, rul_result: dict) -> tuple[str, str]:
    """Determine maintenance action type and urgency from diagnostic results."""
    label = health_result.get("health_label", "healthy")
    rul = rul_result.get("estimated_rul", 999) if rul_result else 999

    if label == "near_failure" or rul <= 5:
        return "replace", "immediate"
    elif label == "critical" or rul <= 15:
        return "service", "soon"
    elif label == "degrading" or rul <= 40:
        return "inspect", "routine"
    else:
        return "inspect", "routine"


def ops_planning_node(state: dict) -> dict:
    """Handle maintenance requests and fleet overview queries."""
    intent = state["current_intent"]
    unit_id = state.get("current_unit_id")
    tool_results = list(state.get("tool_results", []))

    if intent == "fleet_overview":
        fleet_result = fleet_summary(top_n=5)
        tool_results.append({"tool": "fleet_summary", "result": fleet_result})
        return {
            "tool_results": tool_results,
            "requires_approval": False,
        }

    # maintenance_request — build evidence from prior diagnostic results
    anomaly_result = _extract_tool_result(tool_results, "anomaly_check")
    rul_result = _extract_tool_result(tool_results, "rul_estimate")
    health_result = _extract_tool_result(tool_results, "health_index")
    trend_result = _extract_tool_result(tool_results, "sensor_trend_analysis")

    # Build sensor context for playbook retrieval
    health_index_val = health_result["health_index"] if health_result else None
    sensor_context = build_sensor_context(
        anomaly_result=anomaly_result,
        rul_result=rul_result,
        trend_result=trend_result,
        health_index=health_index_val,
    )

    # Retrieve similar past cases
    retrieved = []
    if unit_id is not None:
        playbook_result = playbook_retrieval(unit_id, sensor_context)
        tool_results.append({"tool": "playbook_retrieval", "result": playbook_result})
        retrieved = playbook_result.get("similar_cases", [])

    # Build evidence dict for the maintenance scheduler
    evidence = {
        "health_index": sensor_context.get("health_index", 50.0),
        "anomaly_score": anomaly_result.get("anomaly_score", 0) if anomaly_result else 0,
        "normalized_score": sensor_context.get("normalized_score", 50.0),
        "estimated_rul": sensor_context.get("estimated_rul", 100),
        "degradation_stage": sensor_context.get("degradation_stage", "unknown"),
        "trend_summary": sensor_context.get("trend_summary", "unknown"),
    }

    # Determine action type and urgency from health data
    action_type, urgency = _determine_action_and_urgency(
        health_result or {}, rul_result or {},
    )

    # Schedule maintenance
    maint_result = maintenance_scheduler(
        unit_id=unit_id,
        action_type=action_type,
        urgency=urgency,
        evidence=evidence,
    )
    tool_results.append({"tool": "maintenance_scheduler", "result": maint_result})

    logger.info(
        "Ops planning: unit=%s, action=%s, urgency=%s, log_id=%d",
        unit_id, action_type, urgency, maint_result["log_id"],
    )

    return {
        "tool_results": tool_results,
        "requires_approval": True,
        "pending_action": maint_result,
        "retrieved_playbooks": retrieved,
    }
