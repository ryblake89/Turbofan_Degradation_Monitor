"""Supervisor node — intent classification and agent routing."""

import logging
from typing import Literal, Optional

from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field

from src.config import AGENT_MODEL

logger = logging.getLogger(__name__)

SUPERVISOR_SYSTEM_PROMPT = """\
You are a router for an industrial turbofan engine monitoring system.
Classify the user's intent into exactly one category and extract any engine unit ID mentioned.

Intent categories:
- status_check: User asks about the health or status of a specific engine unit.
- anomaly_investigation: User asks about anomalies, unusual behavior, or sensor readings for a unit.
- maintenance_request: User wants to schedule, plan, or request maintenance for a unit.
- fleet_overview: User asks about overall fleet health, fleet status, or which units need attention.

If the user mentions a unit number (e.g. "unit 14", "engine 7", "#3"), extract it as unit_id.
If no specific unit is mentioned, set unit_id to null."""


class RouterOutput(BaseModel):
    """Structured output for intent classification."""
    intent: Literal[
        "status_check",
        "anomaly_investigation",
        "maintenance_request",
        "fleet_overview",
    ]
    unit_id: Optional[int] = Field(default=None, description="Engine unit ID if mentioned")
    reasoning: str = Field(description="Brief explanation of classification")


def supervisor_node(state: dict) -> dict:
    """Classify user intent and route to the appropriate sub-agent."""
    llm = ChatAnthropic(model=AGENT_MODEL, max_tokens=256)
    structured_llm = llm.with_structured_output(RouterOutput)

    messages = state["messages"]
    user_message = messages[-1].content if messages else ""

    try:
        result = structured_llm.invoke([
            {"role": "system", "content": SUPERVISOR_SYSTEM_PROMPT},
            {"role": "human", "content": user_message},
        ])
        intent = result.intent
        unit_id = result.unit_id
    except Exception:
        logger.exception("Supervisor LLM call failed — falling back")
        # Extract unit_id from message heuristically
        unit_id = None
        for word in user_message.split():
            try:
                unit_id = int(word)
                break
            except ValueError:
                continue
        intent = "fleet_overview" if unit_id is None else "status_check"

    # Determine which agent handles this intent
    if intent == "fleet_overview":
        active_agent = "ops_planning"
    else:
        active_agent = "diagnostic"

    logger.info(
        "Supervisor: intent=%s, unit_id=%s, agent=%s",
        intent, unit_id, active_agent,
    )

    return {
        "current_intent": intent,
        "current_unit_id": unit_id,
        "active_agent": active_agent,
        "tool_results": [],
        "requires_approval": False,
        "pending_action": None,
        "retrieved_playbooks": [],
        "decision_trace": {},
    }
