import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function actionBadgeClass(action: string): string {
  switch (action) {
    case "replace":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    case "service":
      return "bg-amber-400/10 border-amber-400/30 text-amber-400";
    case "inspect":
      return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function urgencyBadgeClass(urgency: string): string {
  switch (urgency) {
    case "immediate":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    case "soon":
      return "bg-amber-400/10 border-amber-400/30 text-amber-400";
    case "routine":
      return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

interface WorkOrderDraft {
  work_order_id: string;
  equipment_id: string;
  action: string;
  priority: string;
  proposed_window: string;
  description: string;
}

export default function MaintenanceSchedulerToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const [woExpanded, setWoExpanded] = useState(false);

  const unitId = result.unit_id as number | undefined;
  const logId = result.log_id as number | undefined;
  const proposedAction = result.proposed_action as string | undefined;
  const urgency = result.urgency as string | undefined;
  const proposedWindow = result.proposed_window as string | undefined;
  const evidenceSummary = result.evidence_summary as string | undefined;
  const woDraft = result.cmms_work_order_draft as WorkOrderDraft | undefined;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-foreground">Maintenance Scheduler</span>
        {unitId != null && (
          <span className="text-muted-foreground">Unit {unitId}</span>
        )}
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        {urgency && (
          <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${urgencyBadgeClass(urgency)}`}>
            {urgency}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {/* Key fields grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</span>
              <div className="mt-0.5">
                {proposedAction && (
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border uppercase ${actionBadgeClass(proposedAction)}`}>
                    {proposedAction}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Urgency</span>
              <div className="mt-0.5">
                {urgency && (
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border capitalize ${urgencyBadgeClass(urgency)}`}>
                    {urgency}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Window</span>
              <div className="text-xs font-mono text-foreground mt-0.5">
                {proposedWindow ?? "—"}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Log ID</span>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">
                {logId ?? "—"}
              </div>
            </div>
          </div>

          {/* Evidence summary */}
          {evidenceSummary && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Evidence
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {evidenceSummary}
              </p>
            </div>
          )}

          {/* Work order draft (collapsed by default) */}
          {woDraft && (
            <div className="border-t border-border/50 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setWoExpanded(!woExpanded); }}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {woExpanded ? (
                  <ChevronDown className="h-2.5 w-2.5" />
                ) : (
                  <ChevronRight className="h-2.5 w-2.5" />
                )}
                Work Order Draft
              </button>
              {woExpanded && (
                <div className="mt-1.5 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">WO ID:</span>
                    <span className="font-mono text-foreground">{woDraft.work_order_id}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">Equipment:</span>
                    <span className="font-mono text-foreground">{woDraft.equipment_id}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">Priority:</span>
                    <span className="text-foreground capitalize">{woDraft.priority}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">Window:</span>
                    <span className="text-foreground">{woDraft.proposed_window}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
