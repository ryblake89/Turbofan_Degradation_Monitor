# Phase 4: React Dashboard & Decision Platform

**Timeline:** 1-2 weeks (after Phase 1, ideally after Phase 2)
**Priority:** Medium — impressive for demos but large time investment
**Status:** Not Started
**Depends On:** Phase 1 (Phase 2 enhances it significantly)

---

## Objective

Build a React frontend that surfaces the agent's decision traces, equipment health dashboards, alert workflows, and audit trails. This transforms the project from a CLI/API tool into a visual platform that mirrors what industrial AI companies actually ship to customers.

## Why React (Not Vue)

The Serious AI JD tech stack (line 82) lists React Native. While this is a web app (not mobile), using React:
- Adds React to the resume skills section (currently only Vue listed)
- Aligns with the JD tech stack
- React skills are more transferable across the job market

---

## Dashboard Pages

### 1. Fleet Overview (Landing Page)

```
+------------------------------------------------------------------+
| FLEET HEALTH DASHBOARD                          [Alerts: 3]      |
+------------------------------------------------------------------+
|  Fleet Health Score: 78/100    Units: 100   Critical: 3          |
+------------------------------------------------------------------+
| UNIT HEALTH MAP (heatmap grid)                                   |
| [1:92] [2:87] [3:45] [4:91] [5:88] [6:73] [7:34] ...          |
|  green  green  yellow green  green  yellow  red                  |
+------------------------------------------------------------------+
| PRIORITY ALERTS                                                  |
| ! Unit 23 — Health: 12/100 — IMMEDIATE action — 2h ago          |
| ! Unit 7  — Health: 34/100 — Service recommended — 5h ago       |
| ! Unit 41 — Health: 45/100 — Monitoring — 1d ago                |
+------------------------------------------------------------------+
| FLEET TRENDS (line chart: avg health over time)                  |
+------------------------------------------------------------------+
```

### 2. Unit Detail Page

```
+------------------------------------------------------------------+
| UNIT 7 — Health: 34/100 — Status: DEGRADING                     |
+------------------------------------------------------------------+
| SENSOR TRENDS (multi-line chart, last 100 cycles)                |
| [sensor 4] [sensor 11] [sensor 12] — flagged sensors highlighted |
+------------------------------------------------------------------+
| ANOMALY HISTORY          | RUL PREDICTION                       |
| Score timeline chart     | 23 cycles remaining                  |
| Current: -0.73           | Confidence: [18, 29]                 |
+------------------------------------------------------------------+
| SUBSYSTEM MAP (from Neo4j, if Phase 2)                           |
| Fan → LPC → [HPC !!] → Combustor → HPT → LPT                   |
| HPC flagged: sensors 4, 11, 12 anomalous                        |
+------------------------------------------------------------------+
| MAINTENANCE HISTORY      | SIMILAR UNITS                        |
| WO-0147: Service (pend)  | Unit 19: serviced @ cycle 163       |
| WO-0098: Inspect (done)  | Unit 3: replaced @ cycle 171        |
+------------------------------------------------------------------+
```

### 3. Agent Chat Interface

```
+------------------------------------------------------------------+
| AI ASSISTANT                                          [Session 4] |
+------------------------------------------------------------------+
| USER: What's wrong with unit 7?                                  |
|                                                                  |
| AGENT: Unit 7 health index is 34/100. The Diagnostic Agent       |
| identified anomalies in sensors 11 (HPC outlet pressure) and     |
| 12 (fuel flow ratio)...                                          |
|                                                                  |
| [Tool calls shown as expandable cards]                           |
| > sensor_history_lookup(unit_id=7) .................. 120ms      |
| > anomaly_check(unit_id=7) .......................... 85ms       |
| > graph_context_lookup(unit_id=7, "failure_modes") .. 45ms       |
|                                                                  |
| AGENT: I recommend scheduling an HPC inspection.                 |
| [APPROVE] [REJECT] [MODIFY]                                     |
+------------------------------------------------------------------+
| [Type a message...]                              [Send]          |
+------------------------------------------------------------------+
```

### 4. Decision Trace Viewer (Audit Trail)

```
+------------------------------------------------------------------+
| DECISION TRACES                                    [Filter] [Export]|
+------------------------------------------------------------------+
| Trace #247 | Unit 7 | maintenance_request | APPROVED | 2h ago    |
|   Intent: maintenance_request                                     |
|   Agent: ops_planning                                             |
|   Tools: anomaly_check → graph_context → playbook_retrieval      |
|          → maintenance_scheduler                                  |
|   Decision: Service HPC within 15 cycles                         |
|   Evidence: anomaly_score=-0.73, RUL=23, health=34              |
|   Similar cases: Unit 19 (serviced, resolved), Unit 3 (delayed,  |
|   failed)                                                         |
|   Outcome: APPROVED by operator                                   |
+------------------------------------------------------------------+
| Trace #246 | Fleet | fleet_overview | INFORMATIONAL | 3h ago     |
| Trace #245 | Unit 14 | status_check | INFORMATIONAL | 5h ago     |
+------------------------------------------------------------------+
```

### 5. Alert Workflow Manager

```
+------------------------------------------------------------------+
| ACTIVE ALERTS & PENDING ACTIONS                                   |
+------------------------------------------------------------------+
| PENDING APPROVAL (2)                                              |
| [ ] Unit 7 — Service HPC — proposed 2h ago — [Approve] [Reject] |
| [ ] Unit 23 — Replace unit — proposed 30m ago — [Approve] [Reject]|
+------------------------------------------------------------------+
| SCHEDULED MAINTENANCE (4)                                         |
| Unit 41 — Inspect — scheduled cycle 180 — IN 12 CYCLES          |
| Unit 12 — Service — scheduled cycle 195 — IN 27 CYCLES          |
+------------------------------------------------------------------+
| COMPLETED (last 7 days)                                           |
| Unit 19 — Service — completed — RESOLVED ✓                       |
| Unit 55 — Inspect — completed — NO ACTION NEEDED ✓               |
+------------------------------------------------------------------+
```

