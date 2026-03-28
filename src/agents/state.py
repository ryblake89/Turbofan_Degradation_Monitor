"""AgentState — LangGraph state schema for the multi-agent system."""

from typing import Annotated, Optional, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """LangGraph state shared across all agent nodes.

    Fields:
        messages: Conversation history (auto-accumulated via add_messages).
        current_intent: Classified intent (status_check, anomaly_investigation,
            maintenance_request, fleet_overview).
        active_agent: Which sub-agent is handling this turn (diagnostic, ops_planning).
        current_unit_id: Engine unit ID extracted from user message (None for fleet queries).
        tool_results: Accumulated tool outputs from diagnostic/ops_planning nodes.
        pending_action: Maintenance proposal awaiting HITL approval (None if no action pending).
        requires_approval: Whether the current flow is paused at the approval gate.
        decision_trace: Trace metadata (trace_id after logging, approval status during HITL).
        retrieved_playbooks: Similar past cases from pgvector playbook retrieval.
    """

    # Conversation
    messages: Annotated[list[BaseMessage], add_messages]
    current_intent: str
    active_agent: str

    # Equipment context
    current_unit_id: Optional[int]
    tool_results: list[dict]

    # Action workflow
    pending_action: Optional[dict]
    requires_approval: bool

    # Memory
    decision_trace: dict
    retrieved_playbooks: list[dict]
