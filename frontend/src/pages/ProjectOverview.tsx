import { Link } from "react-router-dom";
import {
  Activity,
  MessageSquare,
  Search,
  Brain,
  Shield,
  ClipboardCheck,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import HeroChatReplay from "@/components/HeroChatReplay";

// ---------------------------------------------------------------------------
// Hero
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

// ---------------------------------------------------------------------------
// Stat badges
// ---------------------------------------------------------------------------
const HERO_STATS = [
  { label: "100 Engines", detail: "NASA C-MAPSS run-to-failure", color: "#22d3ee" },
  { label: "21 Sensors", detail: "Temperature, pressure, speed, flow", color: "#34d399" },
  { label: "9 AI Agents", detail: "LangGraph orchestration with HITL", color: "#a78bfa" },
  { label: "7 Node Types", detail: "Neo4j industrial ontology", color: "#fbbf24" },
  { label: "Full Traces", detail: "pgvector-embedded, every tool call logged", color: "#60a5fa" },
] as const;

// ---------------------------------------------------------------------------
// Narrative flow — 5 steps
// ---------------------------------------------------------------------------
const NARRATIVE_STEPS = [
  {
    icon: MessageSquare,
    color: "#60a5fa",
    text: 'Engineer asks "Schedule maintenance for unit 7"',
  },
  {
    icon: Search,
    color: "#a78bfa",
    text: "Supervisor classifies intent and routes to the diagnostic agent",
  },
  {
    icon: Brain,
    color: "#22d3ee",
    text: "ML tools run anomaly detection, RUL estimation, and trend analysis",
  },
  {
    icon: Shield,
    color: "#fbbf24",
    text: "Ops planning queries the knowledge graph and proposes maintenance with evidence",
  },
  {
    icon: ClipboardCheck,
    color: "#34d399",
    text: "System pauses for human approval \u2014 engineer approves \u2014 immutable trace logged",
  },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ProjectOverview() {
  usePageTitle("Project Overview");
  return (
    <div className="space-y-8">
      <HeroSection />

      {/* Stat badges + engine diagram */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
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
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">How This System Works</h3>
            <div className="space-y-2">
              {NARRATIVE_STEPS.map(({ icon: Icon, color, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center h-7 w-7 rounded-full shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{i + 1}.</span>{" "}
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Engine diagram */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <img
              src="/images/engine-diagram.jpg"
              alt="Turbofan engine cross-section with key sensor locations"
              className="w-auto rounded"
              style={{ height: "320px" }}
            />
          </div>
          <p className="text-xs text-muted-foreground italic mt-2 text-center" style={{ maxWidth: "340px" }}>
            Turbofan engine cross-section with key sensor locations. 7 key sensors
            selected for degradation monitoring.
          </p>
        </div>
      </div>

      {/* Live demo replay */}
      <HeroChatReplay />

      {/* Dual CTAs */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/fleet"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Activity className="h-4 w-4" />
          Explore the Fleet
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border text-foreground font-medium text-sm hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Talk to the Agent
        </Link>
      </div>
    </div>
  );
}
