/**
 * Neo4j ontology schema diagram rendered as styled JSX.
 * Clean single-flow layout — each node type appears once.
 */

function GNode({
  label,
  count,
  color,
}: {
  label: string;
  count?: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-full border-2 flex items-center justify-center text-[10px] font-semibold leading-tight text-center"
        style={{
          borderColor: color,
          color,
          width: "62px",
          height: "62px",
          padding: "4px",
        }}
      >
        {label}
      </div>
      {count != null && (
        <div className="text-[9px] text-muted-foreground mt-0.5">
          ×{count}
        </div>
      )}
    </div>
  );
}

function HArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center mx-1">
      <div style={{ width: "20px", height: "1px", background: "rgba(255,255,255,0.2)" }} />
      <span className="text-[8px] text-muted-foreground/70 px-1 whitespace-nowrap font-mono">
        {label}
      </span>
      <div style={{ width: "12px", height: "1px", background: "rgba(255,255,255,0.2)" }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderLeft: "5px solid rgba(255,255,255,0.2)",
        }}
      />
    </div>
  );
}

function VArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center my-0.5">
      <div style={{ width: "1px", height: "12px", background: "rgba(255,255,255,0.2)" }} />
      <span className="text-[8px] text-muted-foreground/70 whitespace-nowrap font-mono">
        {label}
      </span>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "3px solid transparent",
          borderRight: "3px solid transparent",
          borderTop: "5px solid rgba(255,255,255,0.2)",
        }}
      />
    </div>
  );
}

function BiArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center mx-1">
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderRight: "5px solid rgba(255,255,255,0.2)",
        }}
      />
      <div style={{ width: "12px", height: "1px", background: "rgba(255,255,255,0.2)" }} />
      <span className="text-[8px] text-muted-foreground/70 px-1 whitespace-nowrap font-mono">
        {label}
      </span>
      <div style={{ width: "12px", height: "1px", background: "rgba(255,255,255,0.2)" }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderLeft: "5px solid rgba(255,255,255,0.2)",
        }}
      />
    </div>
  );
}

export default function OntologyDiagram() {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Main hierarchy: Plant → Fleet → Engine → Subsystem → Sensor */}
        <div className="flex items-center justify-center">
          <GNode label="Plant" count={1} color="#60a5fa" />
          <HArrow label="HAS_FLEET" />
          <GNode label="Fleet" count={1} color="#60a5fa" />
          <HArrow label="CONTAINS" />
          <GNode label="Engine" count={100} color="#22d3ee" />
          <HArrow label="HAS_SUBSYSTEM" />
          <GNode label="Subsystem" count={6} color="#34d399" />
          <HArrow label="MONITORED_BY" />
          <GNode label="Sensor" count={21} color="#fbbf24" />
        </div>

        {/* Second row: vertical branches + cross-links */}
        <div
          className="mt-2 flex justify-center"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0" }}
        >
          {/* Engine → WorkOrder */}
          <div className="flex flex-col items-center">
            <div className="text-[8px] text-muted-foreground/50 mb-0.5">Engine</div>
            <VArrow label="HAS_MAINTENANCE" />
            <GNode label="Work&#10;Order" color="#f97316" />
          </div>

          {/* FailureMode → Subsystem & Sensor */}
          <div className="flex flex-col items-center">
            <GNode label="Failure&#10;Mode" count={5} color="#f472b6" />
            <div className="flex items-start gap-6 mt-1">
              <div className="flex flex-col items-center">
                <VArrow label="AFFECTS" />
                <div className="text-[8px] text-muted-foreground/50">Subsystem</div>
              </div>
              <div className="flex flex-col items-center">
                <VArrow label="INDICATED_BY" />
                <div className="text-[8px] text-muted-foreground/50">Sensor</div>
              </div>
            </div>
          </div>

          {/* Engine ↔ Engine */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center">
              <GNode label="Engine" color="#22d3ee" />
              <BiArrow label="SIMILAR_TO" />
              <GNode label="Engine" color="#22d3ee" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
