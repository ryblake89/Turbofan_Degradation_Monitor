"""FastAPI application — lifespan, CORS, router includes."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.memory import MemorySaver

from src.agents.graph import compile_graph
from src.api.routes import chat, fleet, health, maintenance, traces, units
from src.api.session import SessionManager
from src.tools.fleet_tools import fleet_summary

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Compile the agent graph once at startup."""
    logger.info("Compiling agent graph...")
    app.state.graph = compile_graph(checkpointer=MemorySaver())
    app.state.sessions = SessionManager()
    logger.info("Agent graph ready.")
    logger.info("Pre-computing fleet summary...")
    app.state.fleet_cache = fleet_summary(top_n=100)
    logger.info("Fleet summary cached.")
    yield


app = FastAPI(
    title="Turbofan Degradation Monitor",
    description="Multi-agent AI system for industrial turbofan engine health monitoring.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow React dev server (Phase 4) and any local tooling
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://turbofan.ryanblake.dev",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(units.router)
app.include_router(fleet.router)
app.include_router(maintenance.router)
app.include_router(traces.router)
app.include_router(health.router)
