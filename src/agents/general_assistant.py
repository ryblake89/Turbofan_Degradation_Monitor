"""General assistant node — LLM-driven tool selection via Claude's native tool_use."""

import logging

from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

from src.config import AGENT_MODEL
from src.tools.fleet_tools import fleet_summary
from src.tools.graph_tools import graph_context_lookup
from src.tools.sensor_tools import anomaly_check, rul_estimate, sensor_trend_analysis

logger = logging.getLogger(__name__)


# ---- LangChain tool wrappers (read-only subset) ----

@tool
def anomaly_check_tool(unit_id: int) -> dict:
    """Run Isolation Forest anomaly detection on a specific engine unit.
    Returns anomaly score, whether the unit is anomalous, and the top contributing sensors.
    unit_id must be between 1 and 100."""
    return anomaly_check(unit_id)


@tool
def rul_estimate_tool(unit_id: int) -> dict:
    """Estimate remaining useful life for a specific engine unit.
    Returns estimated RUL in cycles, confidence interval, degradation stage, and per-sensor detail.
    unit_id must be between 1 and 100."""
    return rul_estimate(unit_id)


@tool
def sensor_trend_analysis_tool(unit_id: int) -> dict:
    """Analyze sensor trends for a unit: rolling statistics, CUSUM change-point detection,
    cross-sensor Pearson divergence. Returns per-sensor slopes, change points, and trend classification.
    unit_id must be between 1 and 100."""
    return sensor_trend_analysis(unit_id)


@tool
def fleet_summary_tool(top_n: int = 5) -> dict:
    """Get fleet-wide health summary across all 100 engines.
    Returns total counts by health category and a priority list of the worst units."""
    return fleet_summary(top_n=top_n)


@tool
def graph_context_lookup_tool(unit_id: int, query_type: str) -> dict:
    """Query the Neo4j knowledge graph.
    query_type must be one of: failure_modes, related_units, sensor_context, maintenance_history, asset_hierarchy.
    unit_id must be between 1 and 100."""
    return graph_context_lookup(unit_id, query_type)


GENERAL_TOOLS = [
    anomaly_check_tool,
    rul_estimate_tool,
    sensor_trend_analysis_tool,
    fleet_summary_tool,
    graph_context_lookup_tool,
]

GENERAL_SYSTEM_PROMPT = """\
You are a senior maintenance engineer assistant for a turbofan engine fleet monitoring system.
The user has asked a question that doesn't fit the standard diagnostic or maintenance workflows.

You have access to tools for querying engine data. Use them when the question requires specific data.
If the question can be answered from your domain knowledge alone (methodology, sensor physics,
system capabilities, general turbofan engineering), answer directly WITHOUT calling any tools.
If the question asks about something the system cannot do, explain what IS possible and suggest
an alternative approach.

The system monitors 100 NASA C-MAPSS turbofan engines with 21 sensors each, using Isolation Forest
anomaly detection, piecewise linear RUL estimation, CUSUM trend analysis, and a Neo4j knowledge graph
for failure mode matching and similar unit analysis."""


def general_assistant_node(state: dict) -> dict:
    """Handle general questions with LLM-driven tool selection via native tool_use."""
    user_query = ""
    for msg in reversed(state.get("messages", [])):
        if msg.type == "human":
            user_query = msg.content
            break

    llm = ChatAnthropic(model=AGENT_MODEL, max_tokens=1024)
    llm_with_tools = llm.bind_tools(GENERAL_TOOLS, tool_choice="auto")

    tool_results = []
    graph_results = []
    tool_calls_made = []

    try:
        response = llm_with_tools.invoke([
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {"role": "human", "content": user_query},
        ])

        if response.tool_calls:
            for tc in response.tool_calls:
                tool_name = tc["name"]
                tool_args = tc["args"]
                tool_calls_made.append({"name": tool_name, "args": tool_args})

                display_name = tool_name.replace("_tool", "")

                try:
                    tool_fn = next(t for t in GENERAL_TOOLS if t.name == tool_name)
                    result = tool_fn.invoke(tool_args)
                    tool_results.append({"tool": display_name, "result": result})

                    if "graph" in tool_name:
                        graph_results.append(result)
                except Exception as e:
                    logger.exception("General assistant tool error: %s", tool_name)
                    tool_results.append({"tool": display_name, "error": str(e)})
        else:
            tool_results.append({
                "tool": "direct_knowledge_response",
                "result": {"response": response.content},
            })

    except Exception:
        logger.exception("General assistant failed")
        tool_results.append({
            "tool": "direct_knowledge_response",
            "result": {"response": "I wasn't able to process that question. Please try rephrasing."},
        })

    return {
        "tool_results": tool_results,
        "graph_context": graph_results,
        "general_tool_calls": tool_calls_made,
    }
