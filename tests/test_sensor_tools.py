"""Tests for sensor tool functions.

Runs against live PostgreSQL with FD001 data and trained models.
"""

import pytest

from src.config import ALL_SENSORS, KEY_SENSORS, OP_SETTINGS
from src.tools.sensor_tools import (
    anomaly_check,
    rul_estimate,
    sensor_history_lookup,
    sensor_trend_analysis,
)


class TestSensorHistoryLookup:
    def test_returns_correct_structure(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id, n_cycles=10)

        assert result["unit_id"] == known_unit_id
        assert isinstance(result["cycles"], list)
        assert len(result["cycles"]) == 10
        assert isinstance(result["readings"], dict)
        assert isinstance(result["op_settings"], dict)
        assert result["total_cycles"] > 0

    def test_readings_contain_all_sensors(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id, n_cycles=5)
        for sensor in ALL_SENSORS:
            assert sensor in result["readings"]
            assert len(result["readings"][sensor]) == 5

    def test_op_settings_present(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id, n_cycles=5)
        for setting in OP_SETTINGS:
            assert setting in result["op_settings"]

    def test_cycles_are_sorted(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id, n_cycles=20)
        cycles = result["cycles"]
        assert cycles == sorted(cycles)

    def test_n_cycles_caps_at_available(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id, n_cycles=9999)
        assert len(result["cycles"]) == result["total_cycles"]

    def test_invalid_unit_raises(self):
        with pytest.raises(ValueError, match="No sensor readings"):
            sensor_history_lookup(9999)

    def test_default_n_cycles(self, known_unit_id):
        result = sensor_history_lookup(known_unit_id)
        assert len(result["cycles"]) <= 50


class TestAnomalyCheck:
    def test_returns_correct_structure(self, known_unit_id):
        result = anomaly_check(known_unit_id, window_size=30)

        assert result["unit_id"] == known_unit_id
        assert isinstance(result["is_anomalous"], bool)
        assert isinstance(result["anomaly_score"], float)
        assert isinstance(result["normalized_score"], float)
        assert 0 <= result["normalized_score"] <= 100
        assert isinstance(result["top_contributing_sensors"], list)
        assert isinstance(result["window_start_cycle"], int)
        assert isinstance(result["window_end_cycle"], int)

    def test_window_cycle_range(self, known_unit_id):
        result = anomaly_check(known_unit_id, window_size=10)
        assert result["window_end_cycle"] >= result["window_start_cycle"]
        # Window should span roughly 10 cycles
        span = result["window_end_cycle"] - result["window_start_cycle"] + 1
        assert span == 10

    def test_contributing_sensors_are_valid(self, known_unit_id):
        result = anomaly_check(known_unit_id, window_size=30)
        for entry in result["top_contributing_sensors"]:
            assert "sensor" in entry
            assert "contribution" in entry

    def test_invalid_unit_raises(self):
        with pytest.raises(ValueError, match="No sensor readings"):
            anomaly_check(9999)


class TestSensorTrendAnalysis:
    def test_returns_correct_structure(self, known_unit_id):
        result = sensor_trend_analysis(known_unit_id, window_size=20)

        assert result["unit_id"] == known_unit_id
        assert result["total_cycles"] > 0
        assert isinstance(result["rolling_features"], dict)
        assert isinstance(result["change_points"], list)
        assert isinstance(result["cross_sensor_divergence"], dict)
        assert result["trend_summary"] in ("stable", "gradual_degradation", "accelerating")
        assert result["window_size"] == 20

    def test_rolling_features_per_sensor(self, known_unit_id):
        result = sensor_trend_analysis(known_unit_id)
        for sensor in KEY_SENSORS:
            assert sensor in result["rolling_features"]
            features = result["rolling_features"][sensor]
            assert "mean" in features
            assert "std" in features
            assert "slope" in features
            assert "rate_of_change" in features

    def test_custom_sensors(self, known_unit_id):
        custom = ["sensor_2", "sensor_4"]
        result = sensor_trend_analysis(known_unit_id, sensors=custom)
        assert set(result["rolling_features"].keys()) == set(custom)

    def test_invalid_unit_raises(self):
        with pytest.raises(ValueError, match="No sensor readings"):
            sensor_trend_analysis(9999)


class TestRulEstimate:
    def test_returns_correct_structure(self, known_unit_id):
        result = rul_estimate(known_unit_id)

        assert result["unit_id"] == known_unit_id
        assert isinstance(result["estimated_rul"], int)
        assert result["estimated_rul"] >= 0
        assert isinstance(result["confidence_interval"], (tuple, list))
        assert len(result["confidence_interval"]) == 2
        assert result["degradation_stage"] in ("healthy", "degrading", "critical")
        assert isinstance(result["key_degrading_sensors"], list)
        assert result["model_type"] == "piecewise_linear"
        assert isinstance(result["current_cycle"], int)

    def test_confidence_interval_bounds(self, known_unit_id):
        result = rul_estimate(known_unit_id)
        ci_lower, ci_upper = result["confidence_interval"]
        assert ci_lower <= ci_upper
        assert ci_lower >= 0

    def test_invalid_unit_raises(self):
        with pytest.raises(ValueError, match="No sensor readings"):
            rul_estimate(9999)
