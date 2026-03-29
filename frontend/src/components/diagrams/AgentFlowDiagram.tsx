/**
 * LangGraph agent flow diagram rendered as styled JSX.
 * Shows conditional routing with labeled edges.
 */

function Node({
  label,
  sub,
  color,
  className = "",
}: {
  label: string;
  sub?: string;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${className}`}
      style={{ borderColor: color, minWidth: "120px" }}
    >
      <div className="text-xs font-semibold" style={{ color }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {sub}
        </div>
      )}
    </div>
  );
}

function Diamond({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-center">
      <div
        className="rounded border px-4 py-1.5 text-[10px] font-medium bg-muted/30 whitespace-nowrap"
        style={{ borderColor: color, color }}
      >
        {label}
      </div>
    </div>
  );
}

function DownArrow({ label, dashed }: { label?: string; dashed?: boolean }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div
        className="w-px h-4"
        style={{
          borderLeft: dashed
            ? "1px dashed rgba(255,255,255,0.2)"
            : "1px solid rgba(255,255,255,0.25)",
        }}
      />
      {label && (
        <span className="text-[9px] text-muted-foreground px-1 whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-muted-foreground/40" />
    </div>
  );
}

function EdgeLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] text-amber-400 font-medium">{children}</span>
  );
}

export default function AgentFlowDiagram() {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 overflow-x-auto">
      <div className="min-w-[600px] flex flex-col items-center gap-0">
        {/* User Query */}
        <Node label="User Query" sub="POST /chat" color="#60a5fa" />
        <DownArrow />

        {/* Supervisor */}
        <Node
          label="Supervisor"
          sub="Claude structured output → intent + unit_id"
          color="#a78bfa"
        />
        <DownArrow />
        <Diamond label="active_agent?" color="#a78bfa" />

        {/* Branch: Diagnostic / Ops Planning */}
        <div className="flex items-start gap-12 mt-1">
          {/* Diagnostic branch */}
          <div className="flex flex-col items-center">
            <EdgeLabel>diagnostic</EdgeLabel>
            <DownArrow />
            <Node
              label="Diagnostic"
              sub="anomaly_check, rul_estimate, health_index, trend_analysis, graph_queries"
              color="#22d3ee"
            />
            <DownArrow />
            <Diamond label="intent = maintenance_request?" color="#22d3ee" />
            <div className="flex gap-8 mt-1">
              <div className="flex flex-col items-center">
                <EdgeLabel>no</EdgeLabel>
                <DownArrow />
                <div className="text-[10px] text-muted-foreground">↓ to Response Gen</div>
              </div>
              <div className="flex flex-col items-center">
                <EdgeLabel>yes</EdgeLabel>
                <DownArrow />
                <div className="text-[10px] text-muted-foreground">→ to Ops Planning</div>
              </div>
            </div>
          </div>

          {/* Ops Planning branch */}
          <div className="flex flex-col items-center">
            <EdgeLabel>ops_planning</EdgeLabel>
            <DownArrow />
            <Node
              label="Ops Planning"
              sub="fleet_summary OR maintenance_scheduler + graph_related_units + graph_maintenance_history"
              color="#fbbf24"
            />
            <DownArrow />
            <Diamond label="requires_approval?" color="#fbbf24" />
            <div
              className="mt-1"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}
            >
              <div className="flex flex-col items-center">
                <EdgeLabel>false</EdgeLabel>
                <DownArrow />
                <div className="text-[10px] text-muted-foreground">↓ to Response Gen</div>
              </div>
              <div className="flex flex-col items-center">
                <EdgeLabel>true</EdgeLabel>
                <DownArrow />
                <Node
                  label="Approval Gate"
                  sub="HITL interrupt()"
                  color="#f97316"
                />
                <DownArrow />
                <Diamond label="decision?" color="#f97316" />
                <div
                  className="mt-1"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}
                >
                  <div className="flex flex-col items-center">
                    <EdgeLabel>rejected</EdgeLabel>
                    <DownArrow />
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      ↓ Response Gen
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <EdgeLabel>approved</EdgeLabel>
                    <DownArrow />
                    <Node
                      label="Action Executor"
                      sub="approve_maintenance()"
                      color="#34d399"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Converge to Response Generator */}
        <div className="mt-4 flex flex-col items-center">
          <div className="text-[10px] text-muted-foreground mb-1">
            all paths converge
          </div>
          <DownArrow />
          <Node
            label="Response Generator"
            sub="Claude Haiku → natural language response"
            color="#f472b6"
          />
          <DownArrow label="always" />
          <Node
            label="Trace Logger"
            sub="PostgreSQL + pgvector embedding"
            color="#22d3ee"
          />
        </div>
      </div>
    </div>
  );
}
