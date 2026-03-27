# Phase 2: Neo4j Industrial Ontology & Knowledge Graph

**Timeline:** 3-5 days (after Phase 1)
**Priority:** High — directly maps to JD requirement and leverages existing GraphRAG experience
**Status:** Not Started
**Depends On:** Phase 1

---

## Objective

Extend the multi-agent system with a Neo4j knowledge graph that models an industrial plant ontology — assets, sensors, subsystems, work orders, failure modes, and maintenance history. The agent queries the graph for contextual information before making recommendations, enabling richer reasoning like "this sensor belongs to the compressor subsystem, which has a known failure mode when combined with high bypass ratio drift."

## Why This Phase Matters

- Directly maps to JD line 47: "Industrial ontology / knowledge graph mapping plants, assets, sensors, work orders, materials and maintenance history"
- Directly maps to JD line 33: "Designed or contributed to ontology, knowledge graph or structured context systems grounded in real asset hierarchies and processes"
- Leverages existing Neo4j/GraphRAG experience from the Clinical Decision Support project on the resume
- Transforms the project from "agent with tools" to "agent with structured domain knowledge" — a meaningful architectural distinction

---

## Ontology Design

### Node Types

```
(:Plant {name, location, type})
  |
  +-[:HAS_FLEET]->(:Fleet {name, engine_type, operating_condition})
      |
      +-[:CONTAINS]->(:Engine {unit_id, install_date, total_cycles, status})
          |
          +-[:HAS_SUBSYSTEM]->(:Subsystem {name, type})
          |     |
          |     +-[:MONITORED_BY]->(:Sensor {sensor_id, name, unit, description, normal_range})
          |
          +-[:HAS_MAINTENANCE]->(:WorkOrder {wo_id, action_type, urgency, status, date})
          |
          +-[:EXPERIENCED]->(:AnomalyEvent {score, health_index, cycle, detected_at})

(:FailureMode {name, description, affected_subsystems, sensor_signatures})
  |
  +-[:AFFECTS]->(:Subsystem)
  +-[:INDICATED_BY]->(:Sensor)
  +-[:PRECEDED_BY]->(:SensorPattern {pattern_type, description, typical_lead_time})
```

### Relationship Types

| Relationship | From | To | Properties |
|---|---|---|---|
| HAS_FLEET | Plant | Fleet | - |
| CONTAINS | Fleet | Engine | position |
| HAS_SUBSYSTEM | Engine | Subsystem | - |
| MONITORED_BY | Subsystem | Sensor | criticality |
| HAS_MAINTENANCE | Engine | WorkOrder | - |
| EXPERIENCED | Engine | AnomalyEvent | - |
| AFFECTS | FailureMode | Subsystem | severity |
| INDICATED_BY | FailureMode | Sensor | correlation_strength |
| PRECEDED_BY | FailureMode | SensorPattern | typical_lead_time_cycles |
| SIMILAR_TO | Engine | Engine | similarity_score (Pearson correlation on degrading sensors 4, 11, 12) |

### Mapping C-MAPSS to the Ontology

The C-MAPSS dataset maps naturally to this hierarchy:

- **Plant:** "Simulated Turbofan Test Facility"
- **Fleets:** FD001, FD002, FD003, FD004 (each sub-dataset = one fleet with different operating conditions)
- **Engines:** The ~100 units per sub-dataset
- **Subsystems:** Fan, Low-Pressure Compressor (LPC), High-Pressure Compressor (HPC), Combustor, High-Pressure Turbine (HPT), Low-Pressure Turbine (LPT)
- **Sensors:** The 21 sensors mapped to their respective subsystems:
  - Fan: sensor_1 (fan inlet temp), sensor_15 (bypass ratio)
  - LPC: sensor_3 (LPC outlet temp), sensor_17 (bleed enthalpy)
  - HPC: sensor_4 (HPC outlet temp), sensor_11 (HPC outlet pressure), sensor_12 (fuel flow ratio)
  - HPT: sensor_7 (LPT outlet temp)
  - etc.

### Failure Modes (Synthetic but Realistic)

| Failure Mode | Affected Subsystem | Indicator Sensors | Description |
|---|---|---|---|
| HPC Degradation | HPC | 4, 11, 12 | Progressive efficiency loss in high-pressure compressor |
| Fan Degradation | Fan | 1, 2, 15 | Bypass ratio drift indicating fan blade erosion |
| Turbine Wear | HPT/LPT | 7, 8, 13 | Temperature anomalies from turbine blade wear |
| Combustor Fouling | Combustor | 9, 14, 12 | Fuel flow ratio changes from combustor deposits |

---

## New Agent Tool: Graph Context Lookup

