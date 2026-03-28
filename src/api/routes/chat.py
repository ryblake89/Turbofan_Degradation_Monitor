"""Chat endpoints — main conversation and HITL approval."""

import logging

from fastapi import APIRouter, HTTPException, Request
from langchain_core.messages import HumanMessage
from langgraph.types import Command

from src.api.schemas import ApprovalRequest, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


def _extract_response_text(state: dict) -> str:
    """Pull the last AI message content from graph state."""
    for msg in reversed(state.get("messages", [])):
        if msg.type == "ai":
            return msg.content
    return ""


@router.post("/chat", response_model=ChatResponse)
def chat(request: Request, body: ChatRequest):
    """Send a message to the agent system and receive a response.

    If the agent proposes maintenance requiring approval, the response will
    have ``requires_approval=true`` and a ``pending_action`` dict. Use
    POST /chat/{session_id}/approve to resume.
    """
    graph = request.app.state.graph
    sessions = request.app.state.sessions

    session_id = sessions.get_or_create(body.session_id)

    if sessions.has_pending(session_id):
        raise HTTPException(
            status_code=409,
            detail="Session has a pending approval. Use POST /chat/{session_id}/approve to approve or reject.",
        )

    config = sessions.graph_config(session_id)

    try:
        result = graph.invoke(
            {"messages": [HumanMessage(content=body.message)]},
            config=config,
        )
    except Exception:
        logger.exception("Graph invocation failed for session %s", session_id)
        raise HTTPException(status_code=503, detail="Agent system error. Please try again.")

    # Detect HITL interrupt
    pending = result.get("pending_action")
    requires_approval = bool(pending) and result.get("requires_approval", False)

    if requires_approval:
        sessions.mark_pending(session_id)
    else:
        sessions.clear_pending(session_id)

    response_text = _extract_response_text(result)
    if not response_text and not requires_approval:
        response_text = "The system was unable to generate a response. Please try again."

    return ChatResponse(
        session_id=session_id,
        response=response_text,
        intent=result.get("current_intent", ""),
        unit_id=result.get("current_unit_id"),
        requires_approval=requires_approval,
        pending_action=pending,
        tool_results=result.get("tool_results", []),
        trace_id=result.get("decision_trace", {}).get("trace_id"),
    )


@router.post("/chat/{session_id}/approve", response_model=ChatResponse)
def approve(request: Request, session_id: str, body: ApprovalRequest):
    """Approve or reject a pending maintenance proposal.

    Resumes the paused LangGraph execution for the given session.
    """
    graph = request.app.state.graph
    sessions = request.app.state.sessions

    if not sessions.has_pending(session_id):
        raise HTTPException(
            status_code=409,
            detail=f"Session '{session_id}' has no pending approval.",
        )

    config = sessions.graph_config(session_id)
    resume_value = "yes" if body.approved else "no"

    try:
        result = graph.invoke(
            Command(resume=resume_value),
            config=config,
        )
    except Exception:
        logger.exception("Approval resume failed for session %s", session_id)
        raise HTTPException(status_code=503, detail="Agent system error during approval.")

    sessions.clear_pending(session_id)

    return ChatResponse(
        session_id=session_id,
        response=_extract_response_text(result),
        intent=result.get("current_intent", ""),
        unit_id=result.get("current_unit_id"),
        requires_approval=False,
        pending_action=None,
        tool_results=result.get("tool_results", []),
        trace_id=result.get("decision_trace", {}).get("trace_id"),
    )
