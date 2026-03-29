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

function statusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
    case "rejected":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    case "pending":
      return "bg-amber-400/10 border-amber-400/30 text-amber-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

interface WorkOrder {
  wo_id: string;
  action_type: string;
  urgency: string;
  status: string;
  proposed_at: string | null;
}

export default function MaintenanceHistoryToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  const unitId = result.unit_id as number | undefined;
  const error = result.error as string | undefined;
  const workOrders = (result.work_orders as WorkOrder[]) ?? [];
  const total = (result.total_work_orders as number) ?? workOrders.length;

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
        <span className="text-foreground">Maintenance History</span>
        {unitId != null && (
          <span className="text-muted-foreground">Unit {unitId}</span>
        )}
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className="text-[10px] text-muted-foreground">
          {error ? "error" : total === 0 ? "empty" : `${total} order${total !== 1 ? "s" : ""}`}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-2">
          {error ? (
            <p className="text-xs text-muted-foreground italic">{error}</p>
          ) : workOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No maintenance history recorded.
            </p>
          ) : (
            workOrders.map((wo, i) => (
              <div key={wo.wo_id}>
                {i > 0 && <div className="border-t border-border/50 mb-2" />}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {wo.wo_id}
                  </span>
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${actionBadgeClass(wo.action_type)}`}>
                    {wo.action_type}
                  </span>
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${urgencyBadgeClass(wo.urgency)}`}>
                    {wo.urgency}
                  </span>
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${statusBadgeClass(wo.status)}`}>
                    {wo.status}
                  </span>
                  {wo.proposed_at && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDate(wo.proposed_at)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
