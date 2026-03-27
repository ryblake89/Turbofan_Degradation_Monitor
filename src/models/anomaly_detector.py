"""Isolation Forest anomaly detection trained on healthy engine baselines.

Training approach: fit on the first HEALTHY_FRACTION (30%) of each unit's life,
using the 14 informative sensors (excluding 7 near-constant sensors).

Inference: score a window of sensor readings against the healthy baseline model.
Feature importance is derived from mean isolation path lengths per feature.
"""

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from src.config import (
    DATA_PROCESSED_DIR,
    HEALTHY_FRACTION,
    IF_CONTAMINATION,
    INFORMATIVE_SENSORS,
    MODELS_DIR,
)

logger = logging.getLogger(__name__)

MODEL_PATH = MODELS_DIR / "isolation_forest.joblib"
SCALER_PATH = MODELS_DIR / "if_scaler.joblib"
CALIBRATION_PATH = MODELS_DIR / "if_calibration.joblib"

# Module-level cache — loaded once, reused across calls
_cached_model: IsolationForest | None = None
_cached_scaler: StandardScaler | None = None
_cached_calibration: dict | None = None


def _load_training_data() -> pd.DataFrame:
    """Load processed FD001 training CSV."""
    path = DATA_PROCESSED_DIR / "train_FD001.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"Processed training data not found at {path}. Run data ingestion first."
        )
    return pd.read_csv(path)


def _extract_healthy_data(df: pd.DataFrame) -> pd.DataFrame:
    """Extract the first HEALTHY_FRACTION of each unit's life as healthy data."""
    healthy_rows = []
    for unit_id, group in df.groupby("unit_id"):
        max_cycle = group["cycle"].max()
        cutoff = int(max_cycle * HEALTHY_FRACTION)
        healthy_rows.append(group[group["cycle"] <= cutoff])
    return pd.concat(healthy_rows, ignore_index=True)


def train_isolation_forest(
    contamination: float = IF_CONTAMINATION,
    random_state: int = 42,
    save: bool = True,
) -> dict:
    """Train an Isolation Forest on healthy engine baselines.

    Returns a dict with training metadata (n_samples, features, contamination).
    Saves the trained model and scaler to models/saved/.
    """
    df = _load_training_data()
    healthy_df = _extract_healthy_data(df)

    features = healthy_df[INFORMATIVE_SENSORS].values
    logger.info(
        "Training Isolation Forest on %d healthy samples, %d features",
        len(features),
        len(INFORMATIVE_SENSORS),
    )

    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    model = IsolationForest(
        contamination=contamination,
        random_state=random_state,
        n_estimators=200,
        n_jobs=-1,
    )
    model.fit(features_scaled)

    # Calibrate normalization range.
    # p99 of healthy data = "clearly normal" ceiling.
    # For the floor, score the FULL dataset (including degrading data) to find
    # the actual anomalous range, so late-life scores don't all clip to 0.
    train_scores = model.decision_function(features_scaled)

    all_features = df[INFORMATIVE_SENSORS].values
    all_scores = model.decision_function(scaler.transform(all_features))

    calibration = {
        "floor": float(np.percentile(all_scores, 1)),  # true anomalous boundary
        "ceiling": float(np.percentile(train_scores, 99)),  # healthy normal boundary
    }
    logger.info(
        "Score calibration: floor=%.4f, ceiling=%.4f",
        calibration["floor"], calibration["ceiling"],
    )

    if save:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        joblib.dump(calibration, CALIBRATION_PATH)
        logger.info("Saved model to %s", MODEL_PATH)

    # Invalidate cache so next call picks up the new model
    _invalidate_cache()

    return {
        "n_healthy_samples": len(features),
        "n_features": len(INFORMATIVE_SENSORS),
        "features": INFORMATIVE_SENSORS,
        "contamination": contamination,
        "model_path": str(MODEL_PATH),
        "calibration": calibration,
    }


def _invalidate_cache() -> None:
    """Clear the module-level cache (call after retraining)."""
    global _cached_model, _cached_scaler, _cached_calibration
    _cached_model = None
    _cached_scaler = None
    _cached_calibration = None


def _load_model() -> tuple[IsolationForest, StandardScaler, dict]:
    """Load the trained model, scaler, and calibration. Cached after first load."""
    global _cached_model, _cached_scaler, _cached_calibration
    if _cached_model is not None:
        return _cached_model, _cached_scaler, _cached_calibration

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. Run train_isolation_forest() first."
        )
    _cached_model = joblib.load(MODEL_PATH)
    _cached_scaler = joblib.load(SCALER_PATH)
    _cached_calibration = joblib.load(CALIBRATION_PATH)
    return _cached_model, _cached_scaler, _cached_calibration


def compute_feature_importance(
    model: IsolationForest,
    scaler: StandardScaler,
    sample: np.ndarray,
) -> list[dict]:
    """Estimate per-feature contribution to anomaly score.

    Uses the approach of scoring with each feature individually permuted
    versus the full-feature score. Larger score difference = higher contribution.
    """
    sample_scaled = scaler.transform(sample)
    base_scores = model.decision_function(sample_scaled)
    base_mean = base_scores.mean()

    importances = []
    rng = np.random.RandomState(42)
    for i, sensor in enumerate(INFORMATIVE_SENSORS):
        permuted = sample_scaled.copy()
        rng.shuffle(permuted[:, i])
        permuted_scores = model.decision_function(permuted)
        importance = abs(base_mean - permuted_scores.mean())
        importances.append({"sensor": sensor, "contribution": float(importance)})

    importances.sort(key=lambda x: x["contribution"], reverse=True)
    return importances


def score_window(
    readings: pd.DataFrame,
    skip_feature_importance: bool = False,
) -> dict:
    """Score a DataFrame of sensor readings against the trained model.

    Args:
        readings: DataFrame with INFORMATIVE_SENSORS columns.
                  Typically a window of recent cycles for one unit.
        skip_feature_importance: If True, skip the expensive permutation-based
            feature importance computation. Use for batch/fleet scoring.

    Returns:
        Dict with anomaly_score, normalized_score, is_anomalous, and
        top_contributing_sensors.
    """
    model, scaler, calibration = _load_model()

    features = readings[INFORMATIVE_SENSORS].values
    features_scaled = scaler.transform(features)

    # Raw scores: negative = more anomalous, positive = more normal
    raw_scores = model.decision_function(features_scaled)
    predictions = model.predict(features_scaled)

    mean_score = float(raw_scores.mean())

    # Normalize to 0-100 using empirical calibration.
    # floor = p1 of full dataset (most anomalous), ceiling = p99 of healthy data.
    score_range = calibration["ceiling"] - calibration["floor"]
    if score_range > 1e-10:
        normalized = (mean_score - calibration["floor"]) / score_range * 100
    else:
        normalized = 50.0
    normalized = float(np.clip(normalized, 0, 100))

    is_anomalous = bool((predictions == -1).mean() > 0.5)

    if skip_feature_importance:
        top_sensors = []
    else:
        top_sensors = compute_feature_importance(model, scaler, features)

    return {
        "anomaly_score": mean_score,
        "normalized_score": normalized,
        "is_anomalous": is_anomalous,
        "top_contributing_sensors": top_sensors[:5] if top_sensors else [],
        "n_readings_scored": len(readings),
        "pct_anomalous_readings": float((predictions == -1).mean()),
    }
