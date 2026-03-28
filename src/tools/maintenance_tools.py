"""Maintenance tool functions — propose, approve, and reject maintenance actions.

maintenance_scheduler creates a PROPOSAL row (status='pending') in
maintenance_log. It does NOT execute anything. Separate approve/reject
functions update the row's status.
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import text

from src.data.database import engine

logger = logging.getLogger(__name__)

# Urgency → proposed window mapping
_URGENCY_WINDOWS = {
    "immediate": "within 1 cycle",
    "soon": "within 5 cycles",
    "routine": "within 20 cycles",
}

_VALID_ACTION_TYPES = {"inspect", "service", "replace"}
_VALID_URGENCIES = {"routine", "soon", "immediate"}


def maintenance_scheduler(
    unit_id: int,
    action_type: str,
    urgency: str,
    evidence: dict,
) -> dict:
    """Propose a maintenance action with human-in-the-loop approval.

    Inserts a row into maintenance_log with status='pending'. The agent
    presents this proposal to the user; approval/rejection is handled by
    approve_maintenance() / reject_maintenance().

    Args:
        unit_id: Engine unit to schedule maintenance for.
        action_type: One of "inspect", "service", "replace".
        urgency: One of "routine", "soon", "immediate".
        evidence: Dict with anomaly scores, RUL, health index, etc.

    Returns:
        Dict with the proposal details and log_id for approval tracking.
    """
    if action_type not in _VALID_ACTION_TYPES:
        raise ValueError(
            f"Invalid action_type '{action_type}'. Must be one of {_VALID_ACTION_TYPES}"
        )
    if urgency not in _VALID_URGENCIES:
        raise ValueError(
            f"Invalid urgency '{urgency}'. Must be one of {_VALID_URGENCIES}"
        )

    proposed_window = _URGENCY_WINDOWS[urgency]
    work_order_id = f"WO-{uuid.uuid4().hex[:8].upper()}"

    # Build evidence summary for the agent to present
    evidence_summary = _build_evidence_summary(unit_id, evidence)

    # Mock CMMS work order draft
    cmms_draft = {
        "work_order_id": work_order_id,
        "equipment_id": f"TURBOFAN-{unit_id:03d}",
        "action": action_type,
        "priority": urgency,
        "proposed_window": proposed_window,
        "description": evidence_summary,
    }

    # Insert proposal into maintenance_log
    insert = text("""
        INSERT INTO maintenance_log
            (unit_id, action_type, urgency, status, evidence, cmms_work_order_id, notes)
        VALUES
            (:uid, :action, :urgency, 'pending', :evidence, :wo_id, :notes)
        RETURNING id
    """)
    with engine.connect() as conn:
        result = conn.execute(insert, {
            "uid": unit_id,
            "action": action_type,
            "urgency": urgency,
            "evidence": json.dumps(evidence),
            "wo_id": work_order_id,
            "notes": evidence_summary,
        })
        log_id = result.fetchone()[0]
        conn.commit()

    logger.info(
        "Maintenance proposal created: log_id=%d, unit=%d, action=%s, urgency=%s",
        log_id, unit_id, action_type, urgency,
    )

    return {
        "log_id": log_id,
        "unit_id": unit_id,
        "proposed_action": action_type,
        "urgency": urgency,
        "proposed_window": proposed_window,
        "evidence_summary": evidence_summary,
        "requires_approval": True,
        "cmms_work_order_draft": cmms_draft,
    }


def approve_maintenance(log_id: int, approved_by: str = "operator") -> dict:
    """Approve a pending maintenance proposal.

    Updates the maintenance_log row to status='approved' and records
    who approved it and when.

    Args:
        log_id: ID of the maintenance_log row (from maintenance_scheduler).
        approved_by: Identifier of the approver (default "operator").

    Returns:
        Dict with log_id, unit_id, action_type, urgency, status, updated_by, updated_at.

    Raises:
        ValueError: If no pending entry exists for the given log_id.
    """
    return _update_maintenance_status(log_id, "approved", approved_by)


def reject_maintenance(log_id: int, approved_by: str = "operator") -> dict:
    """Reject a pending maintenance proposal.

    Updates the maintenance_log row to status='rejected'.

    Args:
        log_id: ID of the maintenance_log row (from maintenance_scheduler).
        approved_by: Identifier of the rejector (default "operator").

    Returns:
        Dict with log_id, unit_id, action_type, urgency, status, updated_by, updated_at.

    Raises:
        ValueError: If no pending entry exists for the given log_id.
    """
    return _update_maintenance_status(log_id, "rejected", approved_by)


def _update_maintenance_status(
    log_id: int, new_status: str, approved_by: str
) -> dict:
    """Update a maintenance_log row's status."""
    now = datetime.now(timezone.utc)

    update = text("""
        UPDATE maintenance_log
        SET status = :status, approved_by = :approved_by, approved_at = :approved_at
        WHERE id = :lid AND status = 'pending'
        RETURNING id, unit_id, action_type, urgency, status
    """)
    with engine.connect() as conn:
        result = conn.execute(update, {
            "status": new_status,
            "approved_by": approved_by,
            "approved_at": now,
            "lid": log_id,
        })
        row = result.fetchone()
        conn.commit()

    if row is None:
        raise ValueError(
            f"No pending maintenance entry found with log_id={log_id}. "
            "It may have already been approved/rejected."
        )

    return {
        "log_id": row[0],
        "unit_id": row[1],
        "action_type": row[2],
        "urgency": row[3],
        "status": row[4],
        "updated_by": approved_by,
        "updated_at": now.isoformat(),
    }


def _build_evidence_summary(unit_id: int, evidence: dict) -> str:
    """Build a human-readable evidence summary from the evidence dict."""
    parts = [f"Unit {unit_id}:"]

    if "health_index" in evidence:
        parts.append(f"Health index {evidence['health_index']:.0f}/100.")
    if "anomaly_score" in evidence:
        parts.append(f"Anomaly score {evidence['anomaly_score']:.2f}.")
    if "normalized_score" in evidence:
        parts.append(f"Normalized anomaly {evidence['normalized_score']:.0f}/100.")
    if "estimated_rul" in evidence:
        parts.append(f"Estimated RUL {evidence['estimated_rul']} cycles.")
    if "degradation_stage" in evidence:
        parts.append(f"Stage: {evidence['degradation_stage']}.")
    if "trend_summary" in evidence:
        parts.append(f"Trend: {evidence['trend_summary']}.")

    return " ".join(parts)
