"""Seed synthetic decision traces as the initial playbook library.

Runs the existing tool functions against representative units at various
lifecycle stages to generate realistic decision traces. These seeded
traces become the playbook library the agent searches for similar cases.

Usage:
    python -m src.memory.seed_playbooks
"""

import logging
import sys

import pandas as pd
from sqlalchemy import text

from src.data.database import engine
from src.models.anomaly_detector import score_window
from src.models.health_index import compute_health_index, health_label
from src.models.rul_estimator import estimate_rul
from src.models.trend_analyzer import analyze_trends
from src.memory.decision_trace import build_sensor_context, log_decision_trace

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Representative units sampled at different lifecycle fractions.
# For each (unit_id, n_cycles_fraction), we fetch data up to that
# fraction of the unit's total life, simulating "what if we checked
# this unit at X% of its life?"
#
# Strategy: pick units across the full range, at early/mid/late life.
# FD001 unit lifetimes range from 128 to 362 cycles.

# (unit_id, lifecycle_pct, expected_stage_hint)
SEED_SCENARIOS = [
    # Early life — should produce "healthy" / "informational" traces
    (1, 0.20, "healthy"),
    (5, 0.25, "healthy"),
    (15, 0.15, "healthy"),
    (30, 0.20, "healthy"),
    (50, 0.25, "healthy"),
    (70, 0.20, "healthy"),
    (90, 0.25, "healthy"),

    # Mid life — mixed, some starting to degrade
    (2, 0.50, "degrading"),
    (10, 0.55, "degrading"),
    (20, 0.50, "degrading"),
    (40, 0.55, "degrading"),
    (60, 0.50, "degrading"),
    (80, 0.50, "degrading"),

    # Late life — degrading or critical, maintenance actions
    (3, 0.75, "critical"),
    (8, 0.80, "critical"),
    (12, 0.70, "critical"),
    (25, 0.75, "critical"),
    (45, 0.80, "critical"),
    (65, 0.75, "critical"),
    (85, 0.80, "critical"),

    # End of life — near failure, urgent maintenance
    (4, 0.95, "near_failure"),
    (7, 0.92, "near_failure"),
    (18, 0.90, "near_failure"),
    (35, 0.95, "near_failure"),
    (55, 0.93, "near_failure"),
    (75, 0.90, "near_failure"),
    (95, 0.95, "near_failure"),
]


def _get_unit_total_cycles(unit_id: int) -> int:
    """Get total cycle count for a unit."""
    q = text("SELECT MAX(cycle) FROM sensor_readings WHERE unit_id = :uid AND dataset = 'FD001'")
    with engine.connect() as conn:
        result = conn.execute(q, {"uid": unit_id}).fetchone()
    return result[0] if result and result[0] else 0


def _fetch_truncated_history(unit_id: int, max_cycle: int) -> pd.DataFrame:
    """Fetch sensor readings up to (and including) max_cycle.

    This simulates "what data would be available if we checked the unit
    at this point in its life?" — the key to generating realistic traces
    at different lifecycle stages.
    """
    q = text("""
        SELECT * FROM sensor_readings
        WHERE unit_id = :uid AND dataset = 'FD001' AND cycle <= :max_cycle
        ORDER BY cycle
    """)
    return pd.read_sql(q, engine, params={"uid": unit_id, "max_cycle": max_cycle})


def _decide_action(health: float, label: str, rul: int) -> tuple[str, str, str, str]:
    """Generate a synthetic decision based on health state.

    Returns (intent, action_taken, outcome, recommendation).
    """
    if label in ("healthy",):
        return (
            "status_check",
            "informational",
            "informational",
            f"Unit operating normally. Health index {health:.0f}/100, "
            f"estimated {rul} cycles remaining. No action required.",
        )
    elif label == "degrading":
        return (
            "diagnostic",
            "monitoring_increased",
            "informational",
            f"Early degradation detected. Health index {health:.0f}/100, "
            f"estimated {rul} cycles remaining. Increasing monitoring frequency. "
            "Schedule routine inspection within 20 cycles.",
        )
    elif label == "critical":
        return (
            "maintenance_planning",
            "maintenance_proposed",
            "approved",
            f"Significant degradation. Health index {health:.0f}/100, "
            f"estimated {rul} cycles remaining. Recommend service action "
            "within 5 cycles to prevent unplanned downtime.",
        )
    else:  # near_failure
        return (
            "maintenance_planning",
            "maintenance_proposed",
            "approved",
            f"Critical condition — near failure. Health index {health:.0f}/100, "
            f"estimated {rul} cycles remaining. Immediate replacement recommended. "
            "Risk of in-service failure if not addressed within 1 cycle.",
        )


