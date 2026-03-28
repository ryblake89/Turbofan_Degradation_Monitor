"""Graph context lookup tool — queries Neo4j for structural context.

Provides a single entry point for all knowledge graph queries. Agents call
graph_context_lookup(unit_id, query_type, **kwargs) to get structured dicts
with asset hierarchy, failure modes, maintenance history, related units,
or sensor context information.
"""

import logging

from src.graph.database import get_session

logger = logging.getLogger(__name__)


def graph_context_lookup(unit_id: int, query_type: str, **kwargs) -> dict:
    """Query Neo4j for contextual information about a unit.

    Args:
        unit_id: Engine unit identifier.
        query_type: One of "asset_hierarchy", "failure_modes",
            "maintenance_history", "related_units", "sensor_context".
        **kwargs: Extra arguments per query type:
            - failure_modes: flagged_sensors (list[str], optional)
            - sensor_context: sensor_ids (list[str], required)

    Returns:
        Structured dict with query results.

    Raises:
        ValueError: If query_type is unknown.
    """
    dispatch = {
        "asset_hierarchy": _query_asset_hierarchy,
        "failure_modes": _query_failure_modes,
        "maintenance_history": _query_maintenance_history,
        "related_units": _query_related_units,
        "sensor_context": _query_sensor_context,
    }

    if query_type not in dispatch:
        raise ValueError(f"Unknown query_type: {query_type}")

    logger.info("graph_context_lookup unit_id=%s query_type=%s", unit_id, query_type)
    return dispatch[query_type](unit_id, **kwargs)


def _unit_exists(session, unit_id: int) -> bool:
    """Check whether an Engine node with the given unit_id exists."""
    result = session.run(
        "MATCH (e:Engine {unit_id: $unit_id}) RETURN e.unit_id AS uid",
        unit_id=unit_id,
    ).single()
    return result is not None


def _query_asset_hierarchy(unit_id: int, **kwargs) -> dict:
    with get_session() as session:
        if not _unit_exists(session, unit_id):
            return {"error": f"Unit {unit_id} not found in graph"}

        records = session.run(
            """
            MATCH (p:Plant)-[:HAS_FLEET]->(f:Fleet)-[:CONTAINS]->(e:Engine {unit_id: $unit_id})
            MATCH (e)-[:HAS_SUBSYSTEM]->(sub:Subsystem)
            OPTIONAL MATCH (sub)-[mb:MONITORED_BY]->(sen:Sensor)
            RETURN p.name AS plant, f.name AS fleet,
                   sub.name AS subsystem, sub.type AS sub_type,
                   collect({sensor_id: sen.sensor_id, name: sen.name, criticality: mb.criticality}) AS sensors
            """,
            unit_id=unit_id,
        )

        plant = None
        fleet = None
        subsystems = []

        for record in records:
            plant = record["plant"]
            fleet = record["fleet"]
            # Filter out null sensors (from OPTIONAL MATCH with no sensors)
            sensors = [
                s for s in record["sensors"]
                if s["sensor_id"] is not None
            ]
            subsystems.append({
                "name": record["subsystem"],
                "type": record["sub_type"],
                "sensors": sensors,
            })

        return {
            "unit_id": unit_id,
            "plant": plant,
            "fleet": fleet,
            "subsystems": subsystems,
        }


def _query_failure_modes(unit_id: int, flagged_sensors: list[str] | None = None, **kwargs) -> dict:
    with get_session() as session:
        records = session.run(
            """
            MATCH (fm:FailureMode)-[r:INDICATED_BY]->(sen:Sensor)
            MATCH (fm)-[:AFFECTS]->(sub:Subsystem)
            WITH fm, sub, collect({sensor_id: sen.sensor_id, correlation: r.correlation_strength}) AS indicators
            RETURN fm.name AS name, fm.description AS description,
                   sub.name AS affected_subsystem,
                   indicators
            """,
        )

        failure_modes = []
        for record in records:
            indicator_ids = [ind["sensor_id"] for ind in record["indicators"]]
            entry = {
                "name": record["name"],
                "description": record["description"],
                "affected_subsystem": record["affected_subsystem"],
                "indicator_sensors": indicator_ids,
            }

            if flagged_sensors is not None:
                overlap = [s for s in flagged_sensors if s in indicator_ids]
                entry["sensors_currently_flagged"] = overlap
                entry["match_strength"] = round(
                    len(overlap) / len(indicator_ids), 2
                ) if indicator_ids else 0.0

            failure_modes.append(entry)

        # If flagged_sensors provided, only return modes with at least one overlap
        if flagged_sensors is not None:
            failure_modes = [
                fm for fm in failure_modes if fm["match_strength"] > 0
            ]

        return {
            "unit_id": unit_id,
            "matched_failure_modes": failure_modes,
        }


