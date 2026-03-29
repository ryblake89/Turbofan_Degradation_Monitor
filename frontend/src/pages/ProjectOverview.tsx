import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  ChevronDown,
  ChevronRight,
  Database,
  Brain,
  BarChart3,
  Server,
  Cpu,
} from "lucide-react";
import {
  SENSORS,
  SENSOR_COLORS,
  SENSOR_PHYSICS,
  type SensorMeta,
} from "@/lib/sensors";
import ArchitectureDiagram from "@/components/diagrams/ArchitectureDiagram";
import AgentFlowDiagram from "@/components/diagrams/AgentFlowDiagram";
import OntologyDiagram from "@/components/diagrams/OntologyDiagram";

// ---------------------------------------------------------------------------
// Collapsible helper
// ---------------------------------------------------------------------------
function Collapsible({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Hero (title + tagline only)
// ---------------------------------------------------------------------------
function HeroSection() {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">
        Turbofan Degradation Monitor
      </h2>
      <p className="text-lg text-muted-foreground mt-1">
        Multi-agent AI system for predictive maintenance of run-to-failure turbofan engines
      </p>
    </div>
  );
}

const HERO_STATS = [
  { label: "100 Engines", detail: "NASA C-MAPSS run-to-failure", color: "#22d3ee" },
  { label: "21 Sensors", detail: "Temperature, pressure, speed, flow", color: "#34d399" },
  { label: "9 AI Agents", detail: "LangGraph orchestration with HITL", color: "#a78bfa" },
  { label: "7 Node Types", detail: "Neo4j industrial ontology", color: "#fbbf24" },
  { label: "Full Traces", detail: "pgvector-embedded, every tool call logged", color: "#60a5fa" },
] as const;

// ---------------------------------------------------------------------------
// Section 2: The Data — NASA C-MAPSS
// ---------------------------------------------------------------------------
function sensorSignal(s: SensorMeta): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (s.isKey) return { label: "Key", variant: "default" };
  if (s.isConstant) return { label: "Constant", variant: "outline" };
  return { label: "Informative", variant: "secondary" };
}

