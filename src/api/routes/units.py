"""Unit status endpoint — direct tool access, no LLM."""

import logging

from fastapi import APIRouter, HTTPException

from src.api.schemas import UnitStatusResponse
from src.models.health_index import compute_health_index, health_label
from src.tools.sensor_tools import anomaly_check, rul_estimate, sensor_history_lookup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/units", tags=["units"])


@router.get("/{unit_id}/status", response_model=UnitStatusResponse)
def unit_status(unit_id: int):
    """Return health status for a single unit (no LLM call)."""
    try:
        anomaly = anomaly_check(unit_id)
        rul = rul_estimate(unit_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Unit status error for unit %d", unit_id)
        raise HTTPException(status_code=503, detail=f"Service error: {e}")

    health = compute_health_index(anomaly, rul)
    label = health_label(health)

    return UnitStatusResponse(
        unit_id=unit_id,
        health_index=round(health, 1),
        health_label=label,
        anomaly=anomaly,
        rul=rul,
    )


@router.get("/{unit_id}/sensors")
def unit_sensors(unit_id: int, n_cycles: int = 50):
    """Return sensor time series for a unit."""
    try:
        return sensor_history_lookup(unit_id, n_cycles)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Sensor history error for unit %d", unit_id)
        raise HTTPException(status_code=503, detail=f"Service error: {e}")
