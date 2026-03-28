"""Decision trace endpoints — view logged agent interactions."""

import json

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from src.api.schemas import TraceEntry, TracesResponse
from src.data.database import engine

router = APIRouter(prefix="/traces", tags=["traces"])


def _row_to_entry(row) -> TraceEntry:
    """Convert a database row to a TraceEntry."""
    tools_raw = row[5]
    if isinstance(tools_raw, str):
        try:
            tools_raw = json.loads(tools_raw)
        except (json.JSONDecodeError, TypeError):
            tools_raw = None

    ctx_raw = row[9]
    if isinstance(ctx_raw, str):
        try:
            ctx_raw = json.loads(ctx_raw)
        except (json.JSONDecodeError, TypeError):
            ctx_raw = None

    return TraceEntry(
        id=row[0],
        session_id=row[1],
        unit_id=row[2],
        query=row[3],
        intent=row[4],
        tools_called=tools_raw,
        recommendation=row[6],
        action_taken=row[7],
        outcome=row[8],
        sensor_context=ctx_raw,
        created_at=str(row[10]) if row[10] else None,
    )


_TRACE_COLUMNS = """
    id, session_id, unit_id, query, intent, tools_called,
    recommendation, action_taken, outcome, sensor_context, created_at
"""


@router.get("", response_model=TracesResponse)
def list_traces(
    unit_id: int | None = Query(default=None, description="Filter by unit ID"),
    intent: str | None = Query(default=None, description="Filter by intent"),
    limit: int = Query(default=20, ge=1, le=200),
):
    """Return recent decision traces, optionally filtered."""
    conditions = []
    params: dict = {"limit": limit}

    if unit_id is not None:
        conditions.append("unit_id = :uid")
        params["uid"] = unit_id
    if intent is not None:
        conditions.append("intent = :intent")
        params["intent"] = intent

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = text(f"""
        SELECT {_TRACE_COLUMNS}
        FROM decision_traces
        {where}
        ORDER BY created_at DESC
        LIMIT :limit
    """)

    count_query = text(f"SELECT COUNT(*) FROM decision_traces {where}")

    with engine.connect() as conn:
        rows = conn.execute(query, params).fetchall()
        total = conn.execute(count_query, {k: v for k, v in params.items() if k != "limit"}).fetchone()[0]

    return TracesResponse(
        traces=[_row_to_entry(row) for row in rows],
        total=total,
    )


@router.get("/{trace_id}", response_model=TraceEntry)
def get_trace(trace_id: int):
    """Return a single decision trace by ID."""
    query = text(f"""
        SELECT {_TRACE_COLUMNS}
        FROM decision_traces
        WHERE id = :tid
    """)

    with engine.connect() as conn:
        row = conn.execute(query, {"tid": trace_id}).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Trace {trace_id} not found.")

    return _row_to_entry(row)
