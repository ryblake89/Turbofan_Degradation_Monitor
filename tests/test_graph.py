"""Tests for Neo4j knowledge graph ontology.

Verifies the graph was populated correctly: node counts, relationships,
sensor-to-subsystem mappings, failure modes, and SIMILAR_TO edges.
Runs against the live Neo4j instance (Docker Compose).
"""

import pytest

from src.graph.database import driver


@pytest.fixture(scope="module", autouse=True)
def check_neo4j():
    """Skip all tests if Neo4j is not reachable."""
    try:
        driver.verify_connectivity()
    except Exception as exc:
        pytest.skip(f"Neo4j not available: {exc}")


@pytest.fixture(scope="module")
def session():
    with driver.session() as s:
        yield s


# ── Node counts ──────────────────────────────────────────────────────

def test_engine_count(session):
    result = session.run("MATCH (e:Engine) RETURN count(e) AS c").single()
    assert result["c"] == 100


def test_sensor_count(session):
    result = session.run("MATCH (s:Sensor) RETURN count(s) AS c").single()
    assert result["c"] == 21


def test_subsystem_count(session):
    result = session.run("MATCH (s:Subsystem) RETURN count(s) AS c").single()
    assert result["c"] == 6


def test_failure_mode_count(session):
    result = session.run("MATCH (f:FailureMode) RETURN count(f) AS c").single()
    assert result["c"] == 5


def test_plant_and_fleet(session):
    result = session.run(
        "MATCH (p:Plant)-[:HAS_FLEET]->(f:Fleet)-[:CONTAINS]->(e:Engine) "
        "RETURN p.name AS plant, f.name AS fleet, count(e) AS engines"
    ).single()
    assert result["plant"] == "Simulated Turbofan Test Facility"
    assert result["fleet"] == "FD001"
    assert result["engines"] == 100


# ── Sensor-to-subsystem mappings ─────────────────────────────────────

_EXPECTED_SENSOR_SUBSYSTEM = {
    "sensor_2": "LPC",
    "sensor_3": "HPC",
    "sensor_4": "LPT",
    "sensor_7": "HPC",
    "sensor_9": "HPT",
    "sensor_11": "HPC",
    "sensor_12": "HPC",
    "sensor_15": "Fan",
}


@pytest.mark.parametrize("sensor_id,expected_sub", _EXPECTED_SENSOR_SUBSYSTEM.items())
def test_sensor_subsystem_mapping(session, sensor_id, expected_sub):
    result = session.run(
        "MATCH (sub:Subsystem)-[:MONITORED_BY]->(s:Sensor {sensor_id: $sid}) "
        "RETURN sub.name AS subsystem",
        sid=sensor_id,
    ).single()
    assert result is not None, f"{sensor_id} has no subsystem"
    assert result["subsystem"] == expected_sub


def test_sensor_10_no_subsystem(session):
    """sensor_10 (epr) is 'Overall' — not linked to any subsystem."""
    result = session.run(
        "MATCH (sub:Subsystem)-[:MONITORED_BY]->(s:Sensor {sensor_id: 'sensor_10'}) "
        "RETURN sub.name AS subsystem"
    ).single()
    assert result is None


# ── Failure modes ────────────────────────────────────────────────────

def test_hpc_degradation_indicators(session):
    result = session.run(
        "MATCH (fm:FailureMode {name: 'HPC Degradation'})-[:INDICATED_BY]->(s:Sensor) "
        "RETURN collect(s.sensor_id) AS sensors"
    ).single()
    sensors = set(result["sensors"])
    assert sensors == {"sensor_3", "sensor_7", "sensor_11", "sensor_12", "sensor_4"}


def test_hpc_degradation_affects_hpc(session):
    result = session.run(
        "MATCH (fm:FailureMode {name: 'HPC Degradation'})-[:AFFECTS]->(sub:Subsystem) "
        "RETURN sub.name AS subsystem"
    ).single()
    assert result["subsystem"] == "HPC"


def test_fan_degradation_indicators(session):
    result = session.run(
        "MATCH (fm:FailureMode {name: 'Fan Degradation'})-[:INDICATED_BY]->(s:Sensor) "
        "RETURN collect(s.sensor_id) AS sensors"
    ).single()
    assert set(result["sensors"]) == {"sensor_2", "sensor_15"}


def test_all_failure_modes_have_affects(session):
    result = session.run(
        "MATCH (fm:FailureMode) "
        "WHERE NOT (fm)-[:AFFECTS]->(:Subsystem) "
        "RETURN count(fm) AS orphans"
    ).single()
    assert result["orphans"] == 0


# ── Engine properties ────────────────────────────────────────────────

def test_engines_have_health_data(session):
    result = session.run(
        "MATCH (e:Engine) WHERE e.health_index IS NOT NULL AND e.status IS NOT NULL "
        "RETURN count(e) AS c"
    ).single()
    assert result["c"] == 100


def test_engines_connected_to_subsystems(session):
    result = session.run(
        "MATCH (e:Engine {unit_id: 1})-[:HAS_SUBSYSTEM]->(sub:Subsystem) "
        "RETURN count(sub) AS c"
    ).single()
    assert result["c"] == 6


# ── SIMILAR_TO ───────────────────────────────────────────────────────

def test_similar_to_edges_exist(session):
    result = session.run(
        "MATCH ()-[r:SIMILAR_TO]->() RETURN count(r) AS c"
    ).single()
    assert result["c"] > 0


def test_similar_to_scores_in_range(session):
    result = session.run(
        "MATCH ()-[r:SIMILAR_TO]->() "
        "RETURN min(r.similarity_score) AS min_s, max(r.similarity_score) AS max_s"
    ).single()
    assert result["min_s"] >= 0.7
    assert result["max_s"] <= 1.0