```python
def graph_context_lookup(unit_id: int, query_type: str) -> dict:
    """
    Queries Neo4j for contextual information about a unit.

    query_types:
        "asset_hierarchy" - full path: plant -> fleet -> engine -> subsystems -> sensors
        "failure_modes"   - known failure modes for this engine's subsystems
        "maintenance_history" - past work orders and outcomes
        "related_units"   - similar engines that have experienced similar patterns
        "sensor_context"  - what subsystem a sensor belongs to, normal ranges, related failure modes

    Output varies by query_type but always includes structured graph data.
    """
```

### Integration with Existing Agents

The graph context tool is added to **both** sub-agents:

- **Diagnostic Agent** uses it to enrich anomaly explanations: "Sensor 11 (HPC outlet pressure) is flagged — this sensor is associated with the HPC Degradation failure mode, which also involves sensors 4 and 12. Checking those now..."
- **Operations Planning Agent** uses it to find related units and historical context: "Unit 19, which is in the same fleet and operating condition, showed this same pattern and was successfully serviced at cycle 158."

### Enhanced Conversation Flow

```
User: "Why is unit 7 flagging?"

Before Phase 2 (Phase 1 only):
  -> "Unit 7 has an anomaly score of -0.73. Sensors 11 and 12 are the
     top contributors."

After Phase 2 (with graph context):
  -> "Unit 7 has an anomaly score of -0.73. The flagged sensors (11: HPC
     outlet pressure, 12: fuel flow ratio) both monitor the High-Pressure
     Compressor subsystem. This pattern matches the known HPC Degradation
     failure mode. Unit 19 in the same fleet experienced identical sensor
     signatures and required compressor service at cycle 163. Unit 7 is
     currently at cycle 148. Recommend scheduling HPC inspection within
     15 cycles."
```

---

## Data Population

### Script: `populate_ontology.py`

1. Create the plant hierarchy (static, run once)
2. Map C-MAPSS units to engine nodes
3. Map sensors to subsystems based on turbofan engineering docs
4. Create failure mode nodes with sensor associations
5. Link existing anomaly events and maintenance logs from Phase 1 PostgreSQL tables
6. Compute engine similarity relationships based on degradation patterns

Estimated effort: half a day. The schema is synthetic but the sensor mappings are grounded in real turbofan engineering.

> **Rabbit-hole warning:** The SIMILAR_TO relationship needs a clear, simple similarity definition. Use Pearson correlation on the key degrading sensors (4, 11, 12) during the degradation phase of each unit's life. Do not invest time in Dynamic Time Warping (DTW), learned embeddings, or other complex similarity measures — simple correlation is sufficient and keeps this phase on schedule.

---

## Day-by-Day Plan

### Day 1: Neo4j Setup + Ontology Design
- [ ] Add Neo4j to Docker Compose
- [ ] Finalize ontology schema (nodes, relationships, properties)
- [ ] Write Cypher creation scripts for the static hierarchy
- [ ] Populate plant, fleet, subsystem, sensor, and failure mode nodes

### Day 2: Data Population + Graph Queries
- [ ] Write `populate_ontology.py` to sync C-MAPSS data into graph
- [ ] Link anomaly events and maintenance logs to graph nodes
- [ ] Compute and store engine similarity relationships (simple Pearson correlation on sensors 4, 11, 12 during degradation phase — do NOT rabbit-hole into DTW or complex similarity metrics)
- [ ] Write and test Cypher queries for each `query_type`

### Day 3: Agent Integration
- [ ] Implement `graph_context_lookup()` tool
- [ ] Add tool to both diagnostic and ops planning agents
- [ ] Update agent prompts to leverage graph context in responses
- [ ] Update supervisor routing to include graph-enriched flows

### Day 4: Testing + Polish
- [ ] Integration tests: verify graph-enriched responses are meaningfully better
- [ ] Edge cases: units with no graph context, new failure modes
- [ ] Update README and architecture diagram
- [ ] Notebook showing graph traversal examples

### Day 5 (if needed): Refinement
- [ ] Tune graph queries for performance
- [ ] Add graph visualization exports (for Phase 4 dashboard)
- [ ] Expand failure mode catalog

---

## Tech Stack Additions

| Component | Technology |
|-----------|-----------|
| Graph Database | Neo4j (Docker) |
| Python Driver | neo4j (official driver) |
| Graph Queries | Cypher |

---

## Resume Bullet (What This Phase Adds)

> Designed a Neo4j industrial ontology mapping plant hierarchies, assets, sensors, and failure modes, enabling the agent to provide context-aware maintenance recommendations grounded in real asset relationships

---

## JD Requirements Addressed

| JD Line | Requirement | How Phase 2 Addresses It |
|---------|------------|--------------------------|
| 33 | "Designed or contributed to ontology, knowledge graph or structured context systems grounded in real asset hierarchies" | Core deliverable |
| 47 | "Industrial ontology / knowledge graph mapping plants, assets, sensors, work orders, materials and maintenance history" | Full ontology implementation |
| 43 | "Context assembly from ontology and memory" | Graph context feeds into agent reasoning |
