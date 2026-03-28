"""Populate the Neo4j knowledge graph with the full industrial ontology.

Idempotent — safe to re-run. Uses MERGE for all node/relationship creation.

Usage:
    python -m src.graph.populate_ontology
"""

import logging
import sys

import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sqlalchemy import text

from src.config import HEALTHY_FRACTION
from src.data.database import engine as pg_engine
from src.graph.database import driver
from src.graph.ontology import (
    CONSTRAINTS,
    CREATE_FAILURE_MODES,
    CREATE_SENSOR_10,
    CREATE_SENSORS,
    PLANT_HIERARCHY,
    failure_mode_params,
    sensor_10_params,
    sensor_params,
)
from src.tools.fleet_tools import fleet_summary

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Sensors used for SIMILAR_TO correlation
_SIMILARITY_SENSORS = ["sensor_4", "sensor_11", "sensor_12"]
_SIMILARITY_THRESHOLD = 0.7


def _step_constraints(session):
    """Create uniqueness constraints and indexes."""
    logger.info("Creating constraints...")
    for cypher in CONSTRAINTS:
        session.run(cypher)
    logger.info("Constraints created.")


def _step_hierarchy(session):
    """Create plant, fleet, and subsystem nodes."""
    logger.info("Creating plant hierarchy...")
    session.run(PLANT_HIERARCHY)
    logger.info("Plant hierarchy created.")


def _step_sensors(session):
    """Create sensor nodes and link to subsystems."""
    logger.info("Creating sensor nodes...")
    session.run(CREATE_SENSORS, sensors=sensor_params())
    session.run(CREATE_SENSOR_10, **sensor_10_params())
    logger.info("21 sensor nodes created.")


def _step_failure_modes(session):
    """Create failure mode nodes with AFFECTS and INDICATED_BY relationships."""
    logger.info("Creating failure modes...")
    session.run(CREATE_FAILURE_MODES, modes=failure_mode_params())
    logger.info("5 failure modes created.")


def _step_engines(session):
    """Create engine nodes from fleet_summary and connect to fleet + subsystems."""
    logger.info("Computing fleet summary (this takes ~16s)...")
    fleet = fleet_summary(top_n=100)
    units = fleet["priority_list"]
    logger.info("Creating %d engine nodes...", len(units))

    for u in units:
        session.run(
            """
            MATCH (f:Fleet {name: 'FD001'})
            MERGE (e:Engine {unit_id: $unit_id})
            SET e.total_cycles = $total_cycles,
                e.health_index = $health_index,
                e.status = $status,
                e.estimated_rul = $estimated_rul
            MERGE (f)-[:CONTAINS]->(e)

            WITH e
            MATCH (sub:Subsystem)
            MERGE (e)-[:HAS_SUBSYSTEM]->(sub)
            """,
            unit_id=u["unit_id"],
            total_cycles=u["current_cycle"],
            health_index=u["health_index"],
            status=u["health_label"],
            estimated_rul=u["estimated_rul"],
        )

    logger.info("Engine nodes created.")


def _step_anomaly_events(session):
    """Sync anomaly events from PostgreSQL into Neo4j."""
    logger.info("Syncing anomaly events...")
    with pg_engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM anomaly_events ORDER BY id")).fetchall()
        cols = conn.execute(text("SELECT * FROM anomaly_events LIMIT 0")).keys()

    col_names = list(cols)
    logger.info("Found %d anomaly events.", len(rows))

    for row in rows:
        r = dict(zip(col_names, row))
        session.run(
            """
            MATCH (e:Engine {unit_id: $unit_id})
            MERGE (a:AnomalyEvent {pg_id: $pg_id})
            SET a.cycle = $cycle,
                a.anomaly_score = $anomaly_score,
                a.health_index = $health_index,
                a.detected_at = toString($detected_at)
            MERGE (e)-[:EXPERIENCED]->(a)
            """,
            pg_id=r["id"],
            unit_id=r["unit_id"],
            cycle=r["cycle"],
            anomaly_score=float(r["anomaly_score"]) if r["anomaly_score"] is not None else None,
            health_index=float(r["health_index"]) if r["health_index"] is not None else None,
            detected_at=str(r["detected_at"]) if r["detected_at"] else None,
        )

    logger.info("Anomaly events synced.")


