# Project Phases — Agentic Industrial Equipment Monitor

## Overview

This project builds a conversational multi-agent AI system for industrial equipment health monitoring, using NASA's C-MAPSS turbofan engine degradation dataset. The system features specialized AI agents that can diagnose equipment health, plan maintenance operations, and provide fleet-wide oversight — all with human-in-the-loop approval workflows and full decision tracing.

## Phase Summary

| Phase | Description | Timeline | Priority | Key Deliverable |
|-------|-------------|----------|----------|-----------------|
| [Phase 1](phase_1_core_agentic_monitor.md) | Core Multi-Agent Monitor | ~9 days | Highest | LangGraph multi-agent system with tool routing, HITL, memory/playbooks |
| [Phase 2](phase_2_knowledge_graph_ontology.md) | Knowledge Graph Ontology | 3-5 days | High | Neo4j industrial ontology (assets, sensors, failure modes) |
| [Phase 3](phase_3_vision_pipeline.md) | ~~Vision Pipeline~~ | ~~1-2 weeks~~ | **Skip** | Retained for reference — breaks narrative cohesion, time better spent elsewhere |
| [Phase 4](phase_4_dashboard_platform.md) | React Dashboard + Deployment | ~2 weeks | Medium | Fleet health dashboard, chat UI, audit trails, live deployment |

## Recommended Path

1. **Start with Phase 1** — highest ROI, closes the agentic systems gap
2. **Layer on Phase 2** — builds on existing Neo4j/GraphRAG experience, quick win
3. **Phase 4 for visual impact** — makes the demo shareable and impressive
4. ~~Phase 3~~ — **Skip.** If vision comes up in interviews, explain the extensible architecture (see Phase 3 doc for interview framing)

## Timing Strategy

> **If actively applying now:** Prioritize Phase 1 → quick Phase 2 → minimal Phase 4 (Fleet Overview + Agent Chat only, skip Traces page). A working agent with a basic UI beats a polished dashboard with no agent behind it.
>
> **If building over weeks/weekends:** Follow the full path. Budget ~9 days for Phase 1, ~4 days for Phase 2, ~2 weeks for Phase 4. Double all estimates if doing this alongside a full-time job.
>
> **The "production" framing:** This is a portfolio project, not a production system. In interviews, say "designed and built" rather than "shipped to production." Bridge to Samsung: *"I've shipped ML to production at Samsung — ARIMA models, Isolation Forest anomaly detection, all on K8s. This project demonstrates the agentic architecture patterns I haven't had the chance to build in that environment."*

## Target Tech Stack (Full Project)

| Layer | Technologies |
|-------|-------------|
| Agent Orchestration | LangGraph (multi-agent supervisor pattern) |
| LLM | Anthropic Claude API |
| Backend API | FastAPI, Python |
| Primary Database | PostgreSQL + pgvector |
| Knowledge Graph | Neo4j |
| ML Models | scikit-learn (Isolation Forest), NumPy/SciPy (RUL, trend analysis) |
| Frontend (Phase 4) | React, TypeScript, Tailwind CSS, Recharts |
| Infrastructure | Docker Compose, deployed to Railway/Fly.io |
| Data | NASA C-MAPSS |

## JD Gap Analysis

This project was designed to close specific gaps identified against the Serious AI "AI Engineer" role. See each phase document for a detailed mapping of deliverables to JD requirements.

**Primary gap closed:** Agentic AI systems — orchestration, tool use, state management, human-in-the-loop workflows

**Secondary gaps closed:**
- Industrial ontology / knowledge graph (Phase 2)
- Memory layer with playbooks and failure pattern libraries (Phase 1)
- Operational decision surfaces and audit trails (Phase 4)
- Cross-sensor divergence tracking and trend analysis (Phase 1)
- End-to-end system delivery with live deployment (all phases combined)
- React frontend experience (Phase 4)
- API cost controls and token tracking (Phase 1)

**Gaps this project cannot close:**
- "Early engineer at a VC-backed startup" — biographical, not demonstrable via a project
- Video/RTSP processing at scale — Phase 3 skipped; architecture is extensible if needed later
- Production shipping — bridge to Samsung production ML work in interviews

## Key Design Decisions (Post-Review)

| Decision | Rationale |
|----------|-----------|
| Sensor trend analysis instead of FFT | C-MAPSS samples once per cycle — not high-frequency data. Rolling stats + cross-sensor divergence is analytically honest for this data resolution |
| REST-first chat, not WebSocket | Reduces complexity; agent response time is dominated by LLM inference, not transport |
| Skip Phase 3 (Vision) | Breaks narrative cohesion; MVTec is wrong dataset for YOLO; time better spent on Phases 1+2+4 |
| Cut Alert Workflow page (Phase 4) | Overlaps with Fleet Overview alerts; 4 pages sufficient for demo |
| Simple Pearson correlation for engine similarity | Avoids DTW/embedding rabbit holes; sufficient for demonstrating the pattern |
| Deploy to cloud, not just Docker locally | Shareable URL is dramatically more impactful than "clone and run" |
