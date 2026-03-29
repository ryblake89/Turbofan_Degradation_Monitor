"""Fleet summary endpoint — serves pre-computed cache from startup."""

from fastapi import APIRouter, Query, Request

from src.api.schemas import FleetSummaryResponse

router = APIRouter(prefix="/fleet", tags=["fleet"])


@router.get("/summary", response_model=FleetSummaryResponse)
def get_fleet_summary(request: Request, top_n: int = Query(default=10, ge=1, le=100)):
    """Return fleet-wide health overview from startup cache."""
    cached = request.app.state.fleet_cache
    result = {**cached, "priority_list": cached["priority_list"][:top_n]}
    return FleetSummaryResponse(**result)
