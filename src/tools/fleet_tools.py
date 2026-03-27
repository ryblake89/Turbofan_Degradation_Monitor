"""Fleet-level tool functions — aggregate health across all units.

Performance: uses batch SQL (one query for all units) and skips
per-feature importance computation to keep fleet_summary under ~2s
for 100 units.
"""

import logging

import pandas as pd
from sqlalchemy import text

from src.config import INFORMATIVE_SENSORS, KEY_SENSORS
from src.data.database import engine
from src.models.anomaly_detector import score_window
from src.models.health_index import compute_health_index, health_label
from src.models.rul_estimator import estimate_rul

logger = logging.getLogger(__name__)

# Default anomaly window for fleet scoring
_FLEET_WINDOW = 30


def _batch_fetch_latest_windows(window_size: int = _FLEET_WINDOW) -> dict[int, pd.DataFrame]:
    """Fetch the latest window_size cycles per unit in a single SQL query.

    Uses ROW_NUMBER() window function to pull only the most recent rows
    per unit, then groups by unit_id in pandas.
    """
    query = text("""
        SELECT * FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY cycle DESC) AS rn
            FROM sensor_readings
            WHERE dataset = 'FD001'
        ) sub
        WHERE rn <= :window
        ORDER BY unit_id, cycle
    """)
    df = pd.read_sql(query, engine, params={"window": window_size})

    if "rn" in df.columns:
        df = df.drop(columns=["rn"])

    return {uid: group.reset_index(drop=True) for uid, group in df.groupby("unit_id")}


def _batch_fetch_full_history() -> dict[int, pd.DataFrame]:
    """Fetch full history for all units in a single query."""
    query = text("""
        SELECT * FROM sensor_readings
        WHERE dataset = 'FD001'
        ORDER BY unit_id, cycle
    """)
    df = pd.read_sql(query, engine)
    return {uid: group.reset_index(drop=True) for uid, group in df.groupby("unit_id")}


def fleet_summary(top_n: int = 10) -> dict:
    """Aggregate health status across all units.

    Returns a prioritized fleet health overview with the top_n units
    most in need of attention.

    Performance: batch-queries all data in two SQL calls, uses
    skip_feature_importance=True for anomaly scoring (~10x faster).
    """
    # Batch fetch data
    windows = _batch_fetch_latest_windows(_FLEET_WINDOW)
    histories = _batch_fetch_full_history()

    unit_results = []

    for unit_id in sorted(windows.keys()):
        window_df = windows[unit_id]
        history_df = histories.get(unit_id)

        if history_df is None or history_df.empty:
            continue

        try:
            anomaly_result = score_window(window_df, skip_feature_importance=True)
            rul_result = estimate_rul(history_df)
            health = compute_health_index(anomaly_result, rul_result)
            label = health_label(health)

            unit_results.append({
                "unit_id": unit_id,
                "health_index": round(health, 1),
                "health_label": label,
                "estimated_rul": rul_result["estimated_rul"],
                "degradation_stage": rul_result["degradation_stage"],
                "anomaly_normalized": round(anomaly_result["normalized_score"], 1),
                "is_anomalous": anomaly_result["is_anomalous"],
                "current_cycle": int(history_df["cycle"].iloc[-1]),
            })
        except Exception:
            logger.exception("Failed to score unit %d", unit_id)
            continue

    # Sort by health index ascending (worst health first)
    unit_results.sort(key=lambda x: x["health_index"])

    # Categorize
    critical = [u for u in unit_results if u["health_label"] in ("critical", "near_failure")]
    degrading = [u for u in unit_results if u["health_label"] == "degrading"]
    healthy = [u for u in unit_results if u["health_label"] == "healthy"]

    avg_health = (
        sum(u["health_index"] for u in unit_results) / len(unit_results)
        if unit_results
        else 0.0
    )

    return {
        "total_units": len(unit_results),
        "units_critical": len(critical),
        "units_degrading": len(degrading),
        "units_healthy": len(healthy),
        "priority_list": unit_results[:top_n],
        "fleet_health_avg": round(avg_health, 1),
    }