def _query_maintenance_history(unit_id: int, **kwargs) -> dict:
    with get_session() as session:
        if not _unit_exists(session, unit_id):
            return {"error": f"Unit {unit_id} not found in graph"}

        records = session.run(
            """
            MATCH (e:Engine {unit_id: $unit_id})-[:HAS_MAINTENANCE]->(w:WorkOrder)
            RETURN w.wo_id AS wo_id, w.action_type AS action_type,
                   w.urgency AS urgency, w.status AS status,
                   w.proposed_at AS proposed_at
            ORDER BY w.proposed_at DESC
            """,
            unit_id=unit_id,
        )

        work_orders = []
        for record in records:
            work_orders.append({
                "wo_id": record["wo_id"],
                "action_type": record["action_type"],
                "urgency": record["urgency"],
                "status": record["status"],
                "proposed_at": record["proposed_at"],
            })

        return {
            "unit_id": unit_id,
            "work_orders": work_orders,
            "total_work_orders": len(work_orders),
        }


def _query_related_units(unit_id: int, **kwargs) -> dict:
    with get_session() as session:
        if not _unit_exists(session, unit_id):
            return {"error": f"Unit {unit_id} not found in graph"}

        records = session.run(
            """
            MATCH (e:Engine {unit_id: $unit_id})-[r:SIMILAR_TO]->(other:Engine)
            OPTIONAL MATCH (other)-[:HAS_MAINTENANCE]->(w:WorkOrder)
            WITH other, r, collect(w) AS work_orders
            RETURN other.unit_id AS unit_id, r.similarity_score AS similarity,
                   other.total_cycles AS total_cycles, other.status AS status,
                   other.health_index AS health_index,
                   [w IN work_orders WHERE w IS NOT NULL |
                       {action_type: w.action_type, urgency: w.urgency, status: w.status}
                   ] AS maintenance_actions
            ORDER BY r.similarity_score DESC
            LIMIT 10
            """,
            unit_id=unit_id,
        )

        similar_units = []
        for record in records:
            similar_units.append({
                "unit_id": record["unit_id"],
                "similarity_score": record["similarity"],
                "total_cycles": record["total_cycles"],
                "status": record["status"],
                "health_index": record["health_index"],
                "maintenance_actions": list(record["maintenance_actions"]),
            })

        return {
            "unit_id": unit_id,
            "similar_units": similar_units,
        }


def _query_sensor_context(unit_id: int, sensor_ids: list[str] | None = None, **kwargs) -> dict:
    if not sensor_ids:
        return {"unit_id": unit_id, "sensors": []}

    with get_session() as session:
        records = session.run(
            """
            UNWIND $sensor_ids AS sid
            MATCH (sen:Sensor {sensor_id: sid})
            OPTIONAL MATCH (sub:Subsystem)-[mb:MONITORED_BY]->(sen)
            OPTIONAL MATCH (fm:FailureMode)-[ind:INDICATED_BY]->(sen)
            RETURN sen.sensor_id AS sensor_id, sen.name AS name, sen.symbol AS symbol,
                   sub.name AS subsystem, mb.criticality AS criticality,
                   collect(CASE WHEN fm IS NOT NULL THEN {
                       name: fm.name, correlation_strength: ind.correlation_strength
                   } END) AS related_failure_modes
            """,
            sensor_ids=sensor_ids,
        )

        sensors = []
        for record in records:
            # Filter out nulls from collect(CASE WHEN ...)
            fms = [fm for fm in record["related_failure_modes"] if fm is not None]
            sensors.append({
                "sensor_id": record["sensor_id"],
                "name": record["name"],
                "symbol": record["symbol"],
                "subsystem": record["subsystem"],
                "criticality": record["criticality"],
                "related_failure_modes": fms,
            })

        return {
            "unit_id": unit_id,
            "sensors": sensors,
        }