def _step_work_orders(session):
    """Sync maintenance logs from PostgreSQL into Neo4j."""
    logger.info("Syncing maintenance logs...")
    with pg_engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM maintenance_log ORDER BY id")).fetchall()
        cols = conn.execute(text("SELECT * FROM maintenance_log LIMIT 0")).keys()

    col_names = list(cols)
    logger.info("Found %d maintenance log entries.", len(rows))

    for row in rows:
        r = dict(zip(col_names, row))
        session.run(
            """
            MATCH (e:Engine {unit_id: $unit_id})
            MERGE (w:WorkOrder {pg_id: $pg_id})
            SET w.wo_id = $wo_id,
                w.action_type = $action_type,
                w.urgency = $urgency,
                w.status = $status,
                w.proposed_at = toString($proposed_at)
            MERGE (e)-[:HAS_MAINTENANCE]->(w)
            """,
            pg_id=r["id"],
            unit_id=r["unit_id"],
            wo_id=r.get("cmms_work_order_id"),
            action_type=r["action_type"],
            urgency=r["urgency"],
            status=r["status"],
            proposed_at=str(r["proposed_at"]) if r.get("proposed_at") else None,
        )

    logger.info("Maintenance logs synced.")


def _step_similar_to(session):
    """Compute SIMILAR_TO relationships via Pearson correlation on degrading sensors."""
    logger.info("Computing SIMILAR_TO relationships...")

    # Fetch all sensor data for FD001
    query = text("""
        SELECT unit_id, cycle, sensor_4, sensor_11, sensor_12
        FROM sensor_readings
        WHERE dataset = 'FD001'
        ORDER BY unit_id, cycle
    """)
    df = pd.read_sql(query, pg_engine)

    # Group by unit and extract degradation phase (last 70%)
    unit_series = {}
    for unit_id, group in df.groupby("unit_id"):
        total = len(group)
        start = int(total * HEALTHY_FRACTION)
        deg = group.iloc[start:]
        if len(deg) < 5:
            continue
        unit_series[unit_id] = deg[_SIMILARITY_SENSORS].values

    unit_ids = sorted(unit_series.keys())
    edge_count = 0

    for i, uid1 in enumerate(unit_ids):
        for uid2 in unit_ids[i + 1:]:
            s1 = unit_series[uid1]
            s2 = unit_series[uid2]

            # Truncate to same length for correlation
            min_len = min(len(s1), len(s2))
            if min_len < 5:
                continue

            s1_t = s1[:min_len]
            s2_t = s2[:min_len]

            # Average Pearson correlation across the 3 sensors
            correlations = []
            for col in range(len(_SIMILARITY_SENSORS)):
                r, _ = pearsonr(s1_t[:, col], s2_t[:, col])
                if not np.isnan(r):
                    correlations.append(r)

            if not correlations:
                continue

            avg_corr = float(np.mean(correlations))
            if avg_corr >= _SIMILARITY_THRESHOLD:
                session.run(
                    """
                    MATCH (e1:Engine {unit_id: $uid1})
                    MATCH (e2:Engine {unit_id: $uid2})
                    MERGE (e1)-[r:SIMILAR_TO]->(e2)
                    SET r.similarity_score = $score
                    MERGE (e2)-[r2:SIMILAR_TO]->(e1)
                    SET r2.similarity_score = $score
                    """,
                    uid1=int(uid1),
                    uid2=int(uid2),
                    score=round(avg_corr, 4),
                )
                edge_count += 1

    logger.info("Created %d SIMILAR_TO pairs (%d directed edges).", edge_count, edge_count * 2)


def populate():
    """Run the full ontology population pipeline."""
    logger.info("=" * 60)
    logger.info("POPULATING NEO4J ONTOLOGY")
    logger.info("=" * 60)

    with driver.session() as session:
        _step_constraints(session)
        _step_hierarchy(session)
        _step_sensors(session)
        _step_failure_modes(session)
        _step_engines(session)
        _step_anomaly_events(session)
        _step_work_orders(session)
        _step_similar_to(session)

    # Verification counts
    with driver.session() as session:
        result = session.run(
            "MATCH (n) RETURN labels(n) AS label, count(*) AS count ORDER BY count DESC"
        )
        logger.info("Node counts:")
        for record in result:
            logger.info("  %s: %d", record["label"], record["count"])

        sim_result = session.run(
            "MATCH ()-[r:SIMILAR_TO]->() RETURN count(r) AS count, "
            "avg(r.similarity_score) AS avg_score"
        )
        rec = sim_result.single()
        logger.info("SIMILAR_TO edges: %d (avg score: %.3f)",
                     rec["count"], rec["avg_score"] if rec["avg_score"] else 0)

    logger.info("=" * 60)
    logger.info("POPULATION COMPLETE")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        populate()
    except Exception:
        logger.exception("Population failed")
        sys.exit(1)
