/**
 * System architecture diagram rendered as styled JSX.
 * Shows the layered architecture: React → FastAPI → LangGraph → data stores.
 */

function LayerBox({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{ borderColor: color }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  label,
  color,
  sub,
}: {
  label: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <div
        className="rounded border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium"
        style={color ? { color, borderColor: `${color}44` } : undefined}
      >
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
          {sub}
        </div>
      )}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-4 bg-muted-foreground/40" />
      {label && (
        <span className="text-[10px] text-muted-foreground px-1">
          {label}
        </span>
      )}
      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-muted-foreground/40" />
    </div>
  );
}

export default function ArchitectureDiagram() {
  const agents = [
    "Supervisor",
    "Diagnostic",
    "Ops Planning",
    "Approval Gate",
    "Action Executor",
    "Response Gen",
    "Trace Logger",
  ];

  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 space-y-0">
      {/* Frontend layer */}
      <div
        className="rounded-lg border px-4 py-2 text-center"
        style={{ borderColor: "#60a5fa" }}
      >
        <span className="text-xs font-semibold" style={{ color: "#60a5fa" }}>
          React Dashboard
        </span>
      </div>

      <Arrow label="REST API" />

      {/* Backend layer */}
      <LayerBox label="FastAPI Backend" color="#34d399">
        {/* LangGraph agents nested */}
        <div
          className="rounded border px-3 py-2.5 mb-3"
          style={{ borderColor: "#a78bfa" }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#a78bfa" }}
          >
            LangGraph Agents
          </div>
          <div className="flex flex-wrap gap-1.5">
            {agents.map((a) => (
              <div
                key={a}
                className="rounded border px-2 py-1 text-[11px] font-medium"
                style={{ color: "#a78bfa", borderColor: "#a78bfa44" }}
              >
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* Data stores */}
        <div
          className="gap-3"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          <Chip
            label="PostgreSQL + pgvector"
            color="#22d3ee"
            sub="Sensors, Traces, Maintenance"
          />
          <Chip
            label="Neo4j Graph"
            color="#fbbf24"
            sub="Ontology, Failures, Similar Units"
          />
          <Chip
            label="Claude API"
            color="#f97316"
            sub="Anthropic (Haiku)"
          />
          <Chip
            label="ML Models"
            color="#f472b6"
            sub="Isolation Forest, Piecewise RUL, CUSUM"
          />
        </div>
      </LayerBox>
    </div>
  );
}
