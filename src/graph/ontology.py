"""Cypher scripts for the static industrial ontology.

Defines constraints, indexes, plant hierarchy, sensor mappings,
and failure mode nodes. All statements use MERGE for idempotency.
"""

# ── Constraints & indexes ────────────────────────────────────────────

CONSTRAINTS = [
    "CREATE CONSTRAINT engine_unit_id IF NOT EXISTS FOR (e:Engine) REQUIRE e.unit_id IS UNIQUE",
    "CREATE CONSTRAINT sensor_id IF NOT EXISTS FOR (s:Sensor) REQUIRE s.sensor_id IS UNIQUE",
    "CREATE CONSTRAINT failure_mode_name IF NOT EXISTS FOR (f:FailureMode) REQUIRE f.name IS UNIQUE",
    "CREATE CONSTRAINT subsystem_name IF NOT EXISTS FOR (s:Subsystem) REQUIRE s.name IS UNIQUE",
]

# ── Plant hierarchy ──────────────────────────────────────────────────

PLANT_HIERARCHY = """
MERGE (p:Plant {name: 'Simulated Turbofan Test Facility'})
SET p.type = 'test_facility', p.location = 'simulated'

MERGE (f:Fleet {name: 'FD001'})
SET f.engine_type = 'turbofan', f.operating_condition = 'sea_level_static'

MERGE (p)-[:HAS_FLEET]->(f)

WITH f
UNWIND ['Fan', 'LPC', 'HPC', 'Combustor', 'HPT', 'LPT'] AS sub_name
MERGE (s:Subsystem {name: sub_name})
SET s.type = CASE sub_name
    WHEN 'Fan' THEN 'fan'
    WHEN 'LPC' THEN 'compressor'
    WHEN 'HPC' THEN 'compressor'
    WHEN 'Combustor' THEN 'combustor'
    WHEN 'HPT' THEN 'turbine'
    WHEN 'LPT' THEN 'turbine'
END
"""

# ── Sensor definitions ───────────────────────────────────────────────
# Each entry: (sensor_id, symbol, description, subsystem, unit, is_constant, is_key)

SENSOR_DEFS = [
    ("sensor_1",  "T2",       "Total temperature at fan inlet",         "Fan",       "degR",  True,  False),
    ("sensor_2",  "T24",      "Total temperature at LPC outlet",        "LPC",       "degR",  False, True),
    ("sensor_3",  "T30",      "Total temperature at HPC outlet",        "HPC",       "degR",  False, True),
    ("sensor_4",  "T50",      "Total temperature at LPT outlet",        "LPT",       "degR",  False, True),
    ("sensor_5",  "P2",       "Pressure at fan inlet",                  "Fan",       "psia",  True,  False),
    ("sensor_6",  "P15",      "Total pressure in bypass-duct",          "Fan",       "psia",  True,  False),
    ("sensor_7",  "P30",      "Total pressure at HPC outlet",           "HPC",       "psia",  False, True),
    ("sensor_8",  "Nf",       "Physical fan speed",                     "Fan",       "rpm",   False, False),
    ("sensor_9",  "Nc",       "Physical core speed",                    "HPT",       "rpm",   False, False),
    ("sensor_10", "epr",      "Engine pressure ratio (P50/P2)",         "Overall",   None,    True,  False),
    ("sensor_11", "Ps30",     "Static pressure at HPC outlet",          "HPC",       "psia",  False, True),
    ("sensor_12", "phi",      "Fuel flow / Ps30 ratio",                 "HPC",       None,    False, True),
    ("sensor_13", "NRf",      "Corrected fan speed",                    "Fan",       "rpm",   False, False),
    ("sensor_14", "NRc",      "Corrected core speed",                   "HPT",       "rpm",   False, False),
    ("sensor_15", "BPR",      "Bypass ratio",                           "Fan",       None,    False, True),
    ("sensor_16", "farB",     "Burner fuel-air ratio",                  "Combustor", None,    True,  False),
    ("sensor_17", "htBleed",  "Bleed enthalpy",                         "LPC",       None,    False, False),
    ("sensor_18", "Nf_dmd",   "Demanded fan speed",                     "Fan",       "rpm",   True,  False),
    ("sensor_19", "PCNfR_dmd","Demanded corrected fan speed",           "Fan",       "rpm",   True,  False),
    ("sensor_20", "W31",      "HPT coolant bleed",                      "HPT",       "lbm/s", False, False),
    ("sensor_21", "W32",      "LPT coolant bleed",                      "LPT",       "lbm/s", False, False),
]