---

## Technical Architecture

### Frontend Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 18+ with TypeScript |
| State Management | React Query (TanStack Query) for server state |
| Routing | React Router v6 |
| Charts | Recharts or Plotly.js |
| UI Components | Tailwind CSS + shadcn/ui |
| WebSocket | Native WebSocket API for chat streaming |
| Build | Vite |

### API Integration

The React app consumes the FastAPI backend from Phase 1:

```
Frontend (React)  <-->  FastAPI Backend  <-->  LangGraph Agent
     |                       |                      |
     |-- REST: fleet,        |-- PostgreSQL          |-- Tools
     |   unit, traces        |-- Neo4j (Phase 2)     |-- LLM
     |-- WebSocket: chat     |                       |
```

### Key Frontend Components

```
src/
├── components/
│   ├── FleetHeatmap.tsx         # Unit health grid visualization
│   ├── SensorChart.tsx          # Multi-line sensor trend chart
│   ├── HealthGauge.tsx          # Circular health index display
│   ├── AgentChat.tsx            # Chat interface with tool call cards
│   ├── ToolCallCard.tsx         # Expandable tool execution detail
│   ├── ApprovalDialog.tsx       # HITL approve/reject/modify
│   ├── DecisionTraceTimeline.tsx # Trace viewer with filtering
│   ├── SubsystemDiagram.tsx     # Engine subsystem visualization
│   ├── AlertBanner.tsx          # Priority alerts strip
│   └── MaintenanceCalendar.tsx  # Scheduled maintenance view
├── pages/
│   ├── FleetOverview.tsx
│   ├── UnitDetail.tsx
│   ├── AgentAssistant.tsx
│   ├── DecisionTraces.tsx
│   └── AlertWorkflows.tsx
├── hooks/
│   ├── useFleetData.ts          # React Query hooks for fleet endpoints
│   ├── useUnitData.ts
│   ├── useAgentChat.ts          # WebSocket hook for chat
│   └── useDecisionTraces.ts
├── api/
│   └── client.ts                # Axios/fetch wrapper for FastAPI
└── types/
    └── index.ts                 # TypeScript interfaces matching API schemas
```

---

## Day-by-Day Plan

### Day 1-2: Project Setup + Fleet Overview
- [ ] Initialize React project with Vite + TypeScript
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Set up React Router with page stubs
- [ ] Build FleetHeatmap component
- [ ] Build fleet overview page with health scores and alert list
- [ ] Connect to FastAPI `/fleet/summary` endpoint

### Day 3-4: Unit Detail Page
- [ ] Build SensorChart (multi-line, zoomable)
- [ ] Build HealthGauge component
- [ ] Build SubsystemDiagram (if Phase 2 done — shows flagged subsystems)
- [ ] Maintenance history table
- [ ] Similar units sidebar
- [ ] Connect to `/units/{id}/status` and related endpoints

### Day 5-6: Agent Chat Interface
- [ ] Build AgentChat with message history
- [ ] WebSocket integration for streaming responses
- [ ] ToolCallCard — expandable cards showing tool inputs/outputs/latency
- [ ] ApprovalDialog for HITL actions
- [ ] Real-time approval flow: propose → approve/reject → execute

### Day 7-8: Decision Traces + Alert Workflows
- [ ] DecisionTraceTimeline with filtering (by unit, intent, outcome)
- [ ] Trace detail view showing full tool chain
- [ ] Alert workflow manager with pending approvals
- [ ] Maintenance calendar/schedule view

### Day 9-10: Polish + Docker
- [ ] Responsive layout refinements
- [ ] Loading states and error handling
- [ ] Add frontend to Docker Compose (nginx serving build)
- [ ] End-to-end walkthrough testing
- [ ] Screen recording of full dashboard demo

---

## Docker Compose Addition

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api
    # nginx serves the React build, proxies /api to FastAPI

  api:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - neo4j
    environment:
      - DATABASE_URL=postgresql://...
      - NEO4J_URI=bolt://neo4j:7687
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4jdata:/data
```

---

## Resume Bullet (What This Phase Adds)

> Delivered a React dashboard with real-time fleet health visualization, interactive agent chat with tool call transparency, HITL approval workflows, and full decision audit trails

---

## Combined Resume Bullet (All Phases)

> **Agentic Industrial Equipment Monitor** — *LangGraph, Claude API, FastAPI, PostgreSQL, Neo4j, React*
> - Built a multi-agent AI system with LangGraph for industrial predictive maintenance, featuring a supervisor agent orchestrating specialized Diagnostic and Operations Planning sub-agents with tool dispatch, human-in-the-loop approval gates, and decision tracing
> - Designed a memory layer with playbook retrieval for transferable failure pattern recognition across equipment units, backed by a Neo4j industrial ontology mapping assets, sensors, and maintenance history
> - Deployed end-to-end with FastAPI backend, React dashboard with alert workflows and audit trails, and Docker Compose packaging

---

## JD Requirements Addressed

| JD Line | Requirement | How Phase 4 Addresses It |
|---------|------------|--------------------------|
| 37 | "Shipped end-to-end systems from ingestion and model serving through backend services to frontend interfaces" | Full stack: data → models → API → React UI |
| 51 | "Operational decision surfaces: dashboards, alerting workflows with evidence, replanning tools and audit trails" | Core deliverable |
| 82 | Tech stack: "React Native" | React (web, not native, but same ecosystem) |
