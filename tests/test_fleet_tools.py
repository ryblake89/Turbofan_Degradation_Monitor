"""Tests for fleet-level tool functions.

fleet_summary runs against all 100 units — this test is slower than others
but validates the batch query + scoring pipeline end-to-end.
"""

import pytest

from src.tools.fleet_tools import fleet_summary


class TestFleetSummary:
    @pytest.fixture(scope="class")
    def summary(self):
        """Cache fleet_summary result for the test class (expensive call)."""
        return fleet_summary(top_n=10)

    def test_returns_correct_structure(self, summary):
        assert isinstance(summary["total_units"], int)
        assert summary["total_units"] == 100
        assert isinstance(summary["units_critical"], int)
        assert isinstance(summary["units_degrading"], int)
        assert isinstance(summary["units_healthy"], int)
        assert isinstance(summary["priority_list"], list)
        assert isinstance(summary["fleet_health_avg"], float)

    def test_categories_sum_to_total(self, summary):
        total = (
            summary["units_critical"]
            + summary["units_degrading"]
            + summary["units_healthy"]
        )
        assert total == summary["total_units"]

    def test_priority_list_length(self, summary):
        assert len(summary["priority_list"]) <= 10

    def test_priority_list_sorted_by_health(self, summary):
        healths = [u["health_index"] for u in summary["priority_list"]]
        assert healths == sorted(healths)

    def test_priority_entry_structure(self, summary):
        entry = summary["priority_list"][0]
        assert "unit_id" in entry
        assert "health_index" in entry
        assert "health_label" in entry
        assert "estimated_rul" in entry
        assert "degradation_stage" in entry
        assert "anomaly_normalized" in entry
        assert "is_anomalous" in entry
        assert "current_cycle" in entry

    def test_fleet_health_avg_in_range(self, summary):
        assert 0 <= summary["fleet_health_avg"] <= 100

    def test_top_n_parameter(self):
        small = fleet_summary(top_n=3)
        assert len(small["priority_list"]) <= 3
