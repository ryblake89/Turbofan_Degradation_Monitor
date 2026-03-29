import type { ChatMessage } from "@/hooks/useAgentChat";
import type { PendingAction, ToolResult } from "@/types";

// ---------------------------------------------------------------------------
// Pipeline nodes
// ---------------------------------------------------------------------------
export const PIPELINE_NODES = [
  "supervisor",
  "diagnostic",
  "ops_planning",
  "approval_gate",
  "action_executor",
  "trace_logger",
] as const;

export type PipelineNode = (typeof PIPELINE_NODES)[number];

// ---------------------------------------------------------------------------
// Replay step definition
// ---------------------------------------------------------------------------
export interface ReplayStep {
  type:
    | "user_typing"
    | "routing"
    | "thinking"
    | "assistant"
    | "tool_card"
    | "approval_show"
    | "approval_pause"
    | "approval_click"
    | "confirmation"
    | "completion"
    | "end";
  delay: number;
  message?: ChatMessage;
  thinkingLabel?: string;
  activeNode?: PipelineNode | null;
  completedNodes?: PipelineNode[];
  annotation?: string;
  toolIndex?: number;
}

// ---------------------------------------------------------------------------
// Hardcoded tool results
// ---------------------------------------------------------------------------
const ANOMALY_RESULT: Record<string, unknown> = {
  unit_id: 14,
  is_anomalous: true,
  anomaly_score: -3.2,
  normalized_score: 32,
  window_start_cycle: 140,
  window_end_cycle: 160,
  top_contributing_sensors: [
    { sensor: "sensor_11", contribution: 0.31 },
    { sensor: "sensor_4", contribution: 0.24 },
    { sensor: "sensor_15", contribution: 0.18 },
    { sensor: "sensor_2", contribution: 0.14 },
    { sensor: "sensor_7", contribution: 0.13 },
  ],
};

const RUL_RESULT: Record<string, unknown> = {
  unit_id: 14,
  estimated_rul: 28,
  confidence_interval: [18, 38],
  degradation_stage: "degrading",
  key_degrading_sensors: ["sensor_11", "sensor_4", "sensor_15"],
  model_type: "piecewise_linear",
  current_cycle: 160,
  sensor_detail: {
    sensor_11: {
      knee_cycle_index: 118,
      degradation_pct: 68.5,
      sensor_rul: 22,
      baseline: 47.83,
      threshold: 46.2,
      current_smoothed: 46.72,
      slope: -0.024,
    },
    sensor_4: {
      knee_cycle_index: 125,
      degradation_pct: 52.1,
      sensor_rul: 31,
      baseline: 1408.2,
      threshold: 1385.0,
      current_smoothed: 1396.1,
      slope: -0.35,
    },
    sensor_15: {
      knee_cycle_index: 130,
      degradation_pct: 41.3,
      sensor_rul: 35,
      baseline: 8.45,
      threshold: 8.12,
      current_smoothed: 8.31,
      slope: -0.004,
    },
  },
  exponential_fit: {
    sensor_11: { a: 47.9, b: -0.0015, r_squared: 0.89, physics_consistent: true, n_points_fitted: 42 },
    sensor_4: { a: 1410.0, b: -0.0008, r_squared: 0.82, physics_consistent: true, n_points_fitted: 35 },
    sensor_15: { a: 8.47, b: -0.0005, r_squared: 0.76, physics_consistent: true, n_points_fitted: 30 },
  },
};

const HEALTH_RESULT: Record<string, unknown> = {
  health_index: 38,
  health_label: "degrading",
};

const RELATED_UNITS_RESULT: Record<string, unknown> = {
  unit_id: 14,
  similar_units: [
    {
      unit_id: 19,
      similarity_score: 0.91,
      total_cycles: 195,
      status: "failed",
      health_index: null,
      maintenance_actions: [{ action_type: "service", urgency: "soon", status: "completed" }],
    },
    {
      unit_id: 42,
      similarity_score: 0.85,
      total_cycles: 178,
      status: "degrading",
      health_index: 44,
      maintenance_actions: [{ action_type: "inspect", urgency: "routine", status: "approved" }],
    },
    {
      unit_id: 67,
      similarity_score: 0.79,
      total_cycles: 210,
      status: "failed",
      health_index: null,
      maintenance_actions: [{ action_type: "replace", urgency: "immediate", status: "completed" }],
    },
  ],
};

