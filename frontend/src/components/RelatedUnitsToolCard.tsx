import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

function similarityColor(score: number): string {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function similarityTextColor(score: number): string {
  if (score >= 0.8) return "text-emerald-400";
  if (score >= 0.6) return "text-amber-400";
  return "text-muted-foreground";
}

import { healthTextColor } from "@/lib/health";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "operational":
      return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
    case "near_failure":
    case "failed":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    case "degrading":
      return "bg-amber-400/10 border-amber-400/30 text-amber-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

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

interface MaintenanceAction {
  action_type: string;
  urgency: string;
  status: string;
}

interface SimilarUnit {
  unit_id: number;
  similarity_score: number;
  total_cycles: number;
  status: string;
  health_index: number | null;
  maintenance_actions: MaintenanceAction[];
}

export default function RelatedUnitsToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  const unitId = result.unit_id as number | undefined;
  const similarUnits = (result.similar_units as SimilarUnit[]) ?? [];

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
        <span className="text-foreground">Related Units</span>
        {unitId != null && (
          <span className="text-muted-foreground">Unit {unitId}</span>
        )}
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className="text-[10px] text-muted-foreground">
          {similarUnits.length} found
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-2">
          {similarUnits.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No similar units found in knowledge graph.
            </p>
          ) : (
            similarUnits.map((unit, i) => (
              <div key={unit.unit_id}>
                {i > 0 && <div className="border-t border-border/50 mb-2" />}
                <div className="space-y-1.5">
                  {/* Unit ID + status + cycles */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/units/${unit.unit_id}`}
                      className="inline-flex items-center gap-1 text-sm font-mono font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      Unit {unit.unit_id}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${statusBadgeClass(unit.status)}`}>
                      {unit.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {unit.total_cycles} cycles
                    </span>
                  </div>

                  {/* Similarity bar + health */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${similarityColor(unit.similarity_score)}`}
                          style={{ width: `${(unit.similarity_score * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono w-10 text-right shrink-0 ${similarityTextColor(unit.similarity_score)}`}>
                        {unit.similarity_score.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">Health</span>
                      {unit.health_index != null ? (
                        <span className={`text-xs font-mono font-bold ${healthTextColor(unit.health_index)}`}>
                          {Math.round(unit.health_index)}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* Maintenance actions */}
                  {unit.maintenance_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {unit.maintenance_actions.map((ma, j) => (
                        <span
                          key={j}
                          className={`px-1.5 py-0 rounded text-[10px] font-mono border ${actionBadgeClass(ma.action_type)}`}
                        >
                          {ma.action_type}
                        </span>
                      ))}
                    </div>
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
