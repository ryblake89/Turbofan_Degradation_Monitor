# Turbofan Degradation Monitor

A conversational multi-agent AI system for industrial equipment health monitoring. A maintenance engineer asks natural language questions — *"Is unit 3 degrading?"*, *"Schedule maintenance on unit 7"* — and the system routes to specialized agents, executes diagnostic tools, queries a Neo4j knowledge graph for structural context, and returns actionable answers or requests human approval for maintenance actions.

Built on NASA's C-MAPSS turbofan engine degradation dataset (FD001: 100 engines, 21 sensors, run-to-failure).

## Architecture

```
                         User Message
                              |
                         [Supervisor]
                    intent classification
                       /            \
              [Diagnostic]      [Ops Planning]
             anomaly, RUL,      fleet summary,
             health index,      maintenance
             trend analysis,    scheduling,
             + graph context    + graph context
              (Neo4j)            (Neo4j)
                    \              |
                [Response      [Approval Gate]
                Generator]     HITL interrupt
                    |           /         \
               [Trace      approve      reject
                Logger]       |            |
                    |    [Action        [Response
                   END   Executor]     Generator]
                              |            |
                         [Trace        [Trace
                          Logger]      Logger]
                              |            |
                             END          END
```

**Supervisor** classifies intent via Claude structured output and extracts the unit ID. **Diagnostic** runs rule-based tool selection (anomaly detection, RUL estimation, health index, trend analysis) and queries Neo4j for failure mode matching and sensor structural context. **Ops Planning** handles maintenance scheduling with evidence gathering and graph-based similar-unit lookup, or fleet-wide health overviews. **Approval Gate** uses LangGraph's `interrupt()` to pause for human-in-the-loop decisions. **Trace Logger** records every interaction to PostgreSQL with pgvector embeddings.

### Conversation Flows

| Intent | Route | Example |
|--------|-------|---------|
| Status check | supervisor > diagnostic > response > trace | *"How is unit 14 doing?"* |
| Anomaly investigation | supervisor > diagnostic (+trends) > response > trace | *"Unit 3 sensors look weird"* |
| Maintenance request | supervisor > diagnostic > ops_planning > approval > action > trace | *"Schedule maintenance on unit 7"* |
| Fleet overview | supervisor > ops_planning > response > trace | *"Which units need attention?"* |

## Dashboard

A React frontend surfaces equipment health, agent decisions, and audit trails across four pages.

### Fleet Overview

Health-at-a-glance for all 100 engines. A 10x10 heatmap color-codes each unit by health index (green > 60, amber 30-60, red < 30). Summary cards show fleet-wide counts (critical, degrading, healthy) and average health. A priority alert list ranks the most urgent units by RUL, anomaly score, and health index. Click any unit to drill into its detail page.

### Unit Detail

Deep diagnostics for a single engine. Four metric cards show health index, anomaly score, RUL estimate with confidence interval, and degradation stage. Below that:

- **Sensor trends** — interactive line chart of 21 sensors across the full lifecycle with time-range brush, normalize toggle, and sensor group filters (temperature, pressure, speed). Flagged sensors are highlighted.
- **Degradation curves** — each degrading sensor's position from baseline (0%) to failure threshold (100%) with knee-point markers and exponential fit R² quality badges.
- **Subsystem diagram** — engine flow path (Fan > LPC > HPC > Combustor > HPT > LPT) with flagged subsystems highlighted and sensor symbols mapped.
- **Degradation physics** — explains the HPC degradation cascade: why flagged sensors are moving and how they relate to compressor efficiency loss.
- **Maintenance history** — past work orders with status, action type, and timestamps.

### Agent Chat

Conversational interface to the multi-agent system. Type a question, get a structured response with full tool call transparency. Each tool result renders as a purpose-built card:

