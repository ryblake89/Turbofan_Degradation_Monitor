"""Health check endpoint."""

from fastapi import APIRouter
from sqlalchemy import text

from src.api.schemas import HealthResponse
from src.data.database import engine

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """API liveness + database connectivity check."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "unreachable"

    status = "healthy" if db_status == "connected" else "degraded"
    return HealthResponse(status=status, database=db_status)
