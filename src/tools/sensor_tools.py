"""Sensor tool functions — bridge between LangGraph agents and ML models.

Each tool accepts simple arguments (unit_id, window_size, etc.), queries
the database, calls the appropriate model function, and returns a
JSON-serializable dict.
"""

import json
import logging
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import text

from src.config import ALL_SENSORS, INFORMATIVE_SENSORS, KEY_SENSORS, OP_SETTINGS
from src.data.database import engine
from src.models.anomaly_detector import score_window
from src.models.health_index import compute_health_index
from src.models.rul_estimator import estimate_rul
from src.models.trend_analyzer import analyze_trends

logger = logging.getLogger(__name__)


def _fetch_recent_readings(unit_id: int, n_cycles: int | None = None) -> pd.DataFrame:
    """Fetch sensor readings for a unit, ordered by cycle.

    Args:
        unit_id: Engine unit identifier.
        n_cycles: If provided, return only the most recent n_cycles.
                  If None, return the full history.

    Returns:
        DataFrame with cycle, op_settings, and sensor columns.
    """
    if n_cycles is not None:
        query = text("""
            SELECT * FROM sensor_readings
            WHERE unit_id = :uid AND dataset = 'FD001'
            ORDER BY cycle DESC
            LIMIT :limit
        """)
        df = pd.read_sql(query, engine, params={"uid": unit_id, "limit": n_cycles})
        df = df.sort_values("cycle").reset_index(drop=True)
    else:
        query = text("""
            SELECT * FROM sensor_readings
            WHERE unit_id = :uid AND dataset = 'FD001'
            ORDER BY cycle
        """)
        df = pd.read_sql(query, engine, params={"uid": unit_id})

    return df


def _validate_unit(df: pd.DataFrame, unit_id: int) -> None:
    """Raise ValueError if the query returned no data."""
    if df.empty:
        raise ValueError(
            f"No sensor readings found for unit_id={unit_id}. "
            "Valid unit_ids for FD001 are 1-100."
        )


# ---------------------------------------------------------------------------
# Tool 1: Sensor History Lookup
# ---------------------------------------------------------------------------

def sensor_history_lookup(unit_id: int, n_cycles: int = 50) -> dict:
    """Return the most recent n_cycles of sensor data for the given unit.

    Returns a structured dict with cycles, readings, op_settings, and
    total_cycles for the unit.
    """
    # Get total cycle count first (cheap query)
    total_q = text("""
        SELECT MAX(cycle) as max_cycle FROM sensor_readings
        WHERE unit_id = :uid AND dataset = 'FD001'
    """)
    with engine.connect() as conn:
        result = conn.execute(total_q, {"uid": unit_id}).fetchone()
    total_cycles = result[0] if result and result[0] is not None else 0

    if total_cycles == 0:
        raise ValueError(
            f"No sensor readings found for unit_id={unit_id}. "
            "Valid unit_ids for FD001 are 1-100."
        )

    df = _fetch_recent_readings(unit_id, n_cycles)

    # Build structured output
    readings = {}
    for sensor in ALL_SENSORS:
        if sensor in df.columns:
            readings[sensor] = df[sensor].tolist()

    op_settings = {}
    for setting in OP_SETTINGS:
        if setting in df.columns:
            op_settings[setting] = df[setting].tolist()

    return {
        "unit_id": unit_id,
        "cycles": df["cycle"].tolist(),
        "readings": readings,
        "op_settings": op_settings,
        "total_cycles": total_cycles,
    }


# ---------------------------------------------------------------------------
# Tool 2: Anomaly Check
# ---------------------------------------------------------------------------

def anomaly_check(unit_id: int, window_size: int = 30) -> dict:
    """Run Isolation Forest on the latest sensor window for a unit.

    Fetches the most recent window_size cycles, scores them, logs to
    anomaly_events if anomalous, and returns a structured result including
    window cycle range.
    """
    df = _fetch_recent_readings(unit_id, window_size)
    _validate_unit(df, unit_id)

    # Score the window
    result = score_window(df)

    # Add cycle context (not provided by score_window)
    window_start_cycle = int(df["cycle"].iloc[0])
    window_end_cycle = int(df["cycle"].iloc[-1])

    output = {
        "unit_id": unit_id,
        "is_anomalous": result["is_anomalous"],
        "anomaly_score": result["anomaly_score"],
        "normalized_score": result["normalized_score"],
        "top_contributing_sensors": result["top_contributing_sensors"],
        "window_start_cycle": window_start_cycle,
        "window_end_cycle": window_end_cycle,
    }

    # Log to anomaly_events if anomalous (audit trail)
    if result["is_anomalous"]:
        _log_anomaly_event(
            unit_id=unit_id,
            cycle=window_end_cycle,
            anomaly_score=result["anomaly_score"],
            normalized_score=result["normalized_score"],
            top_sensors=result["top_contributing_sensors"],
        )

    return output


def _log_anomaly_event(
    unit_id: int,
    cycle: int,
    anomaly_score: float,
    normalized_score: float,
    top_sensors: list[dict],
) -> None:
    """Insert an anomaly event into the anomaly_events table."""
    insert = text("""
        INSERT INTO anomaly_events (unit_id, cycle, anomaly_score, health_index, flagged_sensors)
        VALUES (:uid, :cycle, :score, :health, :sensors)
    """)
    flagged = [s["sensor"] for s in top_sensors] if top_sensors else []
    with engine.connect() as conn:
        conn.execute(insert, {
            "uid": unit_id,
            "cycle": cycle,
            "score": anomaly_score,
            "health": normalized_score,
            "sensors": json.dumps(flagged),
        })
        conn.commit()


# ---------------------------------------------------------------------------
# Tool 3: Sensor Trend Analysis
# ---------------------------------------------------------------------------

def sensor_trend_analysis(
    unit_id: int,
    window_size: int = 20,
    sensors: list[str] | None = None,
) -> dict:
    """Compute rolling stats, change points, and cross-sensor divergence.

    Fetches full history for the unit (trend analysis benefits from
    seeing the complete trajectory) and delegates to the trend analyzer.
    """
    df = _fetch_recent_readings(unit_id)  # full history
    _validate_unit(df, unit_id)

    result = analyze_trends(df, window_size=window_size, sensors=sensors)

    return {
        "unit_id": unit_id,
        "total_cycles": len(df),
        **result,
    }


# ---------------------------------------------------------------------------
# Tool 4: RUL Estimate
# ---------------------------------------------------------------------------

def rul_estimate(unit_id: int) -> dict:
    """Estimate remaining useful life for a unit.

    Fetches the full sensor history (RUL estimation needs the complete
    trajectory to detect knees and measure degradation progress).
    """
    df = _fetch_recent_readings(unit_id)  # full history
    _validate_unit(df, unit_id)

    result = estimate_rul(df)

    return {
        "unit_id": unit_id,
        "current_cycle": int(df["cycle"].iloc[-1]),
        **result,
    }
