# Phase 1: Core Multi-Agent Industrial Monitor

**Timeline:** ~9 days
**Priority:** Highest — closes the agentic systems gap across multiple target roles
**Status:** In Progress — Day 1 complete

---

## Objective

Build a conversational multi-agent AI system that acts as an industrial equipment health assistant. A maintenance engineer or plant manager asks natural language questions like "Is turbofan unit 3 showing signs of degradation?" or "Schedule preventive maintenance on unit 7 if it's trending toward failure." The system interprets the query, routes it to the appropriate specialized agent, executes the right tools, and either returns an answer or asks for human approval before taking an action.

## Why This Phase Matters

This phase alone closes the biggest gap identified across target roles: **agentic AI systems with orchestration, tool use, state management, and human-in-the-loop workflows.** It directly mirrors what Serious AI describes as "Agent runtime and orchestration," "tool dispatch, approval gates, tracing and cost controls," and "memory layer including trace storage, playbooks, and transferable failure pattern libraries."

It also ties together skills already on the resume (anomaly detection, time-series modeling, PostgreSQL, FastAPI) into a cohesive, demo-able project.

---

## Dataset: NASA C-MAPSS Turbofan Engine Degradation

- **Source:** NASA Prognostics Data Repository / Kaggle (free, no login wall)
- **Contents:** Multivariate sensor readings (21 sensors + 3 operational settings) across ~100 engine units over full operational life until failure
- **Sub-datasets:** 4 variants (FD001-FD004) with different operating conditions and fault modes
- **Use:** Sensor trajectories for degradation modeling; known failure points provide ground truth for RUL prediction

### Key Sensors (most informative per published analyses)
| Sensor | Description |
|--------|-------------|
| Sensor 2 | T2 - Total temperature at fan inlet |
| Sensor 3 | T24 - Total temperature at LPC outlet |
| Sensor 4 | T30 - Total temperature at HPC outlet |
| Sensor 7 | T50 - Total temperature at LPT outlet |
| Sensor 11 | Ps30 - Static pressure at HPC outlet |
| Sensor 12 | phi - Ratio of fuel flow to Ps30 |
| Sensor 15 | BPR - Bypass ratio |

---

## Architecture Overview

### Multi-Agent Design

The system uses a **supervisor/router pattern** with specialized sub-agents, not a single monolithic agent. This directly mirrors the JD requirement for "orchestration across Vision Quality, Predictive Maintenance and Operations Planning agents."

```
User Query
    |
    v
[Supervisor Agent] -- interprets intent, routes to specialist
    |          |
    v          v
[Diagnostic   [Operations Planning
 Agent]        Agent]
    |              |
    v              v
 Tools:         Tools:
 - sensor_history  - maintenance_scheduler
 - anomaly_check   - fleet_summary
 - rul_estimate    - playbook_retrieval
 - sensor_trend_analysis
    |              |
    v              v
[Response Generator] <-- merges results into natural language
    |
    v
(if action needed) --> [Approval Gate] --> [Action Executor]
    |
    v
[Memory / Trace Logger] -- stores decision for playbook retrieval
```

### Supervisor Agent
- Receives all user queries
- Classifies intent: status check, anomaly investigation, maintenance request, fleet overview
- Routes to the appropriate specialized agent
- Handles multi-step queries that require both agents (e.g., "check unit 7 and schedule maintenance if needed")

### Diagnostic Agent
- Specializes in equipment health assessment
- Has access to: `sensor_history_lookup`, `anomaly_check`, `rul_estimate`, `sensor_trend_analysis`
- Answers questions like: "Is unit 3 degrading?", "What's the anomaly score for unit 12?", "Which sensors are trending abnormally?"

### Operations Planning Agent
- Specializes in maintenance decisions and fleet management
- Has access to: `maintenance_scheduler`, `fleet_summary`, `playbook_retrieval`
- Answers questions like: "Schedule preventive maintenance on unit 7", "What's the fleet status?", "Have we seen this failure pattern before?"

---

## State Schema

The LangGraph `StateGraph` maintains:

