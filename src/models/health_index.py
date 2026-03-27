"""Health index composite: normalized 0-100 score combining anomaly and RUL signals.

Weighting: 40% anomaly score (inverted: higher = healthier) + 60% RUL.
Internal function, not a standalone tool — used by fleet summary and
natural language descriptions.
"""

import numpy as np

from src.config import EXPECTED_MEDIAN_LIFE


def compute_health_index(
    anomaly_result: dict,
    rul_result: dict,
    anomaly_weight: float = 0.40,
    rul_weight: float = 0.60,
) -> float:
    """Compute a 0-100 health index from anomaly and RUL results.

    Args:
        anomaly_result: Output from anomaly_detector.score_window().
            Must contain 'normalized_score' (0-100, higher = more normal).
        rul_result: Output from rul_estimator.estimate_rul().
            Must contain 'estimated_rul' (cycles remaining).
        anomaly_weight: Weight for anomaly component (default 0.40).
        rul_weight: Weight for RUL component (default 0.60).

    Returns:
        Float 0-100 where 100 = perfect health.
    """
    # Anomaly component: normalized_score is already 0-100 (higher = healthier)
    anomaly_component = anomaly_result["normalized_score"]

    # RUL component: normalize against expected median life, cap at 100
    estimated_rul = rul_result["estimated_rul"]
    rul_component = min(100.0, (estimated_rul / EXPECTED_MEDIAN_LIFE) * 100)

    health = anomaly_weight * anomaly_component + rul_weight * rul_component
    return float(np.clip(health, 0.0, 100.0))


def health_label(score: float) -> str:
    """Convert a health index score to a human-readable label."""
    if score >= 80:
        return "healthy"
    elif score >= 50:
        return "degrading"
    elif score >= 25:
        return "critical"
    else:
        return "near_failure"
