"""Piecewise linear RUL estimator.

Approach:
1. Fit degradation profiles from training data (per-sensor slopes in degrading phase)
2. For a new unit: detect the "knee point" where degradation begins
3. Fit a line from knee to current reading, extrapolate to failure threshold
4. Confidence intervals from cross-unit degradation rate variance (bootstrap)

This is intentionally NOT an LSTM — the agent architecture is the star,
not the predictive model. Piecewise linear is interpretable and sufficient.
"""

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src.config import (
    DATA_PROCESSED_DIR,
    EXPECTED_MEDIAN_LIFE,
    HEALTHY_FRACTION,
    KEY_SENSORS,
    MODELS_DIR,
)

logger = logging.getLogger(__name__)

PROFILE_PATH = MODELS_DIR / "degradation_profiles.joblib"

# Module-level cache
_cached_profiles: dict | None = None


def _load_training_data() -> pd.DataFrame:
    path = DATA_PROCESSED_DIR / "train_FD001.csv"
    if not path.exists():
        raise FileNotFoundError(f"Processed data not found: {path}")
    return pd.read_csv(path)


def _detect_knee_point(values: np.ndarray, min_segment: int = 15) -> int:
    """Find the knee point where a sensor transitions from stable to degrading.

    Uses a two-segment piecewise linear fit with stride optimization:
    tests breakpoints at every 5th index, then refines around the best.
    """
    n = len(values)
    if n < 2 * min_segment:
        return n // 3

    x = np.arange(n, dtype=np.float64)

    def _segment_error(bp: int) -> float:
        s1_x, s1_y = x[:bp], values[:bp]
        s2_x, s2_y = x[bp:], values[bp:]
        r1 = np.polyfit(s1_x, s1_y, 1)
        r2 = np.polyfit(s2_x, s2_y, 1)
        return (np.sum((np.polyval(r1, s1_x) - s1_y) ** 2)
                + np.sum((np.polyval(r2, s2_x) - s2_y) ** 2))

    # Coarse search: stride of 5
    stride = max(1, (n - 2 * min_segment) // 30)
    candidates = range(min_segment, n - min_segment, stride)
    best_bp = min_segment
    best_err = np.inf
    for bp in candidates:
        err = _segment_error(bp)
        if err < best_err:
            best_err = err
            best_bp = bp

    # Refine: search ±stride around best
    lo = max(min_segment, best_bp - stride)
    hi = min(n - min_segment, best_bp + stride)
    for bp in range(lo, hi + 1):
        err = _segment_error(bp)
        if err < best_err:
            best_err = err
            best_bp = bp

    return best_bp


def build_degradation_profiles(save: bool = True) -> dict:
    """Learn per-sensor degradation rates from training data.

    For each key sensor and each unit:
    - Smooth the trajectory (rolling mean, window=10)
    - Detect the knee point
    - Fit a linear slope from knee to end-of-life
    - Record the failure threshold (value at end-of-life)

    Returns dict with per-sensor stats: mean_slope, std_slope, mean_threshold, etc.
    """
    df = _load_training_data()
    profiles = {}

    for sensor in KEY_SENSORS:
        slopes = []
        thresholds = []
        knee_fractions = []

        healthy_baselines = []
        degradation_lengths = []  # cycles from knee to failure

        for unit_id, group in df.groupby("unit_id"):
            values = group[sensor].values
            smoothed = pd.Series(values).rolling(window=10, min_periods=1).mean().values
            knee = _detect_knee_point(smoothed)

            knee_fraction = knee / len(values)
            knee_fractions.append(knee_fraction)

            # Record healthy baseline (mean of first 30%)
            healthy_end = max(5, int(len(smoothed) * HEALTHY_FRACTION))
            healthy_baselines.append(float(np.mean(smoothed[:healthy_end])))

            # Fit slope from knee to end
            degrading = smoothed[knee:]
            if len(degrading) < 5:
                continue
            x = np.arange(len(degrading))
            slope, intercept = np.polyfit(x, degrading, 1)
            slopes.append(slope)
            thresholds.append(float(smoothed[-1]))  # value at failure
            degradation_lengths.append(len(degrading))

        profiles[sensor] = {
            "mean_slope": float(np.mean(slopes)),
            "std_slope": float(np.std(slopes)),
            "slopes": slopes,  # kept for bootstrap CI
            "mean_threshold": float(np.mean(thresholds)),
            "std_threshold": float(np.std(thresholds)),
            "mean_healthy_baseline": float(np.mean(healthy_baselines)),
            "mean_knee_fraction": float(np.mean(knee_fractions)),
            "mean_degradation_length": float(np.mean(degradation_lengths)),
            "degradation_lengths": degradation_lengths,
        }

    if save:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(profiles, PROFILE_PATH)
        logger.info("Saved degradation profiles to %s", PROFILE_PATH)

    # Invalidate cache so next call picks up new profiles
    global _cached_profiles
    _cached_profiles = None

    return profiles


def _load_profiles() -> dict:
    """Load degradation profiles. Cached after first load."""
    global _cached_profiles
    if _cached_profiles is not None:
        return _cached_profiles

    if not PROFILE_PATH.exists():
        raise FileNotFoundError(
            f"Profiles not found at {PROFILE_PATH}. Run build_degradation_profiles() first."
        )
    _cached_profiles = joblib.load(PROFILE_PATH)
    return _cached_profiles


def estimate_rul(readings: pd.DataFrame) -> dict:
    """Estimate RUL for a unit given its full sensor history.

    Args:
        readings: DataFrame with KEY_SENSORS columns and a 'cycle' column,
                  ordered by cycle. Should be the full history for one unit.

    Returns:
        Dict with estimated_rul, confidence_interval, degradation_stage,
        key_degrading_sensors, model_type.
    """
    profiles = _load_profiles()
    n_cycles = len(readings)

    sensor_ruls = []
    degrading_sensors = []
    knee_indices = {}  # cache for bootstrap CI

    for sensor in KEY_SENSORS:
        if sensor not in readings.columns:
            continue

        values = readings[sensor].values
        smoothed = pd.Series(values).rolling(window=10, min_periods=1).mean().values

        profile = profiles[sensor]
        knee = _detect_knee_point(smoothed)
        knee_indices[sensor] = knee

        # If knee is near the end, sensor hasn't started degrading
        if knee > n_cycles * 0.85:
            continue

        degrading_sensors.append(sensor)

        # --- Normalized degradation position approach ---
        # How far between healthy baseline and failure threshold is the current value?
        baseline = profile["mean_healthy_baseline"]
        threshold = profile["mean_threshold"]
        total_range = threshold - baseline

        if abs(total_range) < 1e-10:
            continue

        current_value = smoothed[-1]
        degradation_pct = (current_value - baseline) / total_range
        degradation_pct = np.clip(degradation_pct, 0.0, 1.0)

        mean_deg_length = profile["mean_degradation_length"]

        # Estimate RUL from population degradation length and how far
        # through the degradation range the sensor has moved.
        # This is more robust than using unit-specific knee timing.
        if degradation_pct > 0.10:
            remaining_frac = 1.0 - degradation_pct
            rul_estimate = max(0, int(mean_deg_length * remaining_frac))
            sensor_ruls.append(rul_estimate)
        elif degradation_pct > 0.03:
            # Early degradation — mostly population baseline
            remaining_frac = 1.0 - degradation_pct
            sensor_ruls.append(max(0, int(mean_deg_length * remaining_frac)))

    if not sensor_ruls:
        # No degradation detected — estimate from population baseline
        pop_rul = max(0, EXPECTED_MEDIAN_LIFE - n_cycles)
        return {
            "estimated_rul": pop_rul,
            "confidence_interval": (
                max(0, int(pop_rul * 0.5)),
                int(pop_rul * 1.5) + 30,
            ),
            "degradation_stage": "healthy",
            "key_degrading_sensors": [],
            "model_type": "piecewise_linear",
        }

    # Aggregate: use median of per-sensor RUL estimates (robust to outliers)
    median_rul = int(np.median(sensor_ruls))

    # Bootstrap confidence interval from cross-unit degradation length variance
    ci_lower, ci_upper = _bootstrap_ci(
        readings, profiles, degrading_sensors, knee_indices
    )

    # Classify degradation stage
    if median_rul > EXPECTED_MEDIAN_LIFE * 0.5:
        stage = "healthy"
    elif median_rul > EXPECTED_MEDIAN_LIFE * 0.15:
        stage = "degrading"
    else:
        stage = "critical"

    return {
        "estimated_rul": median_rul,
        "confidence_interval": (ci_lower, ci_upper),
        "degradation_stage": stage,
        "key_degrading_sensors": degrading_sensors,
        "model_type": "piecewise_linear",
    }


def _bootstrap_ci(
    readings: pd.DataFrame,
    profiles: dict,
    degrading_sensors: list[str],
    knee_indices: dict[str, int],
    n_bootstrap: int = 200,
    confidence: float = 0.90,
) -> tuple[int, int]:
    """Compute confidence interval via bootstrap from cross-unit degradation variance.

    Approach: for each bootstrap iteration, sample a degradation length from the
    training distribution for each sensor, compute the RUL that degradation length
    implies given the unit's current degradation_pct, and take the median across
    sensors. This directly mirrors the point estimate logic in estimate_rul().
    """
    rng = np.random.RandomState(42)

    # Pre-compute per-sensor degradation_pct (same logic as estimate_rul)
    sensor_info = {}
    for sensor in degrading_sensors:
        if sensor not in profiles:
            continue
        profile = profiles[sensor]
        deg_lengths = profile.get("degradation_lengths", [])
        if not deg_lengths:
            continue

        values = readings[sensor].values
        smoothed = pd.Series(values).rolling(window=10, min_periods=1).mean().values
        baseline = profile["mean_healthy_baseline"]
        threshold = profile["mean_threshold"]
        total_range = threshold - baseline
        if abs(total_range) < 1e-10:
            continue

        deg_pct = np.clip((smoothed[-1] - baseline) / total_range, 0.0, 1.0)
        if deg_pct < 0.03:
            continue

        sensor_info[sensor] = {
            "deg_pct": deg_pct,
            "deg_lengths": np.array(deg_lengths, dtype=float),
        }

    if not sensor_info:
        return (0, EXPECTED_MEDIAN_LIFE)

    bootstrap_ruls = []
    for _ in range(n_bootstrap):
        sensor_ruls = []
        for sensor, info in sensor_info.items():
            # Sample a total degradation length from training population
            sampled_total = float(rng.choice(info["deg_lengths"]))
            # RUL = remaining fraction * sampled total degradation length
            remaining = max(0.0, 1.0 - info["deg_pct"])
            rul = max(0, int(sampled_total * remaining))
            sensor_ruls.append(rul)
        if sensor_ruls:
            bootstrap_ruls.append(int(np.median(sensor_ruls)))

    if not bootstrap_ruls:
        return (0, EXPECTED_MEDIAN_LIFE)

    alpha = (1 - confidence) / 2
    lower = int(np.percentile(bootstrap_ruls, alpha * 100))
    upper = int(np.percentile(bootstrap_ruls, (1 - alpha) * 100))
    return (max(0, lower), upper)