const MAINT_HISTORY_RESULT: Record<string, unknown> = {
  unit_id: 14,
  total_work_orders: 1,
  work_orders: [
    {
      wo_id: "WO-7F3A1B2C",
      action_type: "inspect",
      urgency: "routine",
      status: "completed",
      proposed_at: "2025-11-14T10:30:00Z",
    },
  ],
};

const MAINT_SCHEDULER_RESULT: Record<string, unknown> = {
  log_id: 847,
  unit_id: 14,
  proposed_action: "service",
  urgency: "soon",
  proposed_window: "within 15 cycles",
  evidence_summary:
    "Unit 14: Health index 38/100 (degrading). Anomaly score -3.2 (anomalous). Estimated RUL 28 cycles. Key sensors flagging: sensor_11 (68.5% degraded), sensor_4 (52.1%), sensor_15 (41.3%). Similar unit 19 (0.91 similarity) failed at cycle 195 after delayed service.",
  requires_approval: true,
  cmms_work_order_draft: {
    work_order_id: "WO-E4D8F1A3",
    equipment_id: "TURBOFAN-014",
    action: "service",
    priority: "soon",
    proposed_window: "within 15 cycles",
    description:
      "Unit 14: Health index 38/100 (degrading). Anomaly score -3.2 (anomalous). Estimated RUL 28 cycles. Key sensors flagging: sensor_11, sensor_4, sensor_15. Similar unit 19 (0.91 similarity) failed at cycle 195 after delayed service.",
  },
};

// ---------------------------------------------------------------------------
// Tool results array (order matters — matches step indices 4-9)
// ---------------------------------------------------------------------------
export const TOOL_RESULTS: ToolResult[] = [
  { tool: "anomaly_check", result: ANOMALY_RESULT },
  { tool: "rul_estimate", result: RUL_RESULT },
  { tool: "health_index", result: HEALTH_RESULT },
  { tool: "graph_related_units", result: RELATED_UNITS_RESULT },
  { tool: "graph_maintenance_history", result: MAINT_HISTORY_RESULT },
  { tool: "maintenance_scheduler", result: MAINT_SCHEDULER_RESULT },
];