| Tool | Card |
|------|------|
| `anomaly_check` | Score (0-10), anomalous/normal badge, contributing sensor bars |
| `rul_estimate` | RUL cycles, confidence interval bar, sensor degradation bars, exponential fit R² badges |
| `health_index` | Compact progress bar with numeric score and health label |
| `sensor_trend_analysis` | Trend summary badge, per-sensor rates of change, CUSUM change points, cross-sensor divergence |
| `graph_failure_modes` | Matched failure modes with match strength bars, indicator sensor badges, subsystem labels |
| `graph_sensor_context` | Per-sensor subsystem, criticality, and related failure modes with correlation strengths |
| `graph_related_units` | Similar units with similarity bars, health indicators, status badges, and deep links |
| `graph_maintenance_history` | Work order timeline with action/urgency/status badges |
| `maintenance_scheduler` | Proposed action, urgency, maintenance window, evidence summary, collapsible work order draft |

When the agent proposes maintenance, an approval card appears with Approve/Reject buttons for human-in-the-loop decisions.

### Decision Traces

Audit trail of every agent interaction. Filterable by unit ID, intent, and outcome. Each trace expands to show the full sensor context snapshot, tool chain execution, LLM recommendation, and action taken. Chat messages link back to their traces.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent orchestration | LangGraph (supervisor/router pattern) |
| LLM | Anthropic Claude API (Haiku) |
| API | FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Knowledge graph | Neo4j 5 (industrial ontology — assets, sensors, failure modes) |
| Graph queries | Cypher |
| Anomaly detection | scikit-learn (Isolation Forest) |
| RUL estimation | NumPy/SciPy (piecewise linear) |
| Trend analysis | NumPy/SciPy (rolling stats, CUSUM change-point detection) |
| Decision traces | pgvector cosine similarity (384-dim numeric embeddings) |
| Frontend | React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Build tooling | Vite |
| Containerization | Docker Compose |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker and Docker Compose
- An [Anthropic API key](https://console.anthropic.com/)
- NASA C-MAPSS dataset (FD001) — download via [Kaggle](https://www.kaggle.com/datasets/behrad3d/nasa-cmaps)

### Setup

```bash
# Clone the repository
git clone https://github.com/ryblake89/Turbofan_Degradation_Monitor.git
cd Turbofan_Degradation_Monitor

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start PostgreSQL (with pgvector) and Neo4j
docker compose up -d db neo4j

# Ingest data and seed playbooks
python -m src.data.ingest
python -m src.memory.seed_playbooks

# Populate Neo4j knowledge graph
python -m src.graph.populate_ontology

# Run the API
uvicorn src.api.app:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard is available at `http://localhost:5173` and connects to the API at `http://localhost:8000`.

### Docker (full stack)

```bash
docker compose up -d
```

This starts PostgreSQL, Neo4j, and the FastAPI service. The API is available at `http://localhost:8000`.

### Run Tests

```bash
# Full suite (142 tests — uses live DB, Neo4j + Claude API)
python -m pytest tests/ -v --tb=short

# With coverage
python -m pytest tests/ -v --cov=src --cov-report=term-missing
```

## API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Send a message to the agent system |
| POST | `/chat/{session_id}/approve` | Approve or reject a pending maintenance action |
| GET | `/units/{unit_id}/status` | Unit health (no LLM cost) |
| GET | `/units/{unit_id}/sensors` | Sensor time series (query: `n_cycles`, default 50) |
| GET | `/fleet/summary?top_n=10` | Fleet-wide health overview |
| GET | `/maintenance/log?unit_id=&status=` | Maintenance history |
| GET | `/traces?unit_id=&intent=&limit=` | Decision trace log |
| GET | `/traces/{id}` | Single trace detail |
| GET | `/health` | API + database health check |

Interactive API docs available at `/docs` (Swagger UI) when the server is running.

### Example: Status Check

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How is unit 14 doing?"}'
```

```json
{
  "session_id": "sess-a1b2c3d4e5f6",
  "response": "Unit 14 is in critical condition. Health index: 5.4/100...",
  "intent": "status_check",
  "unit_id": 14,
  "requires_approval": false,
  "tool_results": [
    {"tool": "anomaly_check", "result": {"is_anomalous": true, "...": "..."}},
    {"tool": "rul_estimate", "result": {"estimated_rul": 0, "...": "..."}},
    {"tool": "health_index", "result": {"health_index": 5.4, "...": "..."}}
  ],
  "trace_id": 42
}
```

### Example: Maintenance Request (HITL)

```bash
# Step 1: Request maintenance
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Schedule maintenance on unit 7", "session_id": "my-session"}'
# Response: requires_approval=true, pending_action with proposal details

# Step 2: Approve
curl -X POST http://localhost:8000/chat/my-session/approve \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
# Response: Maintenance approved and recorded
```

## Project Structure

```
src/
  agents/           # LangGraph multi-agent system
    state.py        #   AgentState TypedDict
    supervisor.py   #   Intent classification + routing
    diagnostic.py   #   Equipment health assessment
    ops_planning.py #   Maintenance scheduling + fleet management
    response.py     #   LLM response synthesis
    approval.py     #   HITL approval gate + action executor
    trace.py        #   Decision trace logger
    graph.py        #   StateGraph wiring + compile_graph()
  api/              # FastAPI REST layer
    app.py          #   App, lifespan, CORS
    schemas.py      #   Pydantic request/response models
    session.py      #   Session management
    routes/         #   Endpoint modules (chat, units, fleet, maintenance, traces, health)
  tools/            # Tool functions (agent-model bridge)
    sensor_tools.py #   sensor_history, anomaly_check, trend_analysis, rul_estimate
    maintenance_tools.py  # scheduler, approve, reject
    fleet_tools.py  #   fleet_summary (batch scoring)
    graph_tools.py  #   graph_context_lookup (Neo4j queries)
  graph/            # Neo4j knowledge graph
    database.py     #   Neo4j driver singleton
    ontology.py     #   Cypher scripts for ontology structure
    populate_ontology.py  # Idempotent population pipeline
  memory/           # Decision trace logging
    decision_trace.py  # Logging, embedding, sensor context
  models/           # ML models
    anomaly_detector.py  # Isolation Forest
    rul_estimator.py     # Piecewise linear RUL
    trend_analyzer.py    # Rolling stats, CUSUM, cross-sensor divergence
    health_index.py      # Composite health score
  data/             # Database + ingestion
    database.py     #   SQLAlchemy engine
    ingest.py       #   C-MAPSS data loader
frontend/
  src/
    components/     # UI components (tool cards, charts, heatmap, subsystem diagram)
    hooks/          # React Query data fetching (fleet, unit, chat, traces)
    lib/            # Sensor metadata, colors, physics descriptions
    pages/          # Fleet Overview, Unit Detail, Agent Chat, Decision Traces
tests/              # 142 tests (tools, memory, agents, API, graph, edge cases)
db/
  init.sql          # PostgreSQL schema + pgvector indexes
```

## Knowledge Graph

Neo4j models the industrial plant hierarchy and failure domain knowledge.

**Nodes:** Plant > Fleet > Engine (100) > Subsystem (6 per engine) > Sensor (21). Five failure modes (HPC Degradation, Fan Degradation, LPT Degradation, HPT Degradation, Combustor Fouling) link to their indicator sensors with correlation strengths. Work orders and anomaly events sync from PostgreSQL.

**Key relationships:**
- `SIMILAR_TO` — Pearson correlation on degradation-phase sensor trajectories (threshold >= 0.7). Enables learning from peer units: *"Unit 74 is 79% similar and had HPC replacement."*
- `INDICATED_BY` — Failure modes link to indicator sensors with correlation strength. Enables diagnosis: *"sensor_11 (Ps30) + sensor_12 (phi) flagged — matches HPC Degradation at 85% confidence."*
- `MONITORED_BY` — Sensors link to subsystems with criticality levels (high/medium/low).

Agents query the graph for contextual reasoning but continue with core diagnostics if Neo4j is unavailable (graceful degradation).

## License

This project is for portfolio and educational purposes.
