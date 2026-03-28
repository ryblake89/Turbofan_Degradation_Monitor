"""Approval gate and action executor nodes — HITL maintenance approval flow."""

import logging

from langchain_core.messages import AIMessage
from langgraph.types import interrupt

from src.tools.maintenance_tools import approve_maintenance, reject_maintenance

logger = logging.getLogger(__name__)


def _format_proposal(action: dict) -> str:
    """Format a maintenance proposal for human review."""
    lines = [
        "**Maintenance Proposal — Approval Required**",
        f"- **Unit:** TURBOFAN-{action.get('unit_id', '?'):03d}",
        f"- **Action:** {action.get('proposed_action', 'unknown')}",
        f"- **Urgency:** {action.get('urgency', 'unknown')}",
        f"- **Window:** {action.get('proposed_window', 'unknown')}",
        f"- **Evidence:** {action.get('evidence_summary', 'N/A')}",
        f"- **Work Order:** {action.get('cmms_work_order_draft', {}).get('work_order_id', 'N/A')}",
        "",
        "Do you approve this maintenance action? (yes/no)",
    ]
    return "\n".join(lines)


def approval_gate_node(state: dict) -> dict:
    """Pause the graph for human approval of a maintenance proposal.

    Uses LangGraph's interrupt() to pause execution. The caller resumes
    the graph with a Command(resume=<value>) containing the approval decision.
    """
    pending = state.get("pending_action")
    if not pending:
        return {}

    proposal_text = _format_proposal(pending)

    # Interrupt and wait for human decision.
    # The value passed to interrupt() is surfaced to the caller.
    # When the caller resumes, the return value of interrupt() is the
    # human's response (e.g. "yes" or "no").
    human_decision = interrupt(proposal_text)

    # Parse the decision
    decision_str = str(human_decision).strip().lower()
    approved = decision_str in ("yes", "y", "approve", "approved", "true", "1")

    logger.info("Approval gate: decision=%s, approved=%s", human_decision, approved)

    if approved:
        return {
            "messages": [AIMessage(content=f"Maintenance approved. Executing action...")],
            "decision_trace": {"approval": "approved"},
        }
    else:
        # Update the maintenance_log row to 'rejected' so it doesn't stay 'pending'
        log_id = pending.get("log_id")
        if log_id:
            reject_maintenance(log_id)
        return {
            "messages": [AIMessage(content="Maintenance rejected by operator.")],
            "pending_action": None,
            "requires_approval": False,
            "decision_trace": {"approval": "rejected"},
        }


def action_executor_node(state: dict) -> dict:
    """Execute an approved maintenance action.

    Only reached when approval_gate routes here (approval == "approved").
    Rejections route to response_generator instead, so this node always approves.
    """
    pending = state.get("pending_action")
    if not pending:
        return {"messages": [AIMessage(content="No pending action to execute.")]}

    log_id = pending.get("log_id")
    if log_id is None:
        return {"messages": [AIMessage(content="Cannot execute: maintenance proposal missing log ID.")]}

    result = approve_maintenance(log_id)
    msg = (
        f"Maintenance approved and recorded. "
        f"Work order for unit {result['unit_id']} ({result['action_type']}) "
        f"is now active."
    )

    logger.info("Action executor: log_id=%d, status=%s", log_id, result["status"])

    return {
        "messages": [AIMessage(content=msg)],
        "pending_action": None,
        "requires_approval": False,
    }
