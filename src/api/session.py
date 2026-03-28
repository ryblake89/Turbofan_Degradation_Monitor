"""Session management — maps API session IDs to LangGraph thread configs."""

import uuid


class SessionManager:
    """In-memory session tracker for the agent graph.

    Each session_id maps 1:1 to a LangGraph thread_id used by the
    MemorySaver checkpointer. The manager also tracks which sessions
    have a pending HITL approval so the /approve endpoint can validate.
    """

    def __init__(self):
        self._pending_approvals: set[str] = set()

    def get_or_create(self, session_id: str | None) -> str:
        """Return the session_id, generating one if not provided."""
        if session_id:
            return session_id
        return f"sess-{uuid.uuid4().hex[:12]}"

    def graph_config(self, session_id: str) -> dict:
        """Return the LangGraph config dict for a session."""
        return {"configurable": {"thread_id": session_id}}

    def mark_pending(self, session_id: str) -> None:
        """Mark a session as having a pending HITL approval."""
        self._pending_approvals.add(session_id)

    def clear_pending(self, session_id: str) -> None:
        """Clear the pending approval flag for a session."""
        self._pending_approvals.discard(session_id)

    def has_pending(self, session_id: str) -> bool:
        """Check whether a session has a pending approval."""
        return session_id in self._pending_approvals
