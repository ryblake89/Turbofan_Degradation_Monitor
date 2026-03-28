import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { sensorLabel, sensorFullLabel } from "@/lib/sensors";

/** Color by health: high score = healthy (green), low = anomalous (red). Score is 0-10. */
function scoreColor(score: number): string {
  if (score <= 3) return "text-red-400";
  if (score <= 6) return "text-amber-400";
  return "text-emerald-400";
}

interface ContributingSensor {
  sensor: string;
  contribution: number;
}

export default function AnomalyToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);

  const unitId = result.unit_id as number | undefined;
  const isAnomalous = result.is_anomalous as boolean | undefined;
  const normalizedScore = result.normalized_score as number | undefined;
  const windowStart = result.window_start_cycle as number | undefined;
  const windowEnd = result.window_end_cycle as number | undefined;
  const contributing = result.top_contributing_sensors as ContributingSensor[] | undefined;

  const score = (normalizedScore ?? 0) / 10; // backend is 0-100, display as 0-10

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-foreground">Anomaly Check</span>
        {unitId != null && (
          <span className="text-muted-foreground">Unit {unitId}</span>
        )}
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        {isAnomalous ? (
          <span className="px-1.5 py-0 rounded text-[10px] font-medium border bg-red-400/10 border-red-400/30 text-red-400">
            Anomalous
          </span>
        ) : (
          <span className="px-1.5 py-0 rounded text-[10px] font-medium border bg-emerald-400/10 border-emerald-400/30 text-emerald-400">
            Normal
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {/* Key metrics */}
          <div className="flex items-baseline gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
              <div className={`text-lg font-mono font-bold ${scoreColor(score)}`}>
                {score.toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground"> / 10</span>
              </div>
            </div>
            {windowStart != null && windowEnd != null && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Window</span>
                <div className="text-sm font-mono text-muted-foreground">
                  Cycles {windowStart}–{windowEnd}
                </div>
              </div>
            )}
          </div>

          {/* Contributing sensors */}
          {contributing && contributing.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Contributing Sensors
              </span>
              <div className="mt-1 space-y-1.5">
                {contributing.map((s) => (
                  <div key={s.sensor} className="flex items-center gap-3">
                    <span
                      className="font-mono text-xs w-36 shrink-0 truncate"
                      title={sensorFullLabel(s.sensor)}
                    >
                      {sensorLabel(s.sensor)}
                    </span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${(s.contribution * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                      {(s.contribution * 100).toFixed(1)}%
                    </span>
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