function DataSection() {
  const sensorList = Object.values(SENSORS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          The Data — NASA C-MAPSS FD001
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats + overview text on left, engine diagram on right */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Compact stat badges */}
            <div className="flex flex-wrap gap-2">
              {HERO_STATS.map(({ label, detail, color }) => (
                <div
                  key={label}
                  className="border border-border rounded-md px-3 py-1.5 flex flex-col"
                  style={{ borderLeftWidth: "3px", borderLeftColor: color }}
                >
                  <span className="text-sm font-semibold leading-tight" style={{ color }}>
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {detail}
                  </span>
                </div>
              ))}
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">Purpose</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enable maintenance engineers to ask natural-language questions about
                fleet health and receive structured, evidence-backed recommendations
                that require human approval before any action is taken.
              </p>
            </div>

            {/* How This System Works */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">How This System Works</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The system uses Claude's structured output to extract intent and unit
                IDs, classifying into 6 types: status_check, anomaly_investigation,
                maintenance_request, fleet_overview, unit_comparison, and general.
                Deterministic paths route to specialized diagnostic, operations
                planning, or comparison agents. A general assistant uses Claude's
                native tool_use for LLM-driven tool selection on novel questions.
                Each agent executes ML tools (anomaly detection, RUL estimation,
                trend analysis), queries a Neo4j knowledge graph for failure modes
                and asset context, and returns structured recommendations with full
                evidence.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The agent graph pauses at an approval gate and resumes with the
                operator's decision. Every interaction is logged as an immutable
                decision trace with pgvector embeddings for future similarity retrieval.
              </p>
            </div>

            {/* About */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Commercial Modular Aero-Propulsion System Simulation (C-MAPSS) is a
                NASA-developed turbofan engine simulator used to generate{" "}
                <strong className="text-red-400">run-to-failure</strong>{" "}
                degradation data. FD001 is the benchmark dataset from the 2008 PHM data
                challenge: 100 engines, each running from healthy to failure under a
                single operating condition with a single fault mode (HPC degradation).
                Most research treats it as a prediction problem. This project treats it
                as an operational monitoring problem, building a system around the data
                rather than just a model.
              </p>
            </div>
          </div>

          {/* Engine diagram */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <img
                src="/images/engine-diagram.jpg"
                alt="Turbofan engine cross-section with key sensor locations"
                className="w-auto rounded"
                style={{ height: "250px" }}
              />
            </div>
            <p className="text-xs text-muted-foreground italic mt-2 text-center" style={{ maxWidth: "280px" }}>
              Turbofan cross-section with key sensor locations. 7 key sensors
              selected for degradation monitoring.
            </p>
          </div>
        </div>

        {/* Collapsible: Dataset Details */}
        <Collapsible title="Dataset Details">
          <div className="text-sm text-muted-foreground space-y-3">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-foreground">FD001 specifics:</strong>{" "}
                100 engines, 26 columns (unit_id + cycle + 3 operational
                settings + 21 sensors)
              </li>
              <li>
                <strong className="text-foreground">Single fault mode:</strong>{" "}
                HPC degradation — progressive efficiency and flow loss in the
                High Pressure Compressor
              </li>
              <li>
                <strong className="text-foreground">
                  Single operating condition:
                </strong>{" "}
                sea level (operational settings are near-constant)
              </li>
              <li>
                <strong className="text-foreground">Run-to-failure:</strong>{" "}
                training data ends at engine failure; test data ends before
                failure
              </li>
            </ul>

            {/* Sensor table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-foreground">#</th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Symbol
                    </th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Description
                    </th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Subsystem
                    </th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Unit
                    </th>
                    <th className="text-left py-2 text-foreground">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorList.map((s, i) => {
                    const sig = sensorSignal(s);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/50"
                      >
                        <td className="py-1.5 pr-3">{i + 1}</td>
                        <td className="py-1.5 pr-3 font-mono text-foreground">
                          {s.symbol}
                        </td>
                        <td className="py-1.5 pr-3">{s.description}</td>
                        <td className="py-1.5 pr-3">{s.subsystem}</td>
                        <td className="py-1.5 pr-3">{s.unit ?? "—"}</td>
                        <td className="py-1.5">
                          <Badge
                            variant={sig.variant}
                            className={
                              sig.label === "Key"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : sig.label === "Informative"
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : ""
                            }
                          >
                            {sig.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs">
              <strong className="text-foreground">Signal tiers:</strong>{" "}
              <Badge
                variant="default"
                className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-1"
              >
                Key
              </Badge>{" "}
              = 7 sensors used in RUL estimation,{" "}
              <Badge
                variant="secondary"
                className="bg-amber-500/20 text-amber-400 border-amber-500/30 mx-1"
              >
                Informative
              </Badge>{" "}
              = 7 sensors used in Isolation Forest but not RUL,{" "}
              <Badge variant="outline" className="mx-1">
                Constant
              </Badge>{" "}
              = 7 near-constant sensors in FD001's single operating condition.
            </p>

            <p>
              <strong className="text-foreground">Why FD001:</strong> single
              operating condition eliminates multivariate confounds and keeps
              the agent architecture as the focal point, not operational regime
              classification.
            </p>
          </div>
        </Collapsible>

        {/* Collapsible: Degradation Model */}
        <Collapsible title='Degradation Model (Saxena et al. 2008)'>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>The exponential health equation:</p>
            <p className="font-mono bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded text-cyan-300 text-xs">
              h(t) = 1 - d - exp{"{"} a &middot; t^b {"}"}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <code className="text-foreground">a</code> = degradation rate
                &nbsp;(range: 0.001–0.003)
              </li>
              <li>
                <code className="text-foreground">b</code> = shape exponent,
                controls onset curvature &nbsp;(range: 1.4–1.6)
              </li>
              <li>
                <code className="text-foreground">d</code> = initial wear
                offset, random per engine &nbsp;(d ≤ 1%)
              </li>
            </ul>
            <p className="text-xs">
              Separate equations for efficiency{" "}
              <code className="text-foreground">e(t)</code> and flow{" "}
              <code className="text-foreground">f(t)</code> per module.
            </p>
            <p className="text-xs">
              Health index:{" "}
              <code className="text-foreground">
                H(t) = min(mFan, mHPC, mHPT, mEGT)
              </code>{" "}
              — the minimum of normalized operational margins.
            </p>
            <p className="text-xs">
              Failure criterion:{" "}
              <code className="text-foreground">H(t) = 0</code>
            </p>
            <p className="text-xs">
              <strong className="text-foreground">Key insight:</strong> the
              margins are not in the dataset — they were hidden from PHM
              challenge participants. Any health index must be reconstructed
              from sensor readings alone. The system validates observed sensor
              degradation against this physics model by fitting exponential
              curves and reporting R&sup2; per sensor — connecting ML outputs
              back to the underlying damage propagation theory.
            </p>
          </div>
        </Collapsible>

        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
          Saxena, A., Goebel, K., Simon, D., &amp; Eklund, N. (2008).{" "}
          <em>
            Damage Propagation Modeling for Aircraft Engine Run-to-Failure
            Simulation.
          </em>{" "}
          Proceedings of the 1st International Conference on Prognostics and
          Health Management (PHM08), Denver, CO.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Degradation Physics
// ---------------------------------------------------------------------------

// Representative values from FD001 EDA
const DEGRADATION_CASCADE = [
  { sensorId: "sensor_3", symbol: "T30", direction: "↑", magnitude: "~7°R", desc: "HPC outlet temp rises (compressor works harder)" },
  { sensorId: "sensor_11", symbol: "Ps30", direction: "↓", magnitude: "~2 psia", desc: "HPC static pressure drops (flow capacity loss)" },
  { sensorId: "sensor_7", symbol: "P30", direction: "↓", magnitude: "~0.5 psia", desc: "HPC total pressure drops (pressure ratio degradation)" },
  { sensorId: "sensor_12", symbol: "phi", direction: "↑", magnitude: "~0.05", desc: "Fuel/Ps30 increases (more fuel to compensate)" },
  { sensorId: "sensor_4", symbol: "T50", direction: "↑", magnitude: "~16°R", desc: "LPT outlet temp rises (downstream thermal cascade)" },
  { sensorId: "sensor_15", symbol: "BPR", direction: "↓", magnitude: "~0.15", desc: "Bypass ratio drops (core flow disruption)" },
  { sensorId: "sensor_2", symbol: "T24", direction: "↑", magnitude: "~0.75°R", desc: "LPC outlet temp tends to increase (upstream thermal effects, weaker signal)" },
] as const;

function DegradationPhysicsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Degradation Physics — HPC Efficiency Loss
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          When HPC efficiency degrades (the sole fault mode in FD001), the
          effects cascade through the engine in predictable ways. Understanding
          this physics informed sensor selection, anomaly detection features,
          cross-sensor divergence tracking, and the knowledge graph's failure
          mode ontology. The knowledge graph's FailureMode nodes encode these
          sensor-to-subsystem relationships — when the diagnostic agent flags
          T30 and Ps30, Neo4j returns "HPC Efficiency Loss" as the matching
          failure mode with the specific sensors that indicate it.
        </p>

        {/* Degradation cascade */}
        <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-4">
          <div className="text-sm font-medium text-red-400 mb-3">
            HPC Efficiency Drops
          </div>
          {DEGRADATION_CASCADE.map(({ sensorId, symbol, direction, magnitude, desc }) => {
            const color = SENSOR_COLORS[sensorId] ?? "#888";
            const physics = SENSOR_PHYSICS[sensorId];
            const arrowColor =
              physics?.direction === "increases"
                ? "text-emerald-400"
                : "text-red-400";
            return (
              <div
                key={sensorId}
                className="flex items-start gap-3 py-1.5 pl-4 border-l-2"
                style={{ borderColor: color }}
              >
                <span className={`${arrowColor} font-mono text-sm w-4 shrink-0`}>
                  {direction}
                </span>
                <span
                  className="font-mono text-sm font-medium w-12 shrink-0"
                  style={{ color }}
                >
                  {symbol}
                </span>
                <span className="font-mono text-sm text-muted-foreground w-20 shrink-0">
                  {magnitude}
                </span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            );
          })}
        </div>

        {/* Cross-Sensor Divergence */}
        <div className="border-l-2 border-amber-500/50 pl-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-amber-400">
              Cross-Sensor Divergence
            </strong>{" "}
            — During healthy operation, physically linked sensors maintain
            stable correlations. T30 and Ps30 normally move together
            (compression raises both temperature and pressure). As HPC
            efficiency degrades, T30 rises while Ps30 drops — the correlation
            inverts. The system tracks these divergences using Pearson
            correlation against healthy baselines across 5 predefined sensor
            pairs, detecting when subsystem physics begin to decouple.
          </p>
        </div>

        {/* Collapsible: Sensor Selection Rationale */}
        <Collapsible title="Sensor Selection Rationale">
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <strong className="text-foreground">7 key sensors</strong> (T24,
              T30, T50, P30, Ps30, phi, BPR): Selected via variance analysis
              (coefficient of variation &gt; 0.001) combined with physical
              reasoning about HPC degradation effects.
            </div>
            <div>
              <strong className="text-foreground">
                7 near-constant sensors
              </strong>{" "}
              (T2, P2, P15, epr, farB, Nf_dmd, PCNfR_dmd): Near-constant in
              FD001's single operating condition. These would be informative in
              multi-condition datasets (FD002/FD004) but carry no signal here.
            </div>
            <div>
              <strong className="text-foreground">7 informative sensors</strong>{" "}
              (Nf, Nc, NRf, NRc, htBleed, W31, W32): Show degradation signals
              but are noisier or redundant with key sensors. Used in the full
              14-feature Isolation Forest but not in RUL estimation.
            </div>
            <div>
              <strong className="text-foreground">Model usage:</strong>{" "}
              Isolation Forest: 14 sensors (key + informative). RUL estimation:
              7 key sensors only. This layered approach uses broad coverage for
              anomaly detection but focused sensors for remaining life
              prediction.
            </div>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 4: System Architecture
// ---------------------------------------------------------------------------
function ArchitectureSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">System Architecture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Architecture diagram */}
        <ArchitectureDiagram />

        {/* Agent flow diagram */}
        <AgentFlowDiagram />

        {/* Why LangGraph? */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          LangGraph provides a state-machine-based agent runtime with built-in
          checkpointing, conditional routing, and human-in-the-loop interrupts.
          The graph executes as a DAG with typed state. Each node reads from
          and writes to a shared AgentState schema, enabling tools to build on
          each other's results. The{" "}
          <code className="text-foreground">interrupt()</code> primitive pauses
          graph execution at the approval gate and resumes with the user's
          decision injected as state with no external coordination service needed.
        </p>

        {/* Collapsible: Agent Details */}
        <Collapsible title="Agent Details">
          <div className="space-y-4">
            {/* AgentState schema */}
            <div className="text-xs font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto">
              <div className="text-muted-foreground">
                {"# LangGraph state shared across all agent nodes"}
              </div>
              <div className="mt-1">
                <span className="text-blue-400">class</span>{" "}
                <span className="text-foreground">AgentState</span>
                <span className="text-muted-foreground">(TypedDict):</span>
              </div>
              <div className="ml-4 space-y-0.5 mt-1">
                <div>
                  <span className="text-foreground">messages</span>
                  <span className="text-muted-foreground">
                    : Annotated[list[BaseMessage], add_messages]
                  </span>
                </div>
                <div>
                  <span className="text-foreground">current_intent</span>
                  <span className="text-muted-foreground">: str</span>
                </div>
                <div>
                  <span className="text-foreground">active_agent</span>
                  <span className="text-muted-foreground">: str</span>
                </div>
                <div>
                  <span className="text-foreground">current_unit_id</span>
                  <span className="text-muted-foreground">
                    : Optional[int]
                  </span>
                </div>
                <div>
                  <span className="text-foreground">tool_results</span>
                  <span className="text-muted-foreground">: list[dict]</span>
                </div>
                <div>
                  <span className="text-foreground">pending_action</span>
                  <span className="text-muted-foreground">
                    : Optional[dict]
                  </span>
                </div>
                <div>
                  <span className="text-foreground">requires_approval</span>
                  <span className="text-muted-foreground">: bool</span>
                </div>
                <div>
                  <span className="text-foreground">decision_trace</span>
                  <span className="text-muted-foreground">: dict</span>
                </div>
                <div>
                  <span className="text-foreground">graph_context</span>
                  <span className="text-muted-foreground">: list[dict]</span>
                </div>
              </div>
            </div>

            {/* Agent table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-foreground">
                      Agent
                    </th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Purpose
                    </th>
                    <th className="text-left py-2 pr-3 text-foreground">
                      Tools / Actions
                    </th>
                    <th className="text-left py-2 text-foreground">
                      State Written
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Supervisor
                    </td>
                    <td className="py-2 pr-3">
                      Intent classification (6 types), unit extraction
                    </td>
                    <td className="py-2 pr-3">
                      Claude structured output → routes to diagnostic, ops
                      planning, comparison, or general assistant
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → current_intent, active_agent, current_unit_id,
                      comparison_unit_ids
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Diagnostic
                    </td>
                    <td className="py-2 pr-3">
                      Equipment health assessment
                    </td>
                    <td className="py-2 pr-3">
                      anomaly_check, rul_estimate, health_index,
                      sensor_trend_analysis, graph_failure_modes,
                      graph_sensor_context
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → tool_results, graph_context
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Ops Planning
                    </td>
                    <td className="py-2 pr-3">
                      Fleet overview OR maintenance evidence + proposal
                    </td>
                    <td className="py-2 pr-3">
                      fleet_summary OR maintenance_scheduler +
                      graph_related_units + graph_maintenance_history
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → pending_action, requires_approval
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Approval Gate
                    </td>
                    <td className="py-2 pr-3">HITL decision point</td>
                    <td className="py-2 pr-3">
                      LangGraph <code>interrupt()</code> — pauses execution,
                      resumes with user's approve/reject
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → decision_trace (approval status)
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Action Executor
                    </td>
                    <td className="py-2 pr-3">
                      Executes approved maintenance
                    </td>
                    <td className="py-2 pr-3">
                      approve_maintenance() — updates maintenance_log status
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → decision_trace (action outcome)
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Comparison
                    </td>
                    <td className="py-2 pr-3">
                      Multi-unit side-by-side analysis
                    </td>
                    <td className="py-2 pr-3">
                      anomaly_check, rul_estimate, health_index per unit +
                      graph_related_units + comparison summary with deltas
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → tool_results, graph_context
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      General Assistant
                    </td>
                    <td className="py-2 pr-3">
                      LLM-driven tool selection for novel questions
                    </td>
                    <td className="py-2 pr-3">
                      Claude <code>bind_tools()</code> — 5 read-only tools
                      whitelisted, or direct domain knowledge response
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → tool_results, general_tool_calls
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Response Generator
                    </td>
                    <td className="py-2 pr-3">
                      Natural language synthesis
                    </td>
                    <td className="py-2 pr-3">
                      Claude Haiku — converts tool results + graph context into
                      structured prose
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → messages (response)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium text-foreground">
                      Trace Logger
                    </td>
                    <td className="py-2 pr-3">Immutable audit record</td>
                    <td className="py-2 pr-3">
                      Writes to PostgreSQL with pgvector embedding for future
                      similarity retrieval
                    </td>
                    <td className="py-2 font-mono text-xs">
                      → decision_trace (persisted)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Collapsible>

        {/* Collapsible: Data Flow Example */}
        <Collapsible title='Data Flow Example — End-to-End'>
          <div className="text-sm text-muted-foreground">
            <p className="mb-3 text-foreground font-medium">
              Query: "Schedule maintenance for unit 7"
            </p>
            <ol className="space-y-2 list-none">
              {[
                'User sends message → POST /chat',
                'Supervisor uses Claude structured output → classifies intent: maintenance_request, extracts unit_id: 7, sets active_agent: diagnostic',
                'Diagnostic agent runs anomaly_check(7), rul_estimate(7), health_index(7) → writes results to tool_results. Because intent=maintenance_request, Diagnostic chains to Ops Planning',
                'Ops Planning reads tool_results, queries Neo4j for related units and maintenance history → writes to graph_context',
                'Ops Planning calls maintenance_scheduler → creates proposal with evidence, sets requires_approval=true',
                'Approval Gate fires interrupt() → graph execution pauses, response sent to frontend with ApprovalCard',
                'User clicks "Approve" → POST /chat/{session}/approve → graph resumes with decision injected as state',
                'Action Executor runs approve_maintenance() → updates maintenance_log status to \'approved\'',
                'Response Generator synthesizes final message from accumulated tool_results + graph_context + approval outcome',
                'Trace Logger records full decision chain with sensor context and pgvector embedding',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 pl-2 border-l-2 border-border">
                  <span className="text-foreground font-mono text-xs w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-xs">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 5: ML Models & Methods
// ---------------------------------------------------------------------------
function MLModelsSection() {
  const models = [
    {
      title: "Anomaly Detection — Isolation Forest",
      color: "#22d3ee",
      icon: BarChart3,
      metric: "0.33 score separation between healthy and late-stage engines",
      oneLiner:
        "Detects deviation from healthy engine behavior using an unsupervised ensemble",
      details: [
        "Training: Fit on first 30% of each engine's life (healthy baseline), 14 informative sensors, StandardScaler",
        "Output: Anomaly score (0–100 normalized), top contributing sensors via permutation importance",
      ],
      designChoice:
        "Unsupervised — no failure labels needed for training. FD001 provides run-to-failure data, so supervised labels are technically available. Isolation Forest was chosen because real-world maintenance data rarely has clean failure labels — building on unsupervised methods demonstrates a production-realistic approach. Permutation importance provides per-sensor interpretability.",
    },
    {
      title: "RUL Estimation — Piecewise Linear",
      color: "#a78bfa",
      icon: BarChart3,
      metric: "MAE: 11.9 cycles at 75% engine life",
      oneLiner:
        "Estimates remaining useful life by detecting degradation onset and extrapolating to failure",
      details: [
        "Method: Two-segment regression finds knee point, normalizes current position between healthy baseline and failure threshold, bootstrap CI from cross-unit variance",
        "Output: Estimated RUL (cycles), 90% confidence interval, degradation stage, per-sensor detail",
      ],
      designChoice:
        "Piecewise linear, not LSTM — the agent architecture is the star, not the prediction model. An LSTM produces a single number with no per-sensor attribution. The piecewise approach breaks down RUL by sensor, letting the agent explain which sensors are driving the estimate and how far each has degraded — critical for maintenance decision-making.",
    },
    {
      title: "Trend Analysis — CUSUM + Rolling Statistics",
      color: "#fbbf24",
      icon: BarChart3,
      metric: "Median onset: cycle 99 (~50% of engine life)",
      oneLiner:
        "Tracks sensor behavior changes and detects degradation onset timing",
      details: [
        "Method: Rolling mean/std/slope per sensor, CUSUM change-point detection, cross-sensor Pearson divergence tracked across 5 physically-motivated pairs",
        "Output: Per-sensor rates of change, change point locations, cross-sensor divergence scores, overall trend classification",
      ],
      designChoice:
        "C-MAPSS samples once per flight cycle — not high-frequency vibration data. FFT would be meaningless. CUSUM detects persistent mean shifts, which is exactly how degradation manifests in this data.",
    },
    {
      title: "Health Index — Composite Score",
      color: "#34d399",
      icon: BarChart3,
      metric: "At EOL: 69% critical, 31% near-failure (mean HI: 26.2)",
      oneLiner:
        "Combines anomaly and RUL signals into a single 0–100 health score",
      details: [
        "Formula: 40% normalized anomaly score + 60% RUL component",
        "Labels: Healthy (≥80), Degrading (≥50), Critical (≥25), Near Failure (<25)",
      ],
      designChoice:
        "The paper's original health index used flow/efficiency margins hidden from participants. This composite reconstructs a health signal from available sensor data — 60% RUL weight because remaining life is more actionable than current anomaly state.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ML Models &amp; Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {models.map(({ title, color, metric, oneLiner, details, designChoice }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ color }}>{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="text-xs font-semibold rounded px-2 py-1 w-fit"
                  style={{ color, backgroundColor: `${color}15` }}
                >
                  {metric}
                </div>
                <p className="text-sm text-muted-foreground">{oneLiner}</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                  {designChoice}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Collapsible: Exponential Fit Quality */}
        <Collapsible title="Exponential Fit Quality">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              After computing RUL, the system fits Saxena's{" "}
              <code className="text-foreground">
                h(t) = 1 - exp{"{"} a &middot; t^b {"}"}
              </code>{" "}
              to each sensor's post-knee degradation trajectory.
            </p>
            <p>
              Reports R&sup2; per sensor — validates whether observed
              degradation follows the physics model.
            </p>
            <p>
              Thresholds: R&sup2; &gt; 0.85 = strong physics match, 0.7–0.85 =
              moderate, &lt; 0.7 = deviates from model.
            </p>
            <p>
              Sensors with R&sup2; &gt; 0.85 follow the Saxena exponential model
              closely, confirming the cascade chain (HPC efficiency → T30 → Ps30
              → phi → T50).
            </p>
          </div>
        </Collapsible>

        {/* Collapsible: Training Details */}
        <Collapsible title="Training Details">
          <div className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Healthy fraction: first 30% of each engine's life</li>
              <li>
                Isolation Forest: contamination=0.05, n_estimators=200. Anomaly
                scores calibrated to 0–100 using percentile mapping from healthy
                (p1) and degraded (p99) baselines
              </li>
              <li>
                RUL profiles: per-sensor slope distributions, mean degradation
                lengths, knee fraction statistics — all learned from the 100
                training engines
              </li>
              <li>Expected median life: 199 cycles (from EDA)</li>
              <li>
                Feature importance: permutation-based (shuffle one feature,
                measure score change)
              </li>
            </ul>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Knowledge Graph
// ---------------------------------------------------------------------------
function KnowledgeGraphSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Knowledge Graph — Neo4j Industrial Ontology
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The system uses a Neo4j knowledge graph to model the structural
          relationships between plants, fleets, engines, subsystems, sensors,
          and failure modes. This enables reasoning that relational databases
          don't express naturally: "Which failure modes match the current sensor
          pattern?", "What subsystem does this sensor monitor?", "Which other
          engines had similar degradation and what happened to them?"
        </p>

        {/* Ontology schema diagram */}
        <OntologyDiagram />

        {/* Schema property legend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">
              Relationship properties
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 text-foreground">
                    Relationship
                  </th>
                  <th className="text-left py-1.5 pr-3 text-foreground">
                    Property
                  </th>
                  <th className="text-left py-1.5 text-foreground">Values</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono">MONITORED_BY</td>
                  <td className="py-1.5 pr-3">criticality</td>
                  <td className="py-1.5">low / medium / high</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono">INDICATED_BY</td>
                  <td className="py-1.5 pr-3">correlation_strength</td>
                  <td className="py-1.5">0–1</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-mono">SIMILAR_TO</td>
                  <td className="py-1.5 pr-3">similarity_score</td>
                  <td className="py-1.5">Pearson, 0–1</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">
              WorkOrder node properties
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 text-foreground">
                    Property
                  </th>
                  <th className="text-left py-1.5 text-foreground">Values</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono">action_type</td>
                  <td className="py-1.5">inspect / service / replace</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono">urgency</td>
                  <td className="py-1.5">routine / soon / immediate</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-mono">status</td>
                  <td className="py-1.5">
                    pending / approved / rejected / completed
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Graph scale: ~134 nodes across 7 types, ~735 relationships across 8
          types
        </p>

        {/* Why Neo4j? */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          These queries are naturally graph-shaped — 2–3 hop traversals that
          would require complex JOINs in a relational database. Neo4j makes the
          query intent readable; PostgreSQL handles the tabular data (sensor
          readings, traces, maintenance log) where it excels.
        </p>

        {/* What it enables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: "Failure Mode Matching",
              desc: "Given flagged sensors, find which known failure patterns they indicate. Match strength = |flagged ∩ indicators| / |indicators|.",
            },
            {
              title: "Asset Context",
              desc: "Map any sensor to its subsystem, criticality level, and related failure modes — gives the agent structural awareness.",
            },
            {
              title: "Similar Unit Analysis",
              desc: 'Similarity scores precomputed during graph seeding, stored as SIMILAR_TO relationship properties. Top 10 similar engines retrieved via single 2-hop traversal.',
            },
            {
              title: "Maintenance History",
              desc: "Track work orders per engine — proposed, approved, rejected, completed. Feeds into the maintenance scheduler's evidence chain.",
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="border border-border rounded-lg p-3 space-y-1"
            >
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Collapsible: Sample Cypher Queries */}
        <Collapsible title="Sample Cypher Queries">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-foreground font-medium mb-1">
                Find failure modes matching flagged sensors:
              </p>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
{`MATCH (fm:FailureMode)-[r:INDICATED_BY]->(sen:Sensor)
MATCH (fm)-[:AFFECTS]->(sub:Subsystem)
WITH fm, sub, collect({
  sensor_id: sen.sensor_id,
  correlation: r.correlation_strength
}) AS indicators
RETURN fm.name, sub.name, indicators`}
              </pre>
            </div>
            <div>
              <p className="text-xs text-foreground font-medium mb-1">
                Find similar units by degradation profile:
              </p>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
{`MATCH (e:Engine {unit_id: $unit_id})-[r:SIMILAR_TO]->(other:Engine)
OPTIONAL MATCH (other)-[:HAS_MAINTENANCE]->(w:WorkOrder)
RETURN other.unit_id, r.similarity_score, other.health_index,
       collect({action: w.action_type, status: w.status}) AS maintenance
ORDER BY r.similarity_score DESC LIMIT 10`}
              </pre>
            </div>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 7: Tech Stack
// ---------------------------------------------------------------------------
function TechStackSection() {
  const groups = [
    {
      label: "Agent Runtime",
      color: "#a78bfa",
      icon: Brain,
      items: [
        {
          tech: "LangGraph ≥0.2.62",
          role: "9-node agent graph with conditional routing, state checkpointing, HITL interrupt() for approval gates",
        },
        {
          tech: "Anthropic Claude API (Claude 3.5 Haiku)",
          role: "Supervisor intent classification via structured output, response synthesis — Haiku selected for cost-efficiency in tool-calling context",
        },
      ],
    },
    {
      label: "ML / Signal Processing",
      color: "#f472b6",
      icon: BarChart3,
      items: [
        {
          tech: "scikit-learn",
          role: "Isolation Forest anomaly detection on 14-sensor feature space, permutation importance",
        },
        {
          tech: "scipy",
          role: "Exponential curve fitting for Saxena degradation model validation (R² per sensor)",
        },
        {
          tech: "NumPy / pandas",
          role: "Sensor data processing, rolling statistics, CUSUM change-point detection, cross-sensor divergence",
        },
      ],
    },
    {
      label: "Data Layer",
      color: "#22d3ee",
      icon: Database,
      items: [
        {
          tech: "PostgreSQL 16",
          role: "Sensor readings, maintenance log, decision traces",
        },
        {
          tech: "pgvector",
          role: "Embedding storage for decision trace similarity retrieval",
        },
        {
          tech: "Neo4j 5",
          role: "Knowledge graph — asset hierarchy, failure modes, similar unit analysis, maintenance history",
        },
      ],
    },
    {
      label: "Backend",
      color: "#34d399",
      icon: Server,
      items: [
        { tech: "Python 3.12", role: "Core language" },
        {
          tech: "FastAPI",
          role: "REST API — chat endpoints, fleet queries, approval workflow, decision trace retrieval",
        },
        {
          tech: "SQLAlchemy",
          role: "ORM for sensor_readings, maintenance_log, decision_traces tables",
        },
        {
          tech: "Pydantic",
          role: "Chat request/response schemas, tool result validation, maintenance proposals",
        },
      ],
    },
    {
      label: "Frontend",
      color: "#60a5fa",
      icon: Cpu,
      items: [
        {
          tech: "React 18",
          role: "Fleet overview, unit detail, agent chat, decision traces, project overview",
        },
        {
          tech: "TypeScript",
          role: "Typed API responses, sensor metadata, agent state interfaces",
        },
        {
          tech: "Tailwind CSS v4",
          role: "Dark theme, responsive layouts, utility-first styling",
        },
        {
          tech: "Recharts",
          role: "Sensor time-series charts, degradation curves, health score visualizations",
        },
        {
          tech: "shadcn/ui",
          role: "Card, Badge, Button, collapsible section components",
        },
        { tech: "Vite", role: "Build tooling and dev server" },
      ],
    },
    {
      label: "Infrastructure",
      color: "#fbbf24",
      icon: Server,
      items: [
        {
          tech: "Docker Compose",
          role: "PostgreSQL, Neo4j, and application orchestration — local development with production-equivalent topology",
        },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Tech Stack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map(({ label, color, icon: Icon, items }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
                  {label}
                </p>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {items.map(({ tech, role }) => (
                    <tr key={tech} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 font-medium text-foreground whitespace-nowrap align-top">
                        {tech}
                      </td>
                      <td className="py-1.5 text-muted-foreground">{role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          System scope: 9 agent nodes &middot; 9 tool functions &middot; 6 API
          route groups &middot; 5 Neo4j query types &middot; 4 ML models
          &middot; 5 dashboard pages
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 9: Design Decisions
// ---------------------------------------------------------------------------
const DECISIONS = [
  {
    title: "HITL via LangGraph Interrupt, Not Separate Service",
    chosen:
      "LangGraph's built-in interrupt() mechanism to pause graph execution at the approval gate",
    rejected:
      "Separate approval microservice, webhook callback, or polling loop",
    why: "Keeps approval logic inside the agent graph where it belongs. The interrupted graph resumes with the user's decision injected as state — no external coordination needed. Fewer moving parts, fewer failure modes.",
    implication:
      "Adding a new approval-required action = one conditional edge in the graph, not a new service.",
  },
  {
    title: "Neo4j for Structural Context, Not Just PostgreSQL",
    chosen:
      "Dedicated graph database for asset hierarchy, failure modes, and relationships",
    rejected: "Modeling everything in PostgreSQL with JOIN tables",
    why: 'The queries the agents need — "which failure modes match these sensor patterns?", "which similar engines had maintenance?" — are naturally graph-shaped. Neo4j makes these 2–3 hop traversals readable and performant.',
    implication:
      "Adding a new failure mode = one node + INDICATED_BY edges — agents pick it up automatically without code changes.",
  },
  {
    title: "Piecewise Linear RUL, Not LSTM",
    chosen:
      "Two-segment regression with knee-point detection and population-based extrapolation",
    rejected: "LSTM/transformer sequence models",
    why: "The agent architecture is the focal point, not prediction accuracy. Piecewise linear produces interpretable estimates that the agent can explain to an operator. An LSTM would produce a single number with no per-sensor attribution.",
    implication:
      "Upgrading to a more sophisticated model means swapping one tool function — the agent graph, approval logic, and trace pipeline remain unchanged.",
  },
  {
    title: "Structured Output for Intent Classification, Not Prompt-and-Parse",
    chosen:
      "Claude structured output with a Pydantic schema returning {intent, unit_id, unit_ids}",
    rejected: "Regex parsing of free-text LLM output, keyword matching",
    why: "Structured output guarantees type-safe routing — the supervisor's output is a validated object, not a string to be interpreted. Eliminates an entire class of parsing bugs.",
    implication:
      "Adding a new intent type = one enum value in the Pydantic schema + one routing edge — no parsing logic to update.",
  },
  {
    title: "pgvector Embeddings on Decision Traces",
    chosen:
      "Embed every decision trace for future similarity retrieval",
    rejected: "Store traces as flat rows, query by metadata only",
    why: 'Enables "find past decisions similar to this situation" — a building block for a memory/playbook layer. When a similar engine shows the same degradation pattern, the system can retrieve what was recommended last time.',
    implication:
      "Enables future similarity retrieval without schema migration — the embedding column is already populated.",
  },
  {
    title: "Composite Health Index, Not Paper's Margins",
    chosen: "40% normalized anomaly + 60% RUL, scaled 0–100",
    rejected:
      "Reconstructing the paper's min(mFan, mHPC, mHPT, mEGT) margin-based index",
    why: "The paper's health index relies on flow/efficiency margins that were explicitly hidden from dataset participants. The composite approach uses what's available: anomaly score captures current deviation, RUL captures remaining life expectancy.",
    implication:
      "The weighting is configurable — adjusting the anomaly/RUL balance requires changing two constants, not restructuring the pipeline.",
  },
  {
    title: "Sensor Trend Analysis, Not FFT",
    chosen:
      "Rolling statistics, CUSUM change-point detection, cross-sensor Pearson divergence",
    rejected: "FFT / frequency-domain analysis",
    why: "C-MAPSS samples once per flight cycle — this is cycle-level time series, not high-frequency vibration data. FFT requires hundreds of samples per period to be meaningful. CUSUM detects persistent mean shifts.",
    implication:
      "For a high-frequency dataset, FFT could be added as a separate tool without modifying the existing trend analysis.",
  },
  {
    title: "Pearson Correlation for Engine Similarity, Not DTW",
    chosen: "Simple Pearson correlation on sensor trajectories",
    rejected: "Dynamic Time Warping (DTW)",
    why: "FD001 operates under a single flight condition, so trajectories are temporally aligned by construction. DTW's time-warping capability is unnecessary and computationally expensive. Pearson correlation computes in O(n) per pair.",
    implication:
      "For multi-condition datasets (FD002/FD004), DTW could replace Pearson without changing the graph schema.",
  },
  {
    title: "REST-First Chat, Not WebSocket",
    chosen: "POST /chat with session ID, polling-style interaction",
    rejected: "WebSocket streaming",
    why: "Simpler implementation, sufficient for the interaction pattern (request → agent processes → respond). Agent response times (2–5s) don't benefit from token streaming.",
    implication:
      "If response latency increases, WebSocket streaming can be added at the API layer without changing the agent graph.",
  },
  {
    title: "Scope Discipline — Phase 3 (Vision Pipeline) Skipped",
    chosen:
      "Skip the computer vision phase, go directly from knowledge graph to dashboard",
    rejected: "Adding a vision/image analysis pipeline",
    why: "C-MAPSS is sensor time-series data — there are no images. Skipping Phase 3 kept the project's narrative coherent. For a portfolio project, narrative cohesion matters more than feature count.",
    implication: "",
  },
];

function DesignDecisionsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Design Decisions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Key architectural choices and the reasoning behind them
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {DECISIONS.map((d, i) => (
          <Collapsible key={i} title={`${i + 1}. ${d.title}`}>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Chosen:</strong> {d.chosen}
              </p>
              <p>
                <strong className="text-foreground">Rejected:</strong>{" "}
                {d.rejected}
              </p>
              <p>
                <strong className="text-foreground">Why:</strong> {d.why}
              </p>
              {d.implication && (
                <p className="text-xs italic border-l-2 border-border pl-3">
                  <strong className="text-foreground">Implication:</strong>{" "}
                  {d.implication}
                </p>
              )}
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ProjectOverview() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <DataSection />
      <DegradationPhysicsSection />
      <ArchitectureSection />
      <MLModelsSection />
      <KnowledgeGraphSection />
      <TechStackSection />
      <DesignDecisionsSection />
    </div>
  );
}
