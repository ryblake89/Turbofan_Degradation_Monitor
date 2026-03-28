"""Pydantic request/response models for the REST API."""

from pydantic import BaseModel, Field, field_validator


# ---- Chat ----

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, description="User message to send to the agent system")
    session_id: str | None = None

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message must not be blank")
        return v


class ChatResponse(BaseModel):
    session_id: str
    response: str
    intent: str
    unit_id: int | None = None
    requires_approval: bool = False
    pending_action: dict | None = None
    tool_results: list[dict] = []
    trace_id: int | None = None


class ApprovalRequest(BaseModel):
    approved: bool


# ---- Units ----

class UnitStatusResponse(BaseModel):
    unit_id: int
    health_index: float
    health_label: str
    anomaly: dict
    rul: dict


# ---- Fleet ----

class FleetSummaryResponse(BaseModel):
    total_units: int
    units_critical: int
    units_degrading: int
    units_healthy: int
    priority_list: list[dict]
    fleet_health_avg: float


# ---- Maintenance ----

class MaintenanceLogEntry(BaseModel):
    id: int
    unit_id: int
    action_type: str
    urgency: str
    status: str
    proposed_at: str | None = None
    approved_by: str | None = None
    approved_at: str | None = None
    evidence: dict | None = None
    cmms_work_order_id: str | None = None
    notes: str | None = None


class MaintenanceLogResponse(BaseModel):
    entries: list[MaintenanceLogEntry]
    total: int


# ---- Traces ----

class TraceEntry(BaseModel):
    id: int
    session_id: str | None = None
    unit_id: int | None = None
    query: str | None = None
    intent: str | None = None
    tools_called: list | None = None
    recommendation: str | None = None
    action_taken: str | None = None
    outcome: str | None = None
    sensor_context: dict | None = None
    created_at: str | None = None


class TracesResponse(BaseModel):
    traces: list[TraceEntry]
    total: int


# ---- Health ----

class HealthResponse(BaseModel):
    status: str
    database: str
    version: str = "0.1.0"
