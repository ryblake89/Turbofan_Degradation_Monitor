"""Diagnostic agent node — equipment health assessment via sensor tools."""

import logging

from src.models.health_index import compute_health_index, health_label
from src.tools.sensor_tools import anomaly_check, rul_estimate, sensor_trend_analysis

logger = logging.getLogger(__name__)


def diagnostic_node(state: dict) -> dict:
    """Run diagnostic tools based on the classified intent.

    Tool selection is rule-based:
    - status_check: anomaly_check + rul_estimate
    - anomaly_investigation: anomaly_check + sensor_trend_analysis + rul_estimate
    - maintenance_request: anomaly_check + rul_estimate (gather evidence for ops_planning)
    """
    unit_id = state["current_unit_id"]
    intent = state["current_intent"]
    tool_results = list(state.get("tool_results", []))

    if unit_id is None:
        tool_results.append({
            "tool": "error",
            "error": "No unit_id specified. Please specify an engine unit.",
        })
        return {"tool_results": tool_results}

    try:
        # Always run anomaly_check and rul_estimate
        anomaly_result = anomaly_check(unit_id)
        tool_results.append({"tool": "anomaly_check", "result": anomaly_result})

        rul_result = rul_estimate(unit_id)
        tool_results.append({"tool": "rul_estimate", "result": rul_result})

        # Compute health index from anomaly + RUL
        health = compute_health_index(anomaly_result, rul_result)
        label = health_label(health)
        tool_results.append({
            "tool": "health_index",
            "result": {"health_index": round(health, 1), "health_label": label},
        })

        # anomaly_investigation gets full trend analysis too
        if intent == "anomaly_investigation":
            trend_result = sensor_trend_analysis(unit_id)
            tool_results.append({"tool": "sensor_trend_analysis", "result": trend_result})

    except Exception as e:
        logger.exception("Diagnostic tool error for unit %s", unit_id)
        tool_results.append({"tool": "error", "error": str(e)})

    logger.info(
        "Diagnostic agent: unit=%s, intent=%s, tools_run=%d",
        unit_id, intent, len(tool_results),
    )

    return {"tool_results": tool_results}