CREATE_SENSORS = """
UNWIND $sensors AS s
MERGE (sen:Sensor {sensor_id: s.sensor_id})
SET sen.name = s.symbol + ' \u2014 ' + s.description,
    sen.symbol = s.symbol,
    sen.unit = s.unit,
    sen.is_constant = s.is_constant,
    sen.is_key = s.is_key

WITH sen, s
MATCH (sub:Subsystem {name: s.subsystem})
MERGE (sub)-[r:MONITORED_BY]->(sen)
SET r.criticality = CASE
    WHEN s.is_key THEN 'high'
    WHEN s.is_constant THEN 'low'
    ELSE 'medium'
END
"""

# ── Failure modes ────────────────────────────────────────────────────
# (name, description, affected_subsystem, [(sensor_id, correlation_strength), ...])

FAILURE_MODE_DEFS = [
    (
        "HPC Degradation",
        "Progressive efficiency loss in high-pressure compressor",
        "HPC",
        [("sensor_3", 0.80), ("sensor_7", 0.85), ("sensor_11", 0.90),
         ("sensor_12", 0.85), ("sensor_4", 0.75)],
    ),
    (
        "Fan Degradation",
        "Bypass ratio drift indicating fan blade erosion",
        "Fan",
        [("sensor_2", 0.75), ("sensor_15", 0.80)],
    ),
    (
        "LPT Degradation",
        "LPT outlet temperature anomalous from turbine blade wear",
        "LPT",
        [("sensor_4", 0.80)],
    ),
    (
        "HPT Degradation",
        "Core speed anomalies from high-pressure turbine wear",
        "HPT",
        [("sensor_9", 0.75), ("sensor_14", 0.70)],
    ),
    (
        "Combustor Fouling",
        "Fuel flow ratio changes from combustor deposits",
        "Combustor",
        [("sensor_12", 0.70), ("sensor_14", 0.65)],
    ),
]

CREATE_FAILURE_MODES = """
UNWIND $modes AS m
MERGE (fm:FailureMode {name: m.name})
SET fm.description = m.description

WITH fm, m
MATCH (sub:Subsystem {name: m.subsystem})
MERGE (fm)-[:AFFECTS]->(sub)

WITH fm, m
UNWIND m.indicators AS ind
MATCH (sen:Sensor {sensor_id: ind.sensor_id})
MERGE (fm)-[r:INDICATED_BY]->(sen)
SET r.correlation_strength = ind.strength
"""


def sensor_params() -> list[dict]:
    """Build parameter list for CREATE_SENSORS query."""
    params = []
    for sid, sym, desc, sub, unit, const, key in SENSOR_DEFS:
        # sensor_10 maps to "Overall" which isn't a subsystem node — skip relationship
        if sub == "Overall":
            continue
        params.append({
            "sensor_id": sid,
            "symbol": sym,
            "description": desc,
            "subsystem": sub,
            "unit": unit,
            "is_constant": const,
            "is_key": key,
        })
    return params


def sensor_10_params() -> dict:
    """Return sensor_10 (epr) which has no subsystem relationship."""
    return {
        "sensor_id": "sensor_10",
        "symbol": "epr",
        "description": "Engine pressure ratio (P50/P2)",
        "unit": None,
        "is_constant": True,
        "is_key": False,
    }


CREATE_SENSOR_10 = """
MERGE (sen:Sensor {sensor_id: $sensor_id})
SET sen.name = $symbol + ' \u2014 ' + $description,
    sen.symbol = $symbol,
    sen.unit = $unit,
    sen.is_constant = $is_constant,
    sen.is_key = $is_key
"""


def failure_mode_params() -> list[dict]:
    """Build parameter list for CREATE_FAILURE_MODES query."""
    params = []
    for name, desc, sub, indicators in FAILURE_MODE_DEFS:
        params.append({
            "name": name,
            "description": desc,
            "subsystem": sub,
            "indicators": [
                {"sensor_id": sid, "strength": strength}
                for sid, strength in indicators
            ],
        })
    return params
