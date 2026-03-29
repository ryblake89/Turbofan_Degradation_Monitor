import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

import { healthLabelColors } from "@/lib/health";

interface UnitMetrics {
  health_index: number | null;
  health_label: string | null;
  estimated_rul: number | null;
  degradation_stage: string | null;
  anomaly_score: number | null;
  is_anomalous: boolean | null;
}

interface ComparisonResult {
  unit_ids: number[];
  units: Record<string, UnitMetrics>;
  deltas: Record<string, number>;
  mutual_similarity: Record<string, number>;
}

export default function ComparisonToolCard({ result }: { result: ComparisonResult }) {
  const [expanded, setExpanded] = useState(false);
  const unitIds = result.unit_ids ?? [];
  const units = result.units ?? {};

  // Find worst unit
  let worstUnit: number | null = null;
  let worstHealth = Infinity;
  for (const uid of unitIds) {
    const h = units[uid]?.health_index;
    if (h != null && h < worstHealth) {
      worstHealth = h;
      worstUnit = uid;
    }
  }

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
        <span className="text-foreground">Unit Comparison</span>
        <span className="text-muted-foreground">
          {unitIds.map((id) => `Unit ${id}`).join(" vs ")}
        </span>
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {/* Side-by-side stat cards */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${unitIds.length}, 1fr)` }}>
            {unitIds.map((uid) => {
              const u = units[uid];
              if (!u) return null;
              const colors = healthLabelColors(u.health_label ?? "");
              const isWorst = uid === worstUnit && unitIds.length > 1;

              return (
                <div
                  key={uid}
                  className={`border rounded-md p-2.5 space-y-2 ${
                    isWorst ? "border-red-500/40 bg-red-500/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-foreground">
                      Unit {uid}
                    </span>
                    <Link
                      to={`/units/${uid}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Health index */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-mono font-bold ${colors.text}`}>
                        {u.health_index?.toFixed(1) ?? "—"}
                      </span>
                      <span className={`text-[10px] font-medium border rounded px-1.5 py-0 capitalize ${colors.bg} ${colors.text}`}>
                        {(u.health_label ?? "unknown").replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* RUL */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">RUL</span>
                    <div className="text-sm font-mono text-foreground">
                      {u.estimated_rul != null ? `${u.estimated_rul} cycles` : "—"}
                    </div>
                  </div>

                  {/* Anomaly score */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Anomaly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">
                        {u.anomaly_score?.toFixed(1) ?? "—"}
                      </span>
                      {u.is_anomalous && (
                        <span className="text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-0">
                          anomalous
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Degradation stage */}
                  {u.degradation_stage && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage</span>
                      <div className="text-sm font-mono text-muted-foreground capitalize">
                        {u.degradation_stage}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Deltas (for 2-unit comparisons) */}
          {Object.keys(result.deltas).length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Differences</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(result.deltas).map(([key, value]) => {
                  const label = key.replace("_delta", "").replace(/_/g, " ");
                  const isNeg = value < 0;
                  return (
                    <div key={key} className="text-xs font-mono border border-border rounded px-2 py-1">
                      <span className="text-muted-foreground capitalize">{label}: </span>
                      <span className={isNeg ? "text-red-400" : "text-emerald-400"}>
                        {isNeg ? "" : "+"}{value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mutual similarity */}
          {Object.keys(result.mutual_similarity).length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Knowledge Graph Similarity
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(result.mutual_similarity).map(([key, score]) => (
                  <div key={key} className="text-xs font-mono border border-border rounded px-2 py-1">
                    <span className="text-muted-foreground">{key.replace(/_/g, " ")}: </span>
                    <span className="text-primary">{score?.toFixed(2) ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
