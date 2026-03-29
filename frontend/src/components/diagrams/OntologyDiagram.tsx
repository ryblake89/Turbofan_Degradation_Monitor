/**
 * Neo4j ontology schema diagram rendered as styled JSX.
 * Vertical hierarchy on the left, cross-relationships branching right.
 */

const line = "rgba(255,255,255,0.2)";

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
          boxShadow: `0 0 8px ${color}30, 0 0 2px ${color}20`,
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
      <div style={{ width: "20px", height: "1px", background: line }} />
      <span className="text-[8px] text-muted-foreground/70 px-1 whitespace-nowrap font-mono">
        {label}
      </span>
      <div style={{ width: "12px", height: "1px", background: line }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderLeft: `5px solid ${line}`,
        }}
      />
    </div>
  );
}

function HArrowLeft({ label }: { label: string }) {
  return (
    <div className="flex items-center mx-1">
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderRight: `5px solid ${line}`,
        }}
      />
      <div style={{ width: "12px", height: "1px", background: line }} />
      <span className="text-[8px] text-muted-foreground/70 px-1 whitespace-nowrap font-mono">
        {label}
      </span>
      <div style={{ width: "20px", height: "1px", background: line }} />
    </div>
  );
}

function VArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center my-0.5">
      <div style={{ width: "1px", height: "12px", background: line }} />
      <span className="text-[8px] text-muted-foreground/70 whitespace-nowrap font-mono">
        {label}
      </span>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "3px solid transparent",
          borderRight: "3px solid transparent",
          borderTop: `5px solid ${line}`,
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
          borderRight: `5px solid ${line}`,
        }}
      />
      <div style={{ width: "12px", height: "1px", background: line }} />
      <span className="text-[8px] text-muted-foreground/70 px-1 whitespace-nowrap font-mono">
        {label}
      </span>
      <div style={{ width: "12px", height: "1px", background: line }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderLeft: `5px solid ${line}`,
        }}
      />
    </div>
  );
}

export default function OntologyDiagram() {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 overflow-x-auto">
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "auto auto auto 32px auto auto auto",
          gridTemplateRows: "repeat(9, auto)",
          alignItems: "center",
          justifyItems: "center",
        }}
      >
        {/* Row 1: Plant */}
        <div style={{ gridColumn: 1, gridRow: 1 }}>
          <GNode label="Plant" count={1} color="#60a5fa" />
        </div>

        {/* Row 2: VArrow HAS_FLEET */}
        <div style={{ gridColumn: 1, gridRow: 2 }}>
          <VArrow label="HAS_FLEET" />
        </div>

        {/* Row 3: Fleet */}
        <div style={{ gridColumn: 1, gridRow: 3 }}>
          <GNode label="Fleet" count={1} color="#60a5fa" />
        </div>

        {/* Row 4: VArrow CONTAINS */}
        <div style={{ gridColumn: 1, gridRow: 4 }}>
          <VArrow label="CONTAINS" />
        </div>

        {/* Row 5: Engine → HAS_MAINTENANCE → WorkOrder    |    Engine ↔ Engine */}
        <div style={{ gridColumn: 1, gridRow: 5 }}>
          <GNode label="Engine" count={100} color="#22d3ee" />
        </div>
        <div style={{ gridColumn: 2, gridRow: 5 }}>
          <HArrow label="HAS_MAINTENANCE" />
        </div>
        <div style={{ gridColumn: 3, gridRow: 5 }}>
          <GNode label={"Work\nOrder"} color="#f97316" />
        </div>
        <div style={{ gridColumn: 5, gridRow: 5 }}>
          <GNode label="Engine" color="#22d3ee" />
        </div>
        <div style={{ gridColumn: 6, gridRow: 5 }}>
          <BiArrow label="SIMILAR_TO" />
        </div>
        <div style={{ gridColumn: 7, gridRow: 5 }}>
          <GNode label="Engine" color="#22d3ee" />
        </div>

        {/* Row 6: VArrow HAS_SUBSYSTEM */}
        <div style={{ gridColumn: 1, gridRow: 6 }}>
          <VArrow label="HAS_SUBSYSTEM" />
        </div>

        {/* Row 7: Subsystem ←── AFFECTS ─── FailureMode (spans rows 7-9) */}
        <div style={{ gridColumn: 1, gridRow: 7 }}>
          <GNode label="Subsystem" count={6} color="#34d399" />
        </div>
        <div style={{ gridColumn: 2, gridRow: 7 }}>
          <HArrowLeft label="AFFECTS" />
        </div>
        <div style={{ gridColumn: 3, gridRow: "7 / 10", alignSelf: "center" }}>
          <GNode label={"Failure\nMode"} count={5} color="#f472b6" />
        </div>

        {/* Row 8: VArrow MONITORED_BY */}
        <div style={{ gridColumn: 1, gridRow: 8 }}>
          <VArrow label="MONITORED_BY" />
        </div>

        {/* Row 9: Sensor ←── INDICATED_BY ─── (FailureMode spans into this row) */}
        <div style={{ gridColumn: 1, gridRow: 9 }}>
          <GNode label="Sensor" count={21} color="#fbbf24" />
        </div>
        <div style={{ gridColumn: 2, gridRow: 9 }}>
          <HArrowLeft label="INDICATED_BY" />
        </div>
      </div>
    </div>
  );
}