def _generate_query(unit_id: int, stage_hint: str) -> str:
    """Generate a synthetic user query for the trace."""
    queries = {
        "healthy": f"What's the current status of unit {unit_id}?",
        "degrading": f"I noticed some drift on unit {unit_id} — can you check it?",
        "critical": f"Unit {unit_id} seems to be degrading. What maintenance do we need?",
        "near_failure": f"Unit {unit_id} is in bad shape. What do we do?",
    }
    return queries.get(stage_hint, f"Check unit {unit_id}")


def seed_playbooks(clear_existing: bool = False) -> int:
    """Run seed scenarios and log decision traces.

    Args:
        clear_existing: If True, delete all existing decision traces first.

    Returns:
        Number of traces seeded.
    """
    if clear_existing:
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM decision_traces"))
            conn.commit()
        logger.info("Cleared existing decision traces")

    seeded = 0

    for unit_id, lifecycle_pct, stage_hint in SEED_SCENARIOS:
        total_cycles = _get_unit_total_cycles(unit_id)
        if total_cycles == 0:
            logger.warning("Unit %d has no data, skipping", unit_id)
            continue

        # Truncate history to simulate checking at lifecycle_pct.
        # This is the key fix: the model functions see only the data
        # that would exist at this point in the unit's life.
        target_cycle = max(20, int(total_cycles * lifecycle_pct))
        df = _fetch_truncated_history(unit_id, target_cycle)
        if len(df) < 10:
            logger.warning("Unit %d has < 10 cycles at %.0f%% life, skipping",
                           unit_id, lifecycle_pct * 100)
            continue

        try:
            # Call model functions directly on truncated data
            anomaly_window = df.tail(min(30, len(df))).reset_index(drop=True)
            anomaly_result = score_window(anomaly_window)
            rul_result = estimate_rul(df)
            trend_result = analyze_trends(df, window_size=min(20, len(df) - 1))

            # Compute health
            health = compute_health_index(
                {"normalized_score": anomaly_result["normalized_score"]},
                {"estimated_rul": rul_result["estimated_rul"]},
            )
            label = health_label(health)

            # Build standardized context
            ctx = build_sensor_context(
                anomaly_result=anomaly_result,
                rul_result=rul_result,
                trend_result=trend_result,
                health_index=health,
            )

            # Generate synthetic decision
            intent, action_taken, outcome, recommendation = _decide_action(
                health, label, rul_result["estimated_rul"]
            )

            # Build tools_called record
            tools_called = [
                {"tool": "anomaly_check", "input": {"unit_id": unit_id, "window_size": min(30, len(anomaly_window))}},
                {"tool": "rul_estimate", "input": {"unit_id": unit_id}},
                {"tool": "sensor_trend_analysis", "input": {"unit_id": unit_id, "window_size": min(20, len(df) - 1)}},
            ]

            trace_id = log_decision_trace(
                unit_id=unit_id,
                sensor_context=ctx,
                query=_generate_query(unit_id, stage_hint),
                intent=intent,
                tools_called=tools_called,
                recommendation=recommendation,
                action_taken=action_taken,
                outcome=outcome,
                session_id=f"seed-{unit_id:03d}-{int(lifecycle_pct * 100):02d}",
            )

            logger.info(
                "Seeded trace %d: unit=%d, life=%.0f%%, health=%.1f (%s), action=%s",
                trace_id, unit_id, lifecycle_pct * 100, health, label, action_taken,
            )
            seeded += 1

        except Exception:
            logger.exception("Failed to seed trace for unit %d at %.0f%% life", unit_id, lifecycle_pct * 100)
            continue

    logger.info("Seeding complete: %d traces created", seeded)
    return seeded


if __name__ == "__main__":
    clear = "--clear" in sys.argv
    count = seed_playbooks(clear_existing=clear)
    print(f"\nSeeded {count} decision traces.")
