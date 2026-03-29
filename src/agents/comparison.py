"""Comparison agent node — run diagnostic tools on multiple units for side-by-side analysis."""

import logging

from src.models.health_index import compute_health_index, health_label
from src.tools.graph_tools import graph_context_lookup
from src.tools.sensor_tools import anomaly_check, rul_estimate

logger = logging.getLogger(__name__)


def comparison_node(state: dict) -> dict:
    """Run diagnostic tools on multiple units for comparison."""
    unit_ids = state.get("comparison_unit_ids", [])
    primary_unit = state.get("current_unit_id")

    # Fallback: if comparison_unit_ids is empty but we have a primary unit
    if not unit_ids and primary_unit:
        unit_ids = [primary_unit]

    if not unit_ids:
        return {
            "tool_results": [{"tool": "error", "error": "No unit IDs specified for comparison."}]
        }

    tool_results = []
    graph_results = []

    for uid in unit_ids:
        try:
            anomaly_result = anomaly_check(uid)
            tool_results.append({"tool": "anomaly_check", "result": anomaly_result})

            rul_result = rul_estimate(uid)
            tool_results.append({"tool": "rul_estimate", "result": rul_result})

            health = compute_health_index(anomaly_result, rul_result)
            label = health_label(health)
            tool_results.append({
                "tool": "health_index",
                "result": {"unit_id": uid, "health_index": round(health, 1), "health_label": label},
            })

        except Exception as e:
            logger.exception("Comparison tool error for unit %s", uid)
            tool_results.append({"tool": "error", "error": f"Unit {uid}: {e}"})

        # Graph context: related units
        try:
            related = graph_context_lookup(uid, "related_units")
            tool_results.append({"tool": "graph_related_units", "result": related})
            graph_results.append(related)
        except Exception:
            logger.warning("Neo4j unavailable for unit %s comparison", uid)

    # Structured comparison summary
    comparison_summary = _build_comparison_summary(unit_ids, tool_results)
    tool_results.append({"tool": "unit_comparison_summary", "result": comparison_summary})

    return {"tool_results": tool_results, "graph_context": graph_results}


def _build_comparison_summary(unit_ids: list[int], tool_results: list[dict]) -> dict:
    """Build a structured comparison dict from per-unit tool results."""
    units = {}
    for uid in unit_ids:
        anomaly = next(
            (tr["result"] for tr in tool_results
             if tr.get("tool") == "anomaly_check" and tr.get("result", {}).get("unit_id") == uid),
            None,
        )
        rul = next(
            (tr["result"] for tr in tool_results
             if tr.get("tool") == "rul_estimate" and tr.get("result", {}).get("unit_id") == uid),
            None,
        )
        health = next(
            (tr["result"] for tr in tool_results
             if tr.get("tool") == "health_index" and tr.get("result", {}).get("unit_id") == uid),
            None,
        )
        units[uid] = {
            "health_index": health.get("health_index") if health else None,
            "health_label": health.get("health_label") if health else None,
            "estimated_rul": rul.get("estimated_rul") if rul else None,
            "degradation_stage": rul.get("degradation_stage") if rul else None,
            "anomaly_score": anomaly.get("normalized_score") if anomaly else None,
            "is_anomalous": anomaly.get("is_anomalous") if anomaly else None,
        }

    # Compute deltas between units (for 2-unit comparisons)
    deltas = {}
    uid_list = list(units.keys())
    if len(uid_list) == 2:
        a, b = uid_list
        ua, ub = units[a], units[b]
        for metric in ["health_index", "estimated_rul", "anomaly_score"]:
            va, vb = ua.get(metric), ub.get(metric)
            if va is not None and vb is not None:
                deltas[f"{metric}_delta"] = round(vb - va, 1)

    # Cross-reference: check if compared units appear in each other's related_units
    mutual_similarity = {}
    for uid in unit_ids:
        related = next(
            (tr["result"] for tr in tool_results
             if tr.get("tool") == "graph_related_units" and tr.get("result", {}).get("unit_id") == uid),
            None,
        )
        if related and related.get("similar_units"):
            for other_uid in unit_ids:
                if other_uid == uid:
                    continue
                match = next(
                    (su for su in related["similar_units"] if su["unit_id"] == other_uid),
                    None,
                )
                if match:
                    mutual_similarity[f"{uid}_to_{other_uid}"] = match.get("similarity_score")

    return {
        "unit_ids": unit_ids,
        "units": units,
        "deltas": deltas,
        "mutual_similarity": mutual_similarity,
    }
