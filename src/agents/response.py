"""Response generator node — synthesizes natural language from tool results."""

import json
import logging

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage

from src.config import AGENT_MODEL

logger = logging.getLogger(__name__)

RESPONSE_SYSTEM_PROMPT = """\
You are a senior maintenance engineer assistant for a turbofan engine fleet.
Synthesize the tool results below into a clear, actionable response for a maintenance engineer.

Guidelines:
- Lead with the health assessment: health index, health label, anomaly score, estimated RUL.
- Mention specific sensors that are flagging (use sensor names like sensor_2, sensor_11).
- If trend data is available, describe the trend (stable, degrading, accelerating).
- If playbook matches exist, reference them ("Similar pattern seen on unit X, N cycles before failure").
- If maintenance was proposed, summarize the proposal details.
- For fleet overview, highlight the worst units and overall fleet health.
- Be concise. Use numbers. Skip filler.
- Do NOT make up data — only report what's in the tool results."""


def _format_tool_results(tool_results: list[dict]) -> str:
    """Format tool results as a readable context block for the LLM."""
    parts = []
    for tr in tool_results:
        tool_name = tr.get("tool", "unknown")
        result = tr.get("result", tr.get("error", {}))
        parts.append(f"[{tool_name}]\n{json.dumps(result, indent=2, default=str)}")
    return "\n\n".join(parts)


def _format_playbooks(playbooks: list[dict]) -> str:
    """Format retrieved playbooks for the LLM."""
    if not playbooks:
        return ""
    parts = ["[similar_past_cases]"]
    for pb in playbooks[:3]:  # Limit to top 3 for prompt size
        parts.append(
            f"- Unit {pb.get('unit_id')}: {pb.get('action_taken')} "
            f"(outcome: {pb.get('outcome')}, similarity: {pb.get('similarity', 0):.2f})"
        )
    return "\n".join(parts)


def response_generator_node(state: dict) -> dict:
    """Generate a natural language response from accumulated tool results."""
    tool_results = state.get("tool_results", [])
    playbooks = state.get("retrieved_playbooks", [])
    user_query = ""
    for msg in reversed(state.get("messages", [])):
        if msg.type == "human":
            user_query = msg.content
            break

    # Build context
    context_parts = [_format_tool_results(tool_results)]
    playbook_text = _format_playbooks(playbooks)
    if playbook_text:
        context_parts.append(playbook_text)
    context = "\n\n".join(context_parts)

    llm = ChatAnthropic(model=AGENT_MODEL, max_tokens=1024)

    try:
        response = llm.invoke([
            {"role": "system", "content": RESPONSE_SYSTEM_PROMPT},
            {"role": "human", "content": f"User query: {user_query}\n\nTool results:\n{context}"},
        ])
        response_text = response.content
    except Exception:
        logger.exception("Response generator LLM call failed — returning raw results")
        response_text = (
            "I encountered an error generating a response. "
            f"Here are the raw tool results:\n\n{context}"
        )

    logger.info("Response generator: produced %d chars", len(response_text))

    return {
        "messages": [AIMessage(content=response_text)],
    }
