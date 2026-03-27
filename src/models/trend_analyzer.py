"""Sensor trend analysis: rolling statistics, change-point detection, cross-sensor divergence.

NO FFT — C-MAPSS is cycle-level data, not high-frequency. This is intentional.
Uses rolling stats, CUSUM change-point detection, and pairwise Pearson correlation
tracking compared to healthy baselines.
"""

import logging

import numpy as np
import pandas as pd

from src.config import (
    DEFAULT_WINDOW_SIZE,
    HEALTHY_FRACTION,
    KEY_SENSORS,
)

logger = logging.getLogger(__name__)

# Sensor pairs known to diverge during degradation (from EDA)
DIVERGENCE_PAIRS = [
    ("sensor_11", "sensor_12"),  # HPC pressure & fuel flow ratio
    ("sensor_4", "sensor_11"),   # HPC outlet temp & pressure
    ("sensor_7", "sensor_12"),   # LPT outlet temp & fuel flow
    ("sensor_2", "sensor_3"),    # Fan inlet & LPC outlet temp
    ("sensor_4", "sensor_15"),   # HPC outlet temp & bypass ratio
]


def compute_rolling_features(
    values: np.ndarray,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> dict:
    """Compute rolling statistics for a single sensor's time series.

    Returns dict with mean, std, slope, and rate_of_change for the
    most recent window.
    """
    series = pd.Series(values)

    rolling_mean = series.rolling(window=window_size, min_periods=1).mean()
    rolling_std = series.rolling(window=window_size, min_periods=1).std()

    # Current window stats
    recent = values[-window_size:] if len(values) >= window_size else values
    x = np.arange(len(recent))

    if len(recent) >= 2:
        slope, intercept = np.polyfit(x, recent, 1)
    else:
        slope = 0.0

    # Rate of change: slope normalized by mean (% change per cycle)
    mean_val = float(rolling_mean.iloc[-1])
    rate_of_change = slope / abs(mean_val) if abs(mean_val) > 1e-10 else 0.0

    return {
        "mean": float(rolling_mean.iloc[-1]),
        "std": float(rolling_std.iloc[-1]) if not np.isnan(rolling_std.iloc[-1]) else 0.0,
        "slope": float(slope),
        "rate_of_change": float(rate_of_change),
    }


def detect_change_points(
    values: np.ndarray,
    threshold: float = 15.0,
    min_separation: int = 20,
) -> list[dict]:
    """Detect change points using CUSUM (cumulative sum control chart).

    Identifies where the mean shifts significantly, signaling transition
    from stable to degrading behavior. Threshold=15 and min_separation=20
    are tuned to fire on genuine degradation shifts, not sensor noise.
    """
    if len(values) < 10:
        return []

    # Use the first 30% as the reference mean
    ref_end = max(5, int(len(values) * HEALTHY_FRACTION))
    ref_mean = np.mean(values[:ref_end])
    ref_std = np.std(values[:ref_end])

    if ref_std < 1e-10:
        ref_std = 1.0  # avoid division by zero for near-constant sensors

    # CUSUM: accumulate deviations from reference mean
    cusum_pos = np.zeros(len(values))
    cusum_neg = np.zeros(len(values))
    change_points = []

    for i in range(1, len(values)):
        normalized = (values[i] - ref_mean) / ref_std
        cusum_pos[i] = max(0, cusum_pos[i - 1] + normalized - 0.5)
        cusum_neg[i] = max(0, cusum_neg[i - 1] - normalized - 0.5)

        # Detect upward shift
        if cusum_pos[i] > threshold and (not change_points or i - change_points[-1]["cycle_index"] > min_separation):
            change_points.append({
                "cycle_index": i,
                "direction": "increasing",
                "magnitude": float(cusum_pos[i]),
            })
            cusum_pos[i] = 0  # reset after detection

        # Detect downward shift
        if cusum_neg[i] > threshold and (not change_points or i - change_points[-1]["cycle_index"] > min_separation):
            change_points.append({
                "cycle_index": i,
                "direction": "decreasing",
                "magnitude": float(cusum_neg[i]),
            })
            cusum_neg[i] = 0

    return change_points


def compute_cross_sensor_divergence(
    readings: pd.DataFrame,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> dict[str, float]:
    """Track pairwise Pearson correlation compared to healthy baseline.

    Computes correlation between sensor pairs in the recent window and
    compares to the healthy baseline (first 30% of the data). A large
    absolute difference signals emerging faults.
    """
    n = len(readings)
    healthy_end = max(10, int(n * HEALTHY_FRACTION))
    healthy_data = readings.iloc[:healthy_end]
    recent_data = readings.iloc[-window_size:] if n >= window_size else readings

    divergences = {}
    for s1, s2 in DIVERGENCE_PAIRS:
        if s1 not in readings.columns or s2 not in readings.columns:
            continue

        # Healthy baseline correlation
        if len(healthy_data) >= 5:
            healthy_corr = healthy_data[s1].corr(healthy_data[s2])
        else:
            healthy_corr = 0.0

        # Recent correlation
        if len(recent_data) >= 5:
            recent_corr = recent_data[s1].corr(recent_data[s2])
        else:
            recent_corr = 0.0

        # Handle NaN
        if np.isnan(healthy_corr):
            healthy_corr = 0.0
        if np.isnan(recent_corr):
            recent_corr = 0.0

        pair_key = f"{s1}/{s2}"
        divergences[pair_key] = float(abs(recent_corr - healthy_corr))

    return divergences


def classify_trend(
    rolling_features: dict[str, dict],
    change_points: dict[str, list],
    divergence_scores: dict[str, float],
) -> str:
    """Classify overall trend as stable, gradual_degradation, or accelerating.

    Heuristic based on:
    - Number of sensors with significant slopes
    - Number of detected change points
    - Magnitude of cross-sensor divergence
    """
    # Count sensors with notable degradation slope
    degrading_count = 0
    for sensor, features in rolling_features.items():
        if abs(features["rate_of_change"]) > 0.002:  # > 0.2% per cycle
            degrading_count += 1

    # Total change points across all sensors
    total_cps = sum(len(cps) for cps in change_points.values())

    # Mean divergence score
    mean_divergence = np.mean(list(divergence_scores.values())) if divergence_scores else 0.0

    if degrading_count >= 4 or mean_divergence > 0.4:
        return "accelerating"
    elif degrading_count >= 2 or total_cps >= 5 or mean_divergence > 0.2:
        return "gradual_degradation"
    else:
        return "stable"


def analyze_trends(
    readings: pd.DataFrame,
    window_size: int = DEFAULT_WINDOW_SIZE,
    sensors: list[str] | None = None,
) -> dict:
    """Full trend analysis for a unit's sensor history.

    Args:
        readings: DataFrame with sensor columns and cycle ordering.
        window_size: Rolling window size for stats.
        sensors: Sensors to analyze (defaults to KEY_SENSORS).

    Returns:
        Dict with rolling_features, change_points, cross_sensor_divergence,
        trend_summary, and window_size.
    """
    if sensors is None:
        sensors = KEY_SENSORS

    rolling_features = {}
    change_points_by_sensor = {}

    for sensor in sensors:
        if sensor not in readings.columns:
            continue
        values = readings[sensor].values
        rolling_features[sensor] = compute_rolling_features(values, window_size)

        cps = detect_change_points(values)
        if cps:
            change_points_by_sensor[sensor] = cps

    divergence_scores = compute_cross_sensor_divergence(readings, window_size)

    trend_summary = classify_trend(
        rolling_features, change_points_by_sensor, divergence_scores
    )

    # Flatten change points to a list with sensor names
    all_change_points = []
    for sensor, cps in change_points_by_sensor.items():
        for cp in cps:
            all_change_points.append({"sensor": sensor, **cp})
    all_change_points.sort(key=lambda x: x["cycle_index"])

    return {
        "rolling_features": rolling_features,
        "change_points": all_change_points,
        "cross_sensor_divergence": divergence_scores,
        "trend_summary": trend_summary,
        "window_size": window_size,
    }
