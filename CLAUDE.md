# Turbofan Degradation Monitor

## What This Is
Multi-agent AI system for industrial equipment health monitoring. Uses NASA C-MAPSS turbofan dataset, LangGraph multi-agent orchestration, FastAPI, PostgreSQL, and Neo4j. Built as a portfolio project to demonstrate agentic AI system design.

## Project Plans
All detailed plans live in `project_phases/`. Read these before starting any phase work:
- `project_phases/README.md` — overview, phase summary, timing strategy, key design decisions
- `project_phases/phase_1_core_agentic_monitor.md` — full Phase 1 spec (architecture, tools, schema, day-by-day)
- `project_phases/phase_2_knowledge_graph_ontology.md` — Neo4j ontology layer
- `project_phases/phase_3_vision_pipeline.md` — SKIPPED (retained for reference only)
- `project_phases/phase_4_dashboard_platform.md` — React dashboard + deployment

## Git Conventions
- Never add `Co-authored-by` or any AI attribution to commits
- Keep resume (`Ryan_Blake_Resume.pdf`) and job description (`job_description.md`) out of commits — personal docs
- The `prompts/` directory is gitignored — local working notes only

## Key Design Decisions
- **Sensor trend analysis, NOT FFT** — C-MAPSS samples once per cycle (not high-frequency). Use rolling stats, change-point detection, cross-sensor divergence instead.
- **REST-first chat, NOT WebSocket** — simpler, sufficient for portfolio demo
- **Phase 3 skipped** — vision breaks narrative cohesion
- **Multi-agent, not monolithic** — supervisor routes to Diagnostic and Ops Planning sub-agents
- **Piecewise linear RUL, not LSTM** — the agent architecture is the star, not the predictive model
- **Simple Pearson correlation for engine similarity** (Phase 2) — no DTW rabbit holes

## Tech Stack
Python, LangGraph, Anthropic Claude API, FastAPI, PostgreSQL + pgvector, Neo4j, scikit-learn, React + TypeScript (Phase 4), Docker Compose
