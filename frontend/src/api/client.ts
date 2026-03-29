import type {
  FleetSummaryResponse,
  UnitStatusResponse,
  SensorHistoryResponse,
  MaintenanceLogResponse,
  TracesResponse,
  TraceEntry,
  ChatResponse,
  HealthResponse,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const API_PREFIX = BASE_URL ? "" : "/api";

export class ApiError extends Error {
  status: number;
  statusText: string;
  detail?: string;

  constructor(status: number, statusText: string, detail?: string) {
    super(detail ?? `API error: ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body.detail;
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, res.statusText, detail);
  }
  return res.json();
}

export const api = {
  getFleetSummary: (topN = 10) =>
    apiFetch<FleetSummaryResponse>(`/fleet/summary?top_n=${topN}`),

  getUnitStatus: (unitId: number) =>
    apiFetch<UnitStatusResponse>(`/units/${unitId}/status`),

  getUnitSensors: (unitId: number, nCycles = 50) =>
    apiFetch<SensorHistoryResponse>(`/units/${unitId}/sensors?n_cycles=${nCycles}`),

  getMaintenanceLog: (params?: {
    unit_id?: number;
    status?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.unit_id) query.set("unit_id", String(params.unit_id));
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    return apiFetch<MaintenanceLogResponse>(`/maintenance/log?${query}`);
  },

  getTraces: (params?: {
    unit_id?: number;
    intent?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.unit_id) query.set("unit_id", String(params.unit_id));
    if (params?.intent) query.set("intent", params.intent);
    if (params?.limit) query.set("limit", String(params.limit));
    return apiFetch<TracesResponse>(`/traces?${query}`);
  },

  getTrace: (traceId: number) => apiFetch<TraceEntry>(`/traces/${traceId}`),

  chat: (message: string, sessionId?: string) =>
    apiFetch<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  approve: (sessionId: string, approved: boolean) =>
    apiFetch<ChatResponse>(`/chat/${sessionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),

  getHealth: () => apiFetch<HealthResponse>("/health"),
};
