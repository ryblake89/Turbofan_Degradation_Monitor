# Project Phases — Agentic Industrial Equipment Monitor

## Overview

This project builds a conversational multi-agent AI system for industrial equipment health monitoring, using NASA's C-MAPSS turbofan engine degradation dataset. The system features specialized AI agents that can diagnose equipment health, plan maintenance operations, and provide fleet-wide oversight — all with human-in-the-loop approval workflows and full decision tracing.

## Phase Summary

| Phase | Description | Timeline | Priority | Key Deliverable |
|-------|-------------|----------|----------|-----------------|
| [Phase 1](phase_1_core_agentic_monitor.md) | Core Multi-Agent Monitor | ~9 days | Highest | LangGraph multi-agent system with tool routing, HITL, memory/playbooks |
| [Phase 2](phase_2_knowledge_graph_ontology.md) | Knowledge Graph Ontology | 3-5 days | High | Neo4j industrial ontology (assets, sensors, failure modes) |
| [Phase 3](phase_3_vision_pipeline.md) | Vision Pipeline (Optional) | 1-2 weeks | Low | YOLOv8 defect detection as multimodal agent tool |
| [Phase 4](phase_4_dashboard_platform.md) | React Dashboard | 1-2 weeks | Medium | Fleet health dashboard, chat UI, audit trails |

## Recommended Path

1. **Start with Phase 1** — highest ROI, closes the agentic systems gap
2. **Layer on Phase 2** — builds on existing Neo4j/GraphRAG experience, quick win
3. **Phase 4 if momentum is strong** — makes the demo visually impressive
4. **Phase 3 only if targeting vision-heavy roles** — uses a different dataset, less cohesive

## Target Tech Stack (Full Project)

| Layer | Technologies |
|-------|-------------|
| Agent Orchestration | LangGraph (multi-agent supervisor pattern) |
| LLM | Anthropic Claude API |
| Backend API | FastAPI, Python |
| Primary Database | PostgreSQL + pgvector |
| Knowledge Graph | Neo4j |
| ML Models | scikit-learn (Isolation Forest), NumPy/SciPy (RUL, FFT) |
| Vision (Phase 3) | YOLOv8 (ultralytics), OpenCV |
| Frontend (Phase 4) | React, TypeScript, Tailwind CSS, Recharts |
| Infrastructure | Docker Compose |
| Data | NASA C-MAPSS, MVTec AD (Phase 3 only) |

## JD Gap Analysis

This project was designed to close specific gaps identified against the Serious AI "AI Engineer" role. See each phase document for a detailed mapping of deliverables to JD requirements.

**Primary gap closed:** Agentic AI systems — orchestration, tool use, state management, human-in-the-loop workflows

**Secondary gaps closed:**
- Industrial ontology / knowledge graph (Phase 2)
- Memory layer with playbooks and failure pattern libraries (Phase 1)
- Operational decision surfaces and audit trails (Phase 4)
- FFT feature extraction and cross-sensor correlation (Phase 1)
- End-to-end system delivery (all phases combined)
- React frontend experience (Phase 4)