```python
class AgentState(TypedDict):
    # Conversation
    messages: list[BaseMessage]       # Full conversation history
    current_intent: str               # Classified intent type
    active_agent: str                 # Which sub-agent is handling

    # Equipment Context
    current_unit_id: Optional[int]    # Unit being discussed
    recent_readings: Optional[dict]   # Latest sensor data
    anomaly_flags: Optional[dict]     # Current anomaly status
    rul_estimate: Optional[float]     # Current RUL prediction
    health_score: Optional[float]     # Composite 0-100 health index

    # Action Workflow
    pending_action: Optional[dict]    # Action awaiting approval
    action_approved: Optional[bool]   # Approval status
    requires_approval: bool           # Whether current flow needs HITL

    # Memory
    decision_trace: list[dict]        # Full trace of this interaction
    retrieved_playbooks: list[dict]   # Similar past decisions
```

---

## Tools (Detailed Specifications)

### 1. Sensor History Lookup

**Purpose:** Query PostgreSQL for recent sensor data for a given unit.

```python
def sensor_history_lookup(unit_id: int, n_cycles: int = 50) -> dict:
    """
    Returns the most recent n_cycles of sensor data for the given unit.
    Output: {
        "unit_id": int,
        "cycles": list[int],
        "readings": dict[str, list[float]],  # sensor_name -> values
        "op_settings": dict[str, list[float]],
        "total_cycles": int
    }
    """
```

- Queries `sensor_readings` table
- Returns structured dict, not raw dataframe
- Includes total cycle count for context

### 2. Anomaly Detection (Isolation Forest)

**Purpose:** Score the latest sensor window against a pre-trained healthy baseline model.

```python
def anomaly_check(unit_id: int, window_size: int = 30) -> dict:
    """
    Runs Isolation Forest on the latest sensor window.
    Output: {
        "unit_id": int,
        "is_anomalous": bool,
        "anomaly_score": float,         # -1 to 0 range (more negative = more anomalous)
        "normalized_score": float,       # 0-100 scale for readability
        "top_contributing_sensors": list[dict],  # [{sensor, contribution}, ...]
        "window_start_cycle": int,
        "window_end_cycle": int
    }
    """
```

