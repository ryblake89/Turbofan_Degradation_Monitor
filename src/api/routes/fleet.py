"""Fleet summary endpoint — direct tool access, no LLM."""

from fastapi import APIRouter, Query

from src.api.schemas import FleetSummaryResponse
from src.tools.fleet_tools import fleet_summary

router = APIRouter(prefix="/fleet", tags=["fleet"])


@router.get("/summary", response_model=FleetSummaryResponse)
def get_fleet_summary(top_n: int = Query(default=10, ge=1, le=100)):
    """Return fleet-wide health overview with priority list."""
    result = fleet_summary(top_n=top_n)
    return FleetSummaryResponse(**result)
