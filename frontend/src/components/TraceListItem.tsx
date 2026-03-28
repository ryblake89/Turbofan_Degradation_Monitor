import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TraceEntry } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

function healthDotColor(health: number): string {
  if (health >= 60) return "bg-emerald-500";
  if (health >= 30) return "bg-amber-500";
  if (health >= 15) return "bg-red-500";
  return "bg-red-700";
}

function outcomeBadgeClass(outcome: string | null): string {
  switch (outcome) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rejected":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

interface TraceListItemProps {
  trace: TraceEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function TraceListItem({
  trace,
  isExpanded,
  onToggle,
}: TraceListItemProps) {
  const tools = Array.isArray(trace.tools_called) ? trace.tools_called : [];
  const ctx = trace.sensor_context as Record<string, unknown> | null;
  const healthIndex = ctx?.health_index as number | undefined;
  const unitLabel =
    !trace.unit_id || trace.unit_id === 0
      ? "Fleet"
      : `Unit ${trace.unit_id}`;
  const queryPreview = trace.query
    ? trace.query.length > 80
      ? trace.query.slice(0, 80) + "..."
      : trace.query
    : "\u2014";

  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
    >
      <div className="flex items-center gap-3">
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="text-xs font-mono font-bold text-foreground w-14 shrink-0">
          #{trace.id}
        </span>
        <span className="text-xs text-muted-foreground w-14 shrink-0">
          {unitLabel}
        </span>
        {healthIndex != null && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${healthDotColor(healthIndex)}`}
            title={`Health: ${healthIndex.toFixed(1)}`}
          />
        )}
        {trace.intent && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {trace.intent}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 shrink-0 ${outcomeBadgeClass(trace.outcome)}`}
        >
          {trace.outcome ?? "unknown"}
        </Badge>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {tools.length} tool{tools.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
          {queryPreview}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {trace.created_at ? formatRelativeTime(trace.created_at) : "\u2014"}
        </span>
      </div>
    </button>
  );
}
