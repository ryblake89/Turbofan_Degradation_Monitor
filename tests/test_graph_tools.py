"""Tests for graph_context_lookup tool.

Verifies all 5 query types against live Neo4j, plus edge cases
for unknown units, unknown sensors, and invalid query types.
"""

import pytest

from src.graph.database import driver
from src.tools.graph_tools import graph_context_lookup


@pytest.fixture(scope="module", autouse=True)
def check_neo4j():
    """Skip all tests if Neo4j is not reachable."""
    try:
        driver.verify_connectivity()
    except Exception as exc:
        pytest.skip(f"Neo4j not available: {exc}")


# ── asset_hierarchy ─────────────────────────────────────────────────


def test_asset_hierarchy_known_unit():
    result = graph_context_lookup(1, "asset_hierarchy")
    assert result["unit_id"] == 1
    assert result["plant"] == "Simulated Turbofan Test Facility"
    assert result["fleet"] == "FD001"
    assert len(result["subsystems"]) == 6
    sub_names = {s["name"] for s in result["subsystems"]}
    assert sub_names == {"Fan", "LPC", "HPC", "Combustor", "HPT", "LPT"}
    # Each subsystem should have sensors (except possibly none for some)
    for sub in result["subsystems"]:
        assert "sensors" in sub
        assert "type" in sub


def test_asset_hierarchy_hpc_sensors():
    """HPC subsystem should have 4 key sensors."""
    result = graph_context_lookup(1, "asset_hierarchy")
    hpc = next(s for s in result["subsystems"] if s["name"] == "HPC")
    sensor_ids = {s["sensor_id"] for s in hpc["sensors"]}
    assert {"sensor_3", "sensor_7", "sensor_11", "sensor_12"}.issubset(sensor_ids)
    for s in hpc["sensors"]:
        assert s["criticality"] in ("high", "medium", "low")


# ── failure_modes ───────────────────────────────────────────────────


def test_failure_modes_with_flagged_sensors():
    result = graph_context_lookup(
        7, "failure_modes", flagged_sensors=["sensor_11", "sensor_12"]
    )
    assert result["unit_id"] == 7
    modes = result["matched_failure_modes"]
    assert len(modes) >= 1
    hpc = next(m for m in modes if m["name"] == "HPC Degradation")
    assert set(hpc["sensors_currently_flagged"]) == {"sensor_11", "sensor_12"}
    assert hpc["match_strength"] == pytest.approx(0.4, abs=0.01)


def test_failure_modes_without_flagged_sensors():
    result = graph_context_lookup(1, "failure_modes")
    modes = result["matched_failure_modes"]
    assert len(modes) == 5
    names = {m["name"] for m in modes}
    assert names == {
        "HPC Degradation", "Fan Degradation", "LPT Degradation",
        "HPT Degradation", "Combustor Fouling",
    }
    # No match_strength or sensors_currently_flagged when unflagged
    for m in modes:
        assert "match_strength" not in m
        assert "sensors_currently_flagged" not in m


def test_failure_modes_no_overlap():
    """Constant sensor_1 is not an indicator for any failure mode."""
    result = graph_context_lookup(
        1, "failure_modes", flagged_sensors=["sensor_1"]
    )
    assert result["matched_failure_modes"] == []


def test_failure_modes_combustor_fouling():
    result = graph_context_lookup(
        1, "failure_modes", flagged_sensors=["sensor_12", "sensor_14"]
    )
    modes = result["matched_failure_modes"]
    names = {m["name"] for m in modes}
    assert "Combustor Fouling" in names
    comb = next(m for m in modes if m["name"] == "Combustor Fouling")
    assert comb["match_strength"] == pytest.approx(1.0, abs=0.01)


# ── maintenance_history ─────────────────────────────────────────────


def test_maintenance_history_known_unit():
    result = graph_context_lookup(1, "maintenance_history")
    assert result["unit_id"] == 1
    assert "work_orders" in result
    assert "total_work_orders" in result
    assert result["total_work_orders"] == len(result["work_orders"])
    if result["work_orders"]:
        wo = result["work_orders"][0]
        assert "wo_id" in wo
        assert "action_type" in wo
        assert "urgency" in wo
        assert "status" in wo
        assert "proposed_at" in wo


def test_maintenance_history_structure():
    """Verify valid values in work order fields."""
    result = graph_context_lookup(1, "maintenance_history")
    for wo in result["work_orders"]:
        assert wo["action_type"] in ("inspect", "service", "replace")
        assert wo["urgency"] in ("routine", "soon", "immediate")
        assert wo["status"] in ("pending", "approved", "rejected", "completed")


# ── related_units ───────────────────────────────────────────────────


def test_related_units():
    result = graph_context_lookup(1, "related_units")
    assert result["unit_id"] == 1
    assert "similar_units" in result
    if result["similar_units"]:
        unit = result["similar_units"][0]
        assert "unit_id" in unit
        assert "similarity_score" in unit
        assert "total_cycles" in unit
        assert "status" in unit
        assert "health_index" in unit
        assert "maintenance_actions" in unit
        assert unit["similarity_score"] >= 0.7


def test_related_units_limit():
    """At most 10 similar units returned."""
    result = graph_context_lookup(1, "related_units")
    assert len(result["similar_units"]) <= 10


def test_related_units_sorted_by_similarity():
    result = graph_context_lookup(1, "related_units")
    scores = [u["similarity_score"] for u in result["similar_units"]]
    assert scores == sorted(scores, reverse=True)


# ── sensor_context ──────────────────────────────────────────────────


def test_sensor_context():
    result = graph_context_lookup(
        1, "sensor_context", sensor_ids=["sensor_11", "sensor_4"]
    )
    assert result["unit_id"] == 1
    assert len(result["sensors"]) == 2
    ids = {s["sensor_id"] for s in result["sensors"]}
    assert ids == {"sensor_11", "sensor_4"}

    s11 = next(s for s in result["sensors"] if s["sensor_id"] == "sensor_11")
    assert s11["subsystem"] == "HPC"
    assert s11["criticality"] == "high"
    assert s11["symbol"] == "Ps30"
    assert len(s11["related_failure_modes"]) >= 1
    fm_names = {fm["name"] for fm in s11["related_failure_modes"]}
    assert "HPC Degradation" in fm_names


def test_sensor_context_unknown_sensor():
    result = graph_context_lookup(
        1, "sensor_context", sensor_ids=["sensor_99"]
    )
    assert result["sensors"] == []


def test_sensor_context_no_sensor_ids():
    result = graph_context_lookup(1, "sensor_context")
    assert result["sensors"] == []


def test_sensor_context_sensor_10_no_subsystem():
    """sensor_10 (epr) has no subsystem relationship."""
    result = graph_context_lookup(
        1, "sensor_context", sensor_ids=["sensor_10"]
    )
    assert len(result["sensors"]) == 1
    s10 = result["sensors"][0]
    assert s10["subsystem"] is None
    assert s10["criticality"] is None


# ── Edge cases ──────────────────────────────────────────────────────


def test_unknown_unit_asset_hierarchy():
    result = graph_context_lookup(9999, "asset_hierarchy")
    assert "error" in result
    assert "9999" in result["error"]


def test_unknown_unit_maintenance_history():
    result = graph_context_lookup(9999, "maintenance_history")
    assert "error" in result


def test_unknown_unit_related_units():
    result = graph_context_lookup(9999, "related_units")
    assert "error" in result


def test_unknown_query_type():
    with pytest.raises(ValueError, match="Unknown query_type"):
        graph_context_lookup(1, "nonexistent_type")
