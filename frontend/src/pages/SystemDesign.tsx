import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Database, Brain, BarChart3, Server, Cpu } from "lucide-react";
import ArchitectureDiagram from "@/components/diagrams/ArchitectureDiagram";
import AgentFlowDiagram from "@/components/diagrams/AgentFlowDiagram";
import OntologyDiagram from "@/components/diagrams/OntologyDiagram";
import Collapsible from "@/components/ui/Collapsible";
import { usePageTitle } from "@/hooks/usePageTitle";

// ---------------------------------------------------------------------------
// Architecture Section
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
                    <th className="text-left py-2 pr-3 text-foreground">Agent</th>
                    <th className="text-left py-2 pr-3 text-foreground">Purpose</th>
                    <th className="text-left py-2 pr-3 text-foreground">Tools / Actions</th>
                    <th className="text-left py-2 text-foreground">State Written</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Supervisor</td>
                    <td className="py-2 pr-3">Intent classification (6 types), unit extraction</td>
                    <td className="py-2 pr-3">Claude structured output &rarr; routes to diagnostic, ops planning, comparison, or general assistant</td>
                    <td className="py-2 font-mono text-xs">&rarr; current_intent, active_agent, current_unit_id, comparison_unit_ids</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Diagnostic</td>
                    <td className="py-2 pr-3">Equipment health assessment</td>
                    <td className="py-2 pr-3">anomaly_check, rul_estimate, health_index, sensor_trend_analysis, graph_failure_modes, graph_sensor_context</td>
                    <td className="py-2 font-mono text-xs">&rarr; tool_results, graph_context</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Ops Planning</td>
                    <td className="py-2 pr-3">Fleet overview OR maintenance evidence + proposal</td>
                    <td className="py-2 pr-3">fleet_summary OR maintenance_scheduler + graph_related_units + graph_maintenance_history</td>
                    <td className="py-2 font-mono text-xs">&rarr; pending_action, requires_approval</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Approval Gate</td>
                    <td className="py-2 pr-3">HITL decision point</td>
                    <td className="py-2 pr-3">LangGraph <code>interrupt()</code> &mdash; pauses execution, resumes with user's approve/reject</td>
                    <td className="py-2 font-mono text-xs">&rarr; decision_trace (approval status)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Action Executor</td>
                    <td className="py-2 pr-3">Executes approved maintenance</td>
                    <td className="py-2 pr-3">approve_maintenance() &mdash; updates maintenance_log status</td>
                    <td className="py-2 font-mono text-xs">&rarr; decision_trace (action outcome)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Comparison</td>
                    <td className="py-2 pr-3">Multi-unit side-by-side analysis</td>
                    <td className="py-2 pr-3">anomaly_check, rul_estimate, health_index per unit + graph_related_units + comparison summary with deltas</td>
                    <td className="py-2 font-mono text-xs">&rarr; tool_results, graph_context</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">General Assistant</td>
                    <td className="py-2 pr-3">LLM-driven tool selection for novel questions</td>
                    <td className="py-2 pr-3">Claude <code>bind_tools()</code> &mdash; 5 read-only tools whitelisted, or direct domain knowledge response</td>
                    <td className="py-2 font-mono text-xs">&rarr; tool_results, general_tool_calls</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">Response Generator</td>
                    <td className="py-2 pr-3">Natural language synthesis</td>
                    <td className="py-2 pr-3">Claude Haiku &mdash; converts tool results + graph context into structured prose</td>
                    <td className="py-2 font-mono text-xs">&rarr; messages (response)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium text-foreground">Trace Logger</td>
                    <td className="py-2 pr-3">Immutable audit record</td>
                    <td className="py-2 pr-3">Writes to PostgreSQL with pgvector embedding for future similarity retrieval</td>
                    <td className="py-2 font-mono text-xs">&rarr; decision_trace (persisted)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Link
              to="/traces"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View real decision traces &rarr;
            </Link>
          </div>
        </Collapsible>

        {/* Collapsible: Data Flow Example */}
        <Collapsible title='Data Flow Example \u2014 End-to-End'>
          <div className="text-sm text-muted-foreground">
            <p className="mb-3 text-foreground font-medium">
              Query: "Schedule maintenance for unit 7"
            </p>
            <ol className="space-y-2 list-none">
              {[
                'User sends message \u2192 POST /chat',
                'Supervisor uses Claude structured output \u2192 classifies intent: maintenance_request, extracts unit_id: 7, sets active_agent: diagnostic',
                'Diagnostic agent runs anomaly_check(7), rul_estimate(7), health_index(7) \u2192 writes results to tool_results. Because intent=maintenance_request, Diagnostic chains to Ops Planning',
                'Ops Planning reads tool_results, queries Neo4j for related units and maintenance history \u2192 writes to graph_context',
                'Ops Planning calls maintenance_scheduler \u2192 creates proposal with evidence, sets requires_approval=true',
                'Approval Gate fires interrupt() \u2192 graph execution pauses, response sent to frontend with ApprovalCard',
                'User clicks "Approve" \u2192 POST /chat/{session}/approve \u2192 graph resumes with decision injected as state',
                "Action Executor runs approve_maintenance() \u2192 updates maintenance_log status to 'approved'",
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

            <div className="mt-4">
              <Link
                to="/traces"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View real decision traces &rarr;
              </Link>
            </div>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Knowledge Graph Section
// ---------------------------------------------------------------------------
function KnowledgeGraphSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Knowledge Graph &mdash; Neo4j Industrial Ontology
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

        {/* Two-column layout: tables left, diagram right */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">
          {/* Left column: property tables stacked */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Relationship properties
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-3 text-foreground">Relationship</th>
                    <th className="text-left py-1.5 pr-3 text-foreground">Property</th>
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
                    <td className="py-1.5">0&ndash;1</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-mono">SIMILAR_TO</td>
                    <td className="py-1.5 pr-3">similarity_score</td>
                    <td className="py-1.5">Pearson, 0&ndash;1</td>
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
                    <th className="text-left py-1.5 pr-3 text-foreground">Property</th>
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
                    <td className="py-1.5">pending / approved / rejected / completed</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Graph scale: ~134 nodes across 7 types, ~735 relationships across
              8 types
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              These queries are naturally graph-shaped &mdash; 2&ndash;3 hop traversals that
              would require complex JOINs in a relational database. Neo4j makes
              the query intent readable; PostgreSQL handles the tabular data
              (sensor readings, traces, maintenance log) where it excels.
            </p>
          </div>

          {/* Right column: ontology diagram */}
          <OntologyDiagram />
        </div>

        {/* What it enables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: "Failure Mode Matching",
              desc: "Given flagged sensors, find which known failure patterns they indicate. Match strength = |flagged \u2229 indicators| / |indicators|.",
            },
            {
              title: "Asset Context",
              desc: "Map any sensor to its subsystem, criticality level, and related failure modes \u2014 gives the agent structural awareness.",
            },
            {
              title: "Similar Unit Analysis",
              desc: 'Similarity scores precomputed during graph seeding, stored as SIMILAR_TO relationship properties. Top 10 similar engines retrieved via single 2-hop traversal.',
            },
            {
              title: "Maintenance History",
              desc: "Track work orders per engine \u2014 proposed, approved, rejected, completed. Feeds into the maintenance scheduler's evidence chain.",
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

        <Link
          to="/chat"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ask the agent about a unit &rarr;
        </Link>

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
// Tech Stack Section
// ---------------------------------------------------------------------------
function TechStackSection() {
  const groups = [
    {
      label: "Agent Runtime",
      color: "#a78bfa",
      icon: Brain,
      items: [
        {
          tech: "LangGraph \u22650.2.62",
          role: "9-node agent graph with conditional routing, state checkpointing, HITL interrupt() for approval gates",
        },
        {
          tech: "Anthropic Claude API (Claude 3.5 Haiku)",
          role: "Supervisor intent classification via structured output, response synthesis \u2014 Haiku selected for cost-efficiency in tool-calling context",
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
          role: "Exponential curve fitting for Saxena degradation model validation (R\u00b2 per sensor)",
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
          role: "Knowledge graph \u2014 asset hierarchy, failure modes, similar unit analysis, maintenance history",
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
          role: "REST API \u2014 chat endpoints, fleet queries, approval workflow, decision trace retrieval",
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
          role: "PostgreSQL, Neo4j, and application orchestration \u2014 local development with production-equivalent topology",
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
// Design Decisions Section
// ---------------------------------------------------------------------------
const DECISIONS = [
  {
    title: "HITL via LangGraph Interrupt, Not Separate Service",
    chosen:
      "LangGraph's built-in interrupt() mechanism to pause graph execution at the approval gate",
    rejected:
      "Separate approval microservice, webhook callback, or polling loop",
    why: "Keeps approval logic inside the agent graph where it belongs. The interrupted graph resumes with the user's decision injected as state \u2014 no external coordination needed. Fewer moving parts, fewer failure modes.",
    implication:
      "Adding a new approval-required action = one conditional edge in the graph, not a new service.",
  },
  {
    title: "Neo4j for Structural Context, Not Just PostgreSQL",
    chosen:
      "Dedicated graph database for asset hierarchy, failure modes, and relationships",
    rejected: "Modeling everything in PostgreSQL with JOIN tables",
    why: 'The queries the agents need \u2014 "which failure modes match these sensor patterns?", "which similar engines had maintenance?" \u2014 are naturally graph-shaped. Neo4j makes these 2\u20133 hop traversals readable and performant.',
    implication:
      "Adding a new failure mode = one node + INDICATED_BY edges \u2014 agents pick it up automatically without code changes.",
  },
  {
    title: "Piecewise Linear RUL, Not LSTM",
    chosen:
      "Two-segment regression with knee-point detection and population-based extrapolation",
    rejected: "LSTM/transformer sequence models",
    why: "The agent architecture is the focal point, not prediction accuracy. Piecewise linear produces interpretable estimates that the agent can explain to an operator. An LSTM would produce a single number with no per-sensor attribution.",
    implication:
      "Upgrading to a more sophisticated model means swapping one tool function \u2014 the agent graph, approval logic, and trace pipeline remain unchanged.",
  },
  {
    title: "Structured Output for Intent Classification, Not Prompt-and-Parse",
    chosen:
      "Claude structured output with a Pydantic schema returning {intent, unit_id, unit_ids}",
    rejected: "Regex parsing of free-text LLM output, keyword matching",
    why: "Structured output guarantees type-safe routing \u2014 the supervisor's output is a validated object, not a string to be interpreted. Eliminates an entire class of parsing bugs.",
    implication:
      "Adding a new intent type = one enum value in the Pydantic schema + one routing edge \u2014 no parsing logic to update.",
  },
  {
    title: "pgvector Embeddings on Decision Traces",
    chosen:
      "Embed every decision trace for future similarity retrieval",
    rejected: "Store traces as flat rows, query by metadata only",
    why: 'Enables "find past decisions similar to this situation" \u2014 a building block for a memory/playbook layer. When a similar engine shows the same degradation pattern, the system can retrieve what was recommended last time.',
    implication:
      "Enables future similarity retrieval without schema migration \u2014 the embedding column is already populated.",
  },
  {
    title: "Composite Health Index, Not Paper's Margins",
    chosen: "40% normalized anomaly + 60% RUL, scaled 0\u2013100",
    rejected:
      "Reconstructing the paper's min(mFan, mHPC, mHPT, mEGT) margin-based index",
    why: "The paper's health index relies on flow/efficiency margins that were explicitly hidden from dataset participants. The composite approach uses what's available: anomaly score captures current deviation, RUL captures remaining life expectancy.",
    implication:
      "The weighting is configurable \u2014 adjusting the anomaly/RUL balance requires changing two constants, not restructuring the pipeline.",
  },
  {
    title: "Sensor Trend Analysis, Not FFT",
    chosen:
      "Rolling statistics, CUSUM change-point detection, cross-sensor Pearson divergence",
    rejected: "FFT / frequency-domain analysis",
    why: "C-MAPSS samples once per flight cycle \u2014 this is cycle-level time series, not high-frequency vibration data. FFT requires hundreds of samples per period to be meaningful. CUSUM detects persistent mean shifts.",
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
    why: "Simpler implementation, sufficient for the interaction pattern (request \u2192 agent processes \u2192 respond). Agent response times (2\u20135s) don't benefit from token streaming.",
    implication:
      "If response latency increases, WebSocket streaming can be added at the API layer without changing the agent graph.",
  },
  {
    title: "Scope Discipline \u2014 Phase 3 (Vision Pipeline) Skipped",
    chosen:
      "Skip the computer vision phase, go directly from knowledge graph to dashboard",
    rejected: "Adding a vision/image analysis pipeline",
    why: "C-MAPSS is sensor time-series data \u2014 there are no images. Skipping Phase 3 kept the project's narrative coherent. For a portfolio project, narrative cohesion matters more than feature count.",
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
export default function SystemDesign() {
  usePageTitle("System Design");
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Design</h2>
        <p className="text-lg text-muted-foreground mt-1">
          Agent architecture, knowledge graph ontology, tech stack, and design decisions
        </p>
      </div>

      {/* How This System Works — intro context */}
      <Card>
        <CardContent className="pt-4 space-y-3">
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
        </CardContent>
      </Card>

      <ArchitectureSection />
      <KnowledgeGraphSection />
      <TechStackSection />
      <DesignDecisionsSection />
    </div>
  );
}