- **Training:** Pre-train on early-life "healthy" data (first 30% of each unit's life) across all units
- **Feature importance:** Derive from isolation path lengths per feature
- **Threshold:** Configurable contamination parameter, default 0.05

### 3. Sensor Trend Analysis

**Purpose:** Compute rolling statistical features, detect change points, and track cross-sensor divergence patterns.

> **Design note:** The original plan included FFT feature extraction, but C-MAPSS data is sampled once per operational cycle — these are already-aggregated readings, not high-frequency sensor streams. Real FFT (what the JD means by line 45) operates on vibration data at kHz rates. Applying FFT to ~200 slowly-changing datapoints is analytically questionable. Rolling statistical features and cross-sensor divergence tracking are more honest and equally informative for cycle-level data.

```python
def sensor_trend_analysis(unit_id: int, window_size: int = 20, sensors: list[str] = None) -> dict:
    """
    Computes rolling statistics, detects change points, and tracks
    cross-sensor divergence for the given unit.
    Output: {
        "unit_id": int,
        "rolling_features": dict[str, dict],  # per-sensor: {mean, std, slope, rate_of_change}
        "change_points": list[dict],           # [{sensor, cycle, direction, magnitude}, ...]
        "cross_sensor_divergence": dict[str, float],  # sensor pair divergence scores
        "trend_summary": str,                  # "stable", "gradual_degradation", "accelerating"
        "window_size": int
    }
    """
```

- **Rolling statistics:** Mean, std, slope, and rate of change over configurable windows
- **Change-point detection:** Identifies the "knee" where a sensor transitions from stable to degrading (CUSUM or simple slope-change detection)
- **Cross-sensor divergence:** Pairwise correlation tracking — when sensors that normally correlate begin to diverge, it signals emerging faults (e.g., sensors 11 and 12 diverging indicates HPC efficiency loss)
- Default sensors: the 7 most informative channels
- Analytically appropriate for cycle-level C-MAPSS data

### 4. RUL Estimation (Piecewise Linear)

**Purpose:** Predict remaining useful life for a given unit.

```python
def rul_estimate(unit_id: int) -> dict:
    """
    Estimates remaining useful life using piecewise linear degradation model.
    Output: {
        "unit_id": int,
        "estimated_rul": int,           # cycles remaining
        "confidence_interval": tuple,    # (lower, upper) bounds
        "degradation_stage": str,        # "healthy", "degrading", "critical"
        "key_degrading_sensors": list[str],
        "model_type": str               # "piecewise_linear"
    }
    """
```

- **Approach:** Identify the "knee point" in sensor trajectories where degradation begins, fit a line from knee to current reading, extrapolate to failure threshold
- **Why not LSTM:** The point of the project is the agent architecture, not the predictive model. Piecewise linear is interpretable, fast, and sufficient for C-MAPSS degradation curves. Can upgrade later.
- **Confidence:** Bootstrap intervals from cross-unit degradation rate variance

### 5. Health Index Composite

**Purpose:** Normalized 0-100 score combining anomaly and RUL signals.

```python
def compute_health_index(anomaly_result: dict, rul_result: dict) -> float:
    """
    Weighted combination:
    - 40% from normalized anomaly score (inverted: higher = healthier)
    - 60% from normalized RUL (relative to expected total life)
    Returns float 0-100 where 100 = perfect health.
    """
```

- Computed internally, not a standalone tool
- Used by the fleet summary and for natural language descriptions ("Unit 7 health: 34/100 — critical")

### 6. Maintenance Scheduler (HITL)

**Purpose:** Propose maintenance actions and route through human approval.

```python
def maintenance_scheduler(
    unit_id: int,
    action_type: str,   # "inspect", "service", "replace"
    urgency: str,        # "routine", "soon", "immediate"
    evidence: dict       # anomaly scores, RUL, health index
) -> dict:
    """
    Proposes a maintenance action. Does NOT execute immediately.
    Output: {
        "unit_id": int,
        "proposed_action": str,
        "urgency": str,
        "proposed_window": str,         # e.g., "within 5 cycles"
        "evidence_summary": str,
        "requires_approval": True,
        "cmms_work_order_draft": dict   # mock CMMS integration
    }
    """
```

- **Human-in-the-loop:** The agent presents the proposal with evidence and waits for confirmation
- **On approval:** Logs to `maintenance_log` table + writes to mock CMMS connector
- **On rejection:** Agent asks for alternative instructions
- **Audit trail:** Every proposal/decision logged with full context

### 7. Fleet Summary

**Purpose:** Aggregate health status across all units.

```python
def fleet_summary(top_n: int = 10) -> dict:
    """
    Returns prioritized fleet health overview.
    Output: {
        "total_units": int,
        "units_critical": int,
        "units_degrading": int,
        "units_healthy": int,
        "priority_list": list[dict],    # top N units needing attention
        "fleet_health_avg": float       # average health index
    }
    """
```

### 8. Playbook Retrieval (Memory Layer)

**Purpose:** Retrieve similar past maintenance decisions for context.

```python
def playbook_retrieval(
    unit_id: int,
    current_context: dict  # anomaly scores, sensor patterns, etc.
) -> dict:
    """
    Searches past decision traces for similar situations.
    Output: {
        "similar_cases": list[dict],    # past decisions with outcomes
        "recommended_action": str,       # most common action in similar cases
        "confidence": float,             # based on case similarity
        "pattern_name": str              # if matches a known failure pattern
    }
    """
```

- **Storage:** Decision traces stored with embeddings in a vector store (ChromaDB or pgvector)
- **Retrieval:** Semantic similarity on the combination of sensor patterns + anomaly profiles
- **Transferable patterns:** "Unit 3 showed this exact sensor 11/12 divergence pattern 50 cycles before failure — unit 7 now shows the same pattern at cycle 142"
- Maps to JD: "transferable failure pattern libraries"

---

## Data Layer

### PostgreSQL Schema

```sql
-- Raw sensor data from C-MAPSS
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    cycle INTEGER NOT NULL,
    op_setting_1 FLOAT,
    op_setting_2 FLOAT,
    op_setting_3 FLOAT,
    sensor_1 FLOAT, sensor_2 FLOAT, sensor_3 FLOAT,
    sensor_4 FLOAT, sensor_5 FLOAT, sensor_6 FLOAT,
    sensor_7 FLOAT, sensor_8 FLOAT, sensor_9 FLOAT,
    sensor_10 FLOAT, sensor_11 FLOAT, sensor_12 FLOAT,
    sensor_13 FLOAT, sensor_14 FLOAT, sensor_15 FLOAT,
    sensor_16 FLOAT, sensor_17 FLOAT, sensor_18 FLOAT,
    sensor_19 FLOAT, sensor_20 FLOAT, sensor_21 FLOAT,
    dataset VARCHAR(10),               -- FD001, FD002, etc.
    UNIQUE(unit_id, cycle, dataset)
);

-- Maintenance actions (proposed and completed)
CREATE TABLE maintenance_log (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL,  -- inspect, service, replace
    urgency VARCHAR(20) NOT NULL,
    proposed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, completed
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    evidence JSONB,                    -- anomaly scores, RUL, health index
    cmms_work_order_id VARCHAR(50),    -- mock CMMS reference
    notes TEXT
);

-- Anomaly event log for audit trail
CREATE TABLE anomaly_events (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    cycle INTEGER NOT NULL,
    anomaly_score FLOAT,
    health_index FLOAT,
    flagged_sensors JSONB,
    detected_at TIMESTAMP DEFAULT NOW()
);

-- Decision traces for playbook/memory system
CREATE TABLE decision_traces (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    unit_id INTEGER,
    query TEXT,
    intent VARCHAR(50),
    tools_called JSONB,               -- ordered list of tools + inputs/outputs
    recommendation TEXT,
    action_taken VARCHAR(50),
    outcome VARCHAR(50),              -- approved, rejected, informational
    sensor_context JSONB,             -- snapshot of sensor state at decision time
    embedding VECTOR(384),            -- for similarity search (pgvector)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sensor_unit_cycle ON sensor_readings(unit_id, cycle);
CREATE INDEX idx_sensor_dataset ON sensor_readings(dataset);
CREATE INDEX idx_maintenance_unit ON maintenance_log(unit_id);
CREATE INDEX idx_maintenance_status ON maintenance_log(status);
CREATE INDEX idx_anomaly_unit ON anomaly_events(unit_id);
CREATE INDEX idx_traces_unit ON decision_traces(unit_id);
```

### Mock CMMS Connector

A thin abstraction layer simulating a Computerized Maintenance Management System:

```python
class MockCMMS:
    """Simulates CMMS integration for work order management."""

    def create_work_order(self, unit_id, action_type, urgency, evidence) -> str:
        """Creates a work order and returns a reference ID."""

    def get_work_order_status(self, work_order_id) -> dict:
        """Returns status of an existing work order."""

    def list_open_work_orders(self, unit_id=None) -> list[dict]:
        """Lists all open work orders, optionally filtered by unit."""
```

- Stores to PostgreSQL under the hood
- Shows understanding of enterprise integration patterns (maps to JD: "Integration connectors across ERP, CMMS, WMS")

---

## LangGraph State Graph

### Node Definitions

```
NODES:
  supervisor          - Intent classification + agent routing
  diagnostic_agent    - Equipment health assessment
  ops_planning_agent  - Maintenance and fleet management
  response_generator  - Natural language response synthesis
  approval_gate       - HITL pause point for maintenance actions
  action_executor     - Executes approved actions
  trace_logger        - Logs decision trace + updates memory

EDGES (conditional):
  START --> supervisor
  supervisor --> diagnostic_agent     (if intent: status, anomaly, investigation)
  supervisor --> ops_planning_agent   (if intent: maintenance, fleet, planning)
  supervisor --> diagnostic_agent --> ops_planning_agent  (if multi-step)
  diagnostic_agent --> response_generator
  ops_planning_agent --> response_generator
  ops_planning_agent --> approval_gate  (if action proposed)
  response_generator --> trace_logger --> END
  approval_gate --> action_executor    (if approved)
  approval_gate --> response_generator (if rejected)
  action_executor --> trace_logger --> END
```

### Conversation Flow Examples

**Example 1: Status Check**
```
User: "How is unit 14 doing?"
  -> supervisor: classifies as "status_check", routes to diagnostic_agent
  -> diagnostic_agent: calls sensor_history_lookup(14), anomaly_check(14), rul_estimate(14)
  -> response_generator: "Unit 14 health index: 72/100. No anomalies detected.
     RUL estimate: 87 cycles remaining. Currently in healthy operating range.
     Sensors 11 and 12 showing early signs of drift — worth monitoring."
  -> trace_logger: logs the interaction
```

**Example 2: Maintenance Request (HITL)**
```
User: "Schedule maintenance on unit 7, it's been acting up."
  -> supervisor: classifies as "maintenance_request", routes to diagnostic_agent first, then ops_planning_agent
  -> diagnostic_agent: calls anomaly_check(7) — confirms anomaly, score -0.73
  -> ops_planning_agent: calls playbook_retrieval(7, context) — finds 2 similar past cases
  -> ops_planning_agent: calls maintenance_scheduler(7, "service", "soon", evidence)
  -> approval_gate: "Based on the anomaly score (-0.73) and RUL estimate (23 cycles),
     I recommend a SERVICE action for Unit 7 within the next 10 cycles.
     Similar past cases (Units 3, 19) were serviced successfully at this stage.
     CMMS Work Order #WO-2024-0147 drafted. Approve? [Yes/No]"
  -> User: "Yes"
  -> action_executor: logs to maintenance_log, submits to mock CMMS
  -> trace_logger: stores full decision trace with outcome
```

**Example 3: Fleet Overview**
```
User: "What's the fleet status? Any units I should worry about?"
  -> supervisor: classifies as "fleet_overview", routes to ops_planning_agent
  -> ops_planning_agent: calls fleet_summary(top_n=5)
  -> response_generator: "Fleet overview: 89 units healthy, 8 degrading, 3 critical.
     Top priority:
     1. Unit 23 — Health: 12/100, RUL: 5 cycles, IMMEDIATE action recommended
     2. Unit 7 — Health: 34/100, RUL: 23 cycles, service recommended
     3. Unit 41 — Health: 45/100, RUL: 38 cycles, monitoring
     Want me to schedule maintenance for any of these?"
```

---

## LLM Integration

- **Provider:** Anthropic Claude API (preferred for portfolio — focus is on agent architecture, not model serving)
- **Fallback option:** OpenAI GPT-4o or llama-cpp-python for local inference
- **Three prompt roles:**
  1. **Supervisor prompt:** Classifies intent and selects agent routing
  2. **Agent prompts:** Each sub-agent has a system prompt defining its role, available tools, and response format
  3. **Response generator prompt:** Synthesizes tool outputs into natural language with appropriate detail level

### API Cost Controls

LLM API calls during development add up fast. Implement these from day 1:

- **Response caching:** Cache common queries (fleet summary, recently-checked unit status) with a TTL. Fleet summary doesn't change between sensor updates — no reason to burn tokens on repeated identical queries.
- **Hard spend limit:** Set a daily/weekly budget cap via the Anthropic API dashboard. Kill switch if costs exceed threshold.
- **Token tracking:** Log input/output tokens per request in the decision trace. This also maps to the JD's "cost controls" requirement (line 43).
- **Development mode:** For testing agent routing and tool orchestration, use a smaller/cheaper model (Haiku) or mock LLM responses. Only use the full model for integration tests and demos.

---

## API Layer (FastAPI)

```python
# Core endpoints
POST /chat              # Main conversation endpoint (REST, synchronous)
GET  /units/{id}/status # Direct unit health check
GET  /fleet/summary     # Fleet overview
GET  /maintenance/log   # Maintenance history

# Admin / Debug
GET  /traces            # Decision trace viewer
GET  /traces/{id}       # Single trace detail
GET  /health            # API health check
GET  /costs/summary     # Token usage and cost tracking
```

- **REST first, not WebSocket.** Start with synchronous POST /chat → wait → return response. WebSocket streaming adds a full layer of complexity (connection management, reconnection, error states) for minimal demo value. Upgrade to WebSocket in Phase 4 only if time permits.
- Session management via session IDs (in-memory or Redis)
- CORS configured for frontend consumption (Phase 4)

---

## Day-by-Day Plan

### Day 1: Data Foundation ✅
- [x] Download C-MAPSS dataset (FD001 to start, expand to FD002-FD004 later)
- [x] Set up PostgreSQL (Docker container with pgvector)
- [x] Design and create schema (tables above, with CHECK constraints)
- [x] Write data ingestion script (pandas + SQLAlchemy, idempotent)
- [x] Jupyter EDA notebook: sensor distributions, correlation analysis, degradation curves
- [x] Identify healthy vs. degrading operating regions
- [x] RUL ground truth validation (cross-check train vs test RUL patterns)

### Day 2: ML Models
- [ ] Train Isolation Forest on healthy baselines (first 30% of unit life)
- [ ] Validate anomaly detection against known failure trajectories
- [ ] Implement piecewise linear RUL estimator (knee detection + linear extrapolation)
- [ ] Implement sensor trend analysis (rolling stats, change-point detection, cross-sensor divergence)
- [ ] Implement health index composite (weighted anomaly + RUL)
- [ ] Model validation notebook with evaluation metrics

### Day 3: Tool Functions
- [ ] Implement `sensor_history_lookup()` with PostgreSQL queries
- [ ] Implement `anomaly_check()` wrapping the trained Isolation Forest
- [ ] Implement `sensor_trend_analysis()`
- [ ] Implement `rul_estimate()` wrapping the piecewise linear model
- [ ] Implement `maintenance_scheduler()` with mock CMMS connector
- [ ] Implement `fleet_summary()` aggregation
- [ ] Unit tests for each tool function

### Day 4: Memory Layer + Playbook System
- [ ] Set up pgvector or ChromaDB for embedding storage
- [ ] Implement `decision_trace` logging (capture full tool call chain + context)
- [ ] Implement `playbook_retrieval()` with semantic similarity search
- [ ] Seed initial playbooks from synthetic historical decisions
- [ ] Test retrieval quality: do similar sensor patterns return relevant past cases?

### Day 5-6: LangGraph Multi-Agent System
- [ ] Define `AgentState` schema
- [ ] Implement supervisor agent (intent classification + routing)
- [ ] Implement diagnostic agent (tool selection + execution)
- [ ] Implement operations planning agent (maintenance + fleet tools)
- [ ] Implement response generator node
- [ ] Implement approval gate (HITL pause/resume)
- [ ] Implement action executor node
- [ ] Wire up the full state graph with conditional edges
- [ ] Integration tests: run through all conversation flow examples

### Day 7: FastAPI + End-to-End
- [ ] FastAPI app structure
- [ ] Chat endpoint with session management
- [ ] REST endpoints for direct tool access
- [ ] Docker Compose: PostgreSQL + FastAPI + agent
- [ ] End-to-end testing: full conversation flows through the API

### Day 8: Testing + Hardening
- [ ] Edge cases: ambiguous queries, units with no data, multi-step flows
- [ ] Error handling: graceful failures when tools return unexpected results
- [ ] Decision trace completeness: verify every interaction is logged
- [ ] Approval flow: test approve, reject, and modify paths

### Day 9: Polish + Documentation
- [ ] README with architecture diagram
- [ ] Screen recording of demo interaction
- [ ] Code cleanup and docstrings on public interfaces
- [ ] GitHub repo setup (if not already pushed)

---

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Agent Orchestration | LangGraph |
| LLM | Anthropic Claude API |
| API Framework | FastAPI |
| Database | PostgreSQL + pgvector |
| Anomaly Detection | scikit-learn (Isolation Forest) |
| RUL Estimation | NumPy/SciPy (piecewise linear) |
| Trend Analysis | NumPy/SciPy (rolling stats, change-point detection) |
| Memory/Playbooks | pgvector or ChromaDB |
| Containerization | Docker Compose |
| Data Processing | pandas, SQLAlchemy |

---

## Resume Bullet (What This Phase Produces)

> Built a multi-agent AI system with LangGraph for industrial predictive maintenance, featuring a supervisor agent orchestrating specialized Diagnostic and Operations Planning sub-agents with tool dispatch, human-in-the-loop approval gates, and decision tracing

---

## JD Requirements Addressed

| JD Line | Requirement | How Phase 1 Addresses It |
|---------|------------|--------------------------|
| 27 | "Built and shipped agent systems in production with orchestration, tool use, state management and human-in-the-loop workflows" | Core deliverable |
| 29 | "Worked with physical-world data at scale" | C-MAPSS sensor data + Samsung experience |
| 41 | "Agent runtime and orchestration across... Predictive Maintenance and Operations Planning agents" | Multi-agent supervisor pattern |
| 43 | "Context assembly... tool dispatch, approval gates, tracing and cost controls" | State management, HITL, decision traces |
| 45 | "FFT feature extraction and cross-sensor correlation" | Sensor trend analysis with cross-sensor divergence tracking (FFT replaced — see design note in tool spec) |
| 49 | "Memory layer including trace storage, playbooks... transferable failure pattern libraries" | Playbook retrieval system |
| 37 | "Shipped end-to-end systems from ingestion and model serving through backend services" | Full stack: data ingestion -> models -> API |
