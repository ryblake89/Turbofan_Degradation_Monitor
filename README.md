# Turbofan Degradation Monitor

A conversational multi-agent AI system for industrial equipment health monitoring. A maintenance engineer asks natural language questions — *"Is unit 3 degrading?"*, *"Schedule maintenance on unit 7"* — and the system routes to specialized agents, executes diagnostic tools, and returns actionable answers or requests human approval for maintenance actions.

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
             trend analysis     scheduling
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

**Supervisor** classifies intent via Claude structured output and extracts the unit ID. **Diagnostic** runs rule-based tool selection (anomaly detection, RUL estimation, health index, trend analysis). **Ops Planning** handles maintenance scheduling with evidence gathering and playbook retrieval, or fleet-wide health overviews. **Approval Gate** uses LangGraph's `interrupt()` to pause for human-in-the-loop decisions. **Trace Logger** records every interaction to PostgreSQL with pgvector embeddings for similar-case retrieval.

### Conversation Flows

| Intent | Route | Example |
|--------|-------|---------|
| Status check | supervisor > diagnostic > response > trace | *"How is unit 14 doing?"* |
| Anomaly investigation | supervisor > diagnostic (+trends) > response > trace | *"Unit 3 sensors look weird"* |
| Maintenance request | supervisor > diagnostic > ops_planning > approval > action > trace | *"Schedule maintenance on unit 7"* |
| Fleet overview | supervisor > ops_planning > response > trace | *"Which units need attention?"* |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent orchestration | LangGraph (supervisor/router pattern) |
| LLM | Anthropic Claude API (Haiku) |
| API | FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Anomaly detection | scikit-learn (Isolation Forest) |
| RUL estimation | NumPy/SciPy (piecewise linear) |
| Trend analysis | NumPy/SciPy (rolling stats, CUSUM change-point detection) |
| Memory / playbooks | pgvector cosine similarity (384-dim numeric embeddings) |
| Containerization | Docker Compose |

## Quick Start

### Prerequisites

- Python 3.12+
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

# Start PostgreSQL (with pgvector)
docker compose up -d db

# Ingest data and seed playbooks
python -m src.data.ingest
python -m src.memory.seed_playbooks

# Run the API
uvicorn src.api.app:app --reload --port 8000
```

### Docker (full stack)

```bash
docker compose up -d
```

This starts both PostgreSQL and the FastAPI service. The API is available at `http://localhost:8000`.

### Run Tests

```bash
# Full suite (102 tests, ~170s — uses live DB + Claude API)
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
    {"tool": "anomaly_check", "result": {"is_anomalous": true, ...}},
    {"tool": "rul_estimate", "result": {"estimated_rul": 0, ...}},
    {"tool": "health_index", "result": {"health_index": 5.4, ...}}
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
  memory/           # Decision trace + playbook retrieval
    decision_trace.py  # Logging, embedding, sensor context
    playbook.py     #   pgvector similarity search + failure pattern matching
  models/           # ML models
    anomaly_detector.py  # Isolation Forest
    rul_estimator.py     # Piecewise linear RUL
    trend_analyzer.py    # Rolling stats, CUSUM, cross-sensor divergence
    health_index.py      # Composite health score
  data/             # Database + ingestion
    database.py     #   SQLAlchemy engine
    ingest.py       #   C-MAPSS data loader
tests/              # 102 tests (tools, memory, agents, API, edge cases)
db/
  init.sql          # PostgreSQL schema + pgvector indexes
```

## Roadmap

This project is built in phases. Phase 1 is complete.

### Phase 1: Core Multi-Agent Monitor (complete)

The conversational agent system described above — LangGraph orchestration, diagnostic tools, HITL maintenance approval, decision trace memory, REST API, Docker deployment, 102 tests.

### Phase 2: Knowledge Graph Ontology (planned)

Neo4j knowledge graph modeling the industrial plant hierarchy: plants, fleets, engines, subsystems, sensors, failure modes, work orders. The agent queries the graph for contextual reasoning — *"this sensor belongs to the HPC subsystem, which has a known failure mode when combined with high bypass ratio drift."*

### Phase 4: React Dashboard (planned)

Fleet health dashboard, unit detail pages, chat interface with HITL approval UI, decision trace audit trail. React + TypeScript frontend consuming the existing REST API.

## License

This project is for portfolio and educational purposes.
