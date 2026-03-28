"""Maintenance log endpoint — query maintenance_log table directly."""

import json

from fastapi import APIRouter, Query
from sqlalchemy import text

from src.api.schemas import MaintenanceLogEntry, MaintenanceLogResponse
from src.data.database import engine

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/log", response_model=MaintenanceLogResponse)
def get_maintenance_log(
    unit_id: int | None = Query(default=None, description="Filter by unit ID"),
    status: str | None = Query(default=None, description="Filter by status (pending, approved, rejected, completed)"),
    limit: int = Query(default=50, ge=1, le=500),
):
    """Return maintenance log entries, optionally filtered."""
    conditions = []
    params: dict = {"limit": limit}

    if unit_id is not None:
        conditions.append("unit_id = :uid")
        params["uid"] = unit_id
    if status is not None:
        conditions.append("status = :status")
        params["status"] = status

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = text(f"""
        SELECT id, unit_id, action_type, urgency, status,
               proposed_at, approved_by, approved_at,
               evidence, cmms_work_order_id, notes
        FROM maintenance_log
        {where}
        ORDER BY proposed_at DESC
        LIMIT :limit
    """)

    count_query = text(f"SELECT COUNT(*) FROM maintenance_log {where}")

    with engine.connect() as conn:
        rows = conn.execute(query, params).fetchall()
        total = conn.execute(count_query, {k: v for k, v in params.items() if k != "limit"}).fetchone()[0]

    entries = []
    for row in rows:
        evidence_raw = row[8]
        if isinstance(evidence_raw, str):
            try:
                evidence_raw = json.loads(evidence_raw)
            except (json.JSONDecodeError, TypeError):
                evidence_raw = None

        entries.append(MaintenanceLogEntry(
            id=row[0],
            unit_id=row[1],
            action_type=row[2],
            urgency=row[3],
            status=row[4],
            proposed_at=str(row[5]) if row[5] else None,
            approved_by=row[6],
            approved_at=str(row[7]) if row[7] else None,
            evidence=evidence_raw,
            cmms_work_order_id=row[9],
            notes=row[10],
        ))

    return MaintenanceLogResponse(entries=entries, total=total)
