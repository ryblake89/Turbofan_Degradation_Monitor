// -- Chat --
export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
  intent: string;
  unit_id: number | null;
  requires_approval: boolean;
  pending_action: PendingAction | null;
  tool_results: ToolResult[];
  trace_id: number | null;
}

export interface PendingAction {
  log_id: number;
  unit_id: number;
  proposed_action: string;
  urgency: string;
  proposed_window: string;
  evidence_summary: string;
  requires_approval: boolean;
  cmms_work_order_draft: {
    work_order_id: string;
    equipment_id: string;
    action: string;
    priority: string;
    proposed_window: string;
    description: string;
  };
}

export interface ToolResult {
  tool: string;
  result?: Record<string, unknown>;
  error?: string;
}

// -- Units --
export interface UnitStatusResponse {
  unit_id: number;
  health_index: number;
  health_label: string;
  anomaly: AnomalyResult;
  rul: RulResult;
}

export interface AnomalyResult {
  unit_id: number;
  is_anomalous: boolean;
  anomaly_score: number;
  normalized_score: number;
  window_start_cycle: number;
  window_end_cycle: number;
  top_contributing_sensors: { sensor: string; contribution: number }[];
}

export interface SensorDetail {
  knee_cycle_index: number;
  degradation_pct: number;
  sensor_rul: number;
  baseline: number;
  threshold: number;
  current_smoothed: number;
  slope: number;
}

export interface ExponentialFit {
  a: number;
  b: number;
  r_squared: number;
  physics_consistent: boolean;
  n_points_fitted: number;
}

export interface RulResult {
  unit_id: number;
  estimated_rul: number;
  confidence_interval: [number, number];
  degradation_stage: string;
  key_degrading_sensors: string[];
  model_type: string;
  current_cycle: number;
  sensor_detail?: Record<string, SensorDetail>;
  exponential_fit?: Record<string, ExponentialFit>;
}

// -- Fleet --
export interface FleetSummaryResponse {
  total_units: number;
  units_critical: number;
  units_degrading: number;
  units_healthy: number;
  priority_list: PriorityUnit[];
  fleet_health_avg: number;
}

export interface PriorityUnit {
  unit_id: number;
  health_index: number;
  health_label: string;
  estimated_rul: number;
  degradation_stage: string;
  anomaly_normalized: number;
  is_anomalous: boolean;
  current_cycle: number;
}

// -- Maintenance --
export interface MaintenanceLogEntry {
  id: number;
  unit_id: number;
  action_type: string;
  urgency: string;
  status: string;
  proposed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  evidence: Record<string, unknown> | null;
  cmms_work_order_id: string | null;
  notes: string | null;
}

export interface MaintenanceLogResponse {
  entries: MaintenanceLogEntry[];
  total: number;
}

// -- Traces --
export interface TraceEntry {
  id: number;
  session_id: string | null;
  unit_id: number | null;
  query: string | null;
  intent: string | null;
  tools_called: Record<string, unknown>[] | null;
  recommendation: string | null;
  action_taken: string | null;
  outcome: string | null;
  sensor_context: Record<string, unknown> | null;
  created_at: string | null;
}

export interface TracesResponse {
  traces: TraceEntry[];
  total: number;
}

// -- Sensors --
export interface SensorHistoryResponse {
  unit_id: number;
  cycles: number[];
  readings: Record<string, number[]>;
  op_settings: Record<string, number[]>;
  total_cycles: number;
}

// -- Health --
export interface HealthResponse {
  status: string;
  database: string;
  version: string;
}