// ---------------------------------------------------------------------------
// Pending action for approval card
// ---------------------------------------------------------------------------
export const PENDING_ACTION: PendingAction = {
  log_id: 847,
  unit_id: 14,
  proposed_action: "service",
  urgency: "soon",
  proposed_window: "within 15 cycles",
  evidence_summary:
    "Unit 14: Health index 38/100 (degrading). Anomaly score -3.2 (anomalous). Estimated RUL 28 cycles. Key sensors flagging: sensor_11 (68.5% degraded), sensor_4 (52.1%), sensor_15 (41.3%). Similar unit 19 (0.91 similarity) failed at cycle 195 after delayed service.",
  requires_approval: true,
  cmms_work_order_draft: {
    work_order_id: "WO-E4D8F1A3",
    equipment_id: "TURBOFAN-014",
    action: "service",
    priority: "soon",
    proposed_window: "within 15 cycles",
    description:
      "Unit 14: Health index 38/100 (degrading). Anomaly score -3.2 (anomalous). Estimated RUL 28 cycles. Key sensors flagging: sensor_11, sensor_4, sensor_15. Similar unit 19 (0.91 similarity) failed at cycle 195 after delayed service.",
  },
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export const USER_TEXT = "Schedule maintenance for unit 14";

const ASSISTANT_CONTENT = `## Unit 14 \u2014 Health Assessment

**Health Index: 38/100 (Degrading)** | Anomaly Score: -3.2 (anomalous) | RUL: ~28 cycles

### Flagged Sensors
- **sensor_11** (Ps30, HPC subsystem) \u2014 68.5% degraded, sensor RUL 22 cycles
- **sensor_4** (T30, HPC subsystem) \u2014 52.1% degraded, sensor RUL 31 cycles
- **sensor_15** (BPR) \u2014 41.3% degraded, sensor RUL 35 cycles

### Knowledge Graph Context
Unit 19 (similarity 0.91) showed a nearly identical degradation pattern and **failed at cycle 195** after service was delayed. Unit 42 (similarity 0.85) is currently degrading with an approved inspection.

### Recommendation
**Service within 15 cycles.** The HPC subsystem sensors (sensor_11, sensor_4) are the primary drivers. Given unit 19\u2019s outcome, proactive service is strongly recommended to avoid progression to failure.`;

export const ASSISTANT_MSG: ChatMessage = {
  role: "assistant",
  content: ASSISTANT_CONTENT,
  intent: "maintenance_request",
  unit_id: 14,
  tool_results: TOOL_RESULTS,
  pending_action: PENDING_ACTION,
  trace_id: 42,
  timestamp: new Date(),
};

export const CONFIRMATION_MSG: ChatMessage = {
  role: "assistant",
  content:
    "Maintenance approved and recorded. Work order **WO-E4D8F1A3** for unit 14 (service) is now active. Scheduled window: within 15 cycles.",
  intent: "maintenance_request",
  unit_id: 14,
  trace_id: 42,
  timestamp: new Date(),
};

// ---------------------------------------------------------------------------
// Step sequence — delays are ms to wait BEFORE showing this step
// ---------------------------------------------------------------------------
export const REPLAY_STEPS: ReplayStep[] = [
  // Step 1: User typing (starts at 0ms)
  {
    type: "user_typing",
    delay: 0,
    activeNode: "supervisor",
    completedNodes: [],
  },
  // Step 1b: Routing micro-step
  {
    type: "routing",
    delay: 1200,
    activeNode: null,
    completedNodes: ["supervisor"],
    annotation: "Intent classified \u2192 maintenance_request",
  },
  // Step 2: Thinking — diagnostic
  {
    type: "thinking",
    delay: 400,
    thinkingLabel: "Diagnostic Agent analyzing\u2026",
    activeNode: "diagnostic",
    completedNodes: ["supervisor"],
    annotation: "ML models: anomaly, RUL, health",
  },
  // Step 3: Assistant text + badges
  {
    type: "assistant",
    delay: 1400,
    message: ASSISTANT_MSG,
    activeNode: null,
    completedNodes: ["supervisor", "diagnostic"],
  },
  // Step 4: anomaly_check card (burst)
  {
    type: "tool_card",
    delay: 400,
    toolIndex: 0,
    annotation: "Isolation Forest anomaly detection",
  },
  // Step 5: rul_estimate card (burst)
  {
    type: "tool_card",
    delay: 300,
    toolIndex: 1,
    annotation: "Piecewise linear RUL estimation",
  },
  // Step 6: health_index card (burst)
  {
    type: "tool_card",
    delay: 300,
    toolIndex: 2,
  },
  // Step 7: Agent handoff — ops planning
  {
    type: "thinking",
    delay: 300,
    thinkingLabel: "Ops Planning Agent scheduling\u2026",
    activeNode: "ops_planning",
    completedNodes: ["supervisor", "diagnostic"],
  },
  // Step 8: graph_related_units card
  {
    type: "tool_card",
    delay: 1000,
    toolIndex: 3,
    annotation: "KG: unit 19 failed with identical pattern",
  },
  // Step 9: graph_maintenance_history card
  {
    type: "tool_card",
    delay: 600,
    toolIndex: 4,
  },
  // Step 10: maintenance_scheduler card
  {
    type: "tool_card",
    delay: 600,
    toolIndex: 5,
    completedNodes: ["supervisor", "diagnostic", "ops_planning"],
    annotation: "Evidence-backed proposal",
  },
  // Step 11: Approval card entrance
  {
    type: "approval_show",
    delay: 600,
    activeNode: "approval_gate",
    completedNodes: ["supervisor", "diagnostic", "ops_planning"],
    annotation: "HITL gate \u2014 system pauses for approval",
  },
  // Step 12: Approval pause (viewer reads)
  {
    type: "approval_pause",
    delay: 800,
  },
  // Step 13: Auto-approve
  {
    type: "approval_click",
    delay: 3500,
    activeNode: "action_executor",
    completedNodes: ["supervisor", "diagnostic", "ops_planning", "approval_gate"],
  },
  // Step 14: Confirmation message (fast)
  {
    type: "confirmation",
    delay: 300,
    message: CONFIRMATION_MSG,
    activeNode: "trace_logger",
    completedNodes: ["supervisor", "diagnostic", "ops_planning", "approval_gate", "action_executor"],
    annotation: "Immutable decision trace logged",
  },
  // Step 15: Pipeline completion flourish
  {
    type: "completion",
    delay: 200,
    completedNodes: ["supervisor", "diagnostic", "ops_planning", "approval_gate", "action_executor", "trace_logger"],
  },
  // Step 16+17: End state (after hold)
  {
    type: "end",
    delay: 4500,
  },
];
