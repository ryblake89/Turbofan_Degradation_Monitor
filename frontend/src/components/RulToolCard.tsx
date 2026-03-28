import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SENSOR_COLORS, sensorSymbol } from "@/lib/sensors";

function stageColor(stage: string) {
  if (stage === "critical") return { text: "text-red-400", bg: "bg-red-400/10 border-red-400/30", bar: "text-red-400" };
  if (stage === "degrading") return { text: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", bar: "text-amber-400" };
  return { text: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", bar: "text-emerald-400" };
}

function fitQualityColor(rSquared: number): string {
  if (rSquared >= 0.85) return "text-emerald-400";
  if (rSquared >= 0.7) return "text-amber-400";
  return "text-red-400";
}

function fitQualityBg(rSquared: number): string {
  if (rSquared >= 0.85) return "bg-emerald-400/10 border-emerald-400/30";
  if (rSquared >= 0.7) return "bg-amber-400/10 border-amber-400/30";
  return "bg-red-400/10 border-red-400/30";
}

interface SensorDetailEntry {
  knee_cycle_index?: number;
  degradation_pct?: number;
  sensor_rul?: number;
  baseline?: number;
  threshold?: number;
  current_smoothed?: number;
  slope?: number;
}

interface ExpFitEntry {
  a?: number;
  b?: number;
  r_squared?: number;
  physics_consistent?: boolean;
  n_points_fitted?: number;
}

export default function RulToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);

  const unitId = result.unit_id as number | undefined;
  const currentCycle = result.current_cycle as number | undefined;
  const estimatedRul = result.estimated_rul as number | undefined;
  const ci = result.confidence_interval as [number, number] | undefined;
  const stage = (result.degradation_stage as string) ?? "healthy";
  const modelType = result.model_type as string | undefined;
  const sensorDetail = result.sensor_detail as Record<string, SensorDetailEntry> | undefined;
  const exponentialFit = result.exponential_fit as Record<string, ExpFitEntry> | undefined;

  const colors = stageColor(stage);
  const ciLower = ci?.[0] ?? 0;
  const ciUpper = ci?.[1] ?? 0;
  const rul = estimatedRul ?? 0;

  // CI bar range
  const ciMax = Math.max(ciUpper, rul, 30) + 20;
  const showCiBar = !(rul === 0 && ciLower === 0 && ciUpper === 0);

  // Sorted sensor details
  const sortedSensors = sensorDetail
    ? Object.entries(sensorDetail)
        .filter(([, d]) => d.degradation_pct != null)
        .sort(([, a], [, b]) => (b.degradation_pct ?? 0) - (a.degradation_pct ?? 0))
    : [];

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
        <span className="text-foreground">RUL Estimate</span>
        {unitId != null && (
          <span className="text-muted-foreground">Unit {unitId}</span>
        )}
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${colors.bg} ${colors.text} capitalize`}>
          {stage}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {/* Key metrics */}
          <div className="flex items-baseline gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">RUL</span>
              <div className={`text-xl font-mono font-bold ${colors.text}`}>
                {rul} <span className="text-xs font-normal text-muted-foreground">cycles</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycle</span>
              <div className="text-sm font-mono text-foreground">{currentCycle ?? "—"}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</span>
              <div className="text-sm font-mono text-muted-foreground">{modelType ?? "—"}</div>
            </div>
          </div>

          {/* Confidence interval */}
          {showCiBar ? (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Confidence Interval
              </span>
              <div className="relative mt-1 h-5 bg-muted rounded-full overflow-hidden">
                {/* CI range bar */}
                <div
                  className="absolute top-0 h-full bg-primary/20 rounded-full"
                  style={{
                    left: `${(ciLower / ciMax) * 100}%`,
                    width: `${((ciUpper - ciLower) / ciMax) * 100}%`,
                  }}
                />
                {/* Point estimate marker */}
                <div
                  className={`absolute top-0 h-full w-0.5 ${stage === "critical" ? "bg-red-400" : stage === "degrading" ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ left: `${(rul / ciMax) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground font-mono">
                <span>{ciLower}</span>
                <span>{ciUpper} cycles</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-400 font-medium bg-red-400/10 border border-red-400/30 rounded px-2 py-1">
              No remaining useful life
            </div>
          )}

          {/* Degradation bars */}
          {sortedSensors.length > 0 ? (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sensor Degradation
              </span>
              <div className="mt-1 space-y-1.5">
                {sortedSensors.map(([sensor, detail]) => {
                  const pct = (detail.degradation_pct ?? 0) * 100;
                  const color = SENSOR_COLORS[sensor] || "#888";
                  return (
                    <div key={sensor} className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono w-10 shrink-0 text-muted-foreground">
                        {sensorSymbol(sensor)}
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? color : color,
                            opacity: pct >= 90 ? 1 : 0.8,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                      {detail.sensor_rul != null && (
                        <span className="text-[10px] text-muted-foreground w-16 text-right">
                          RUL {detail.sensor_rul}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : sensorDetail !== undefined ? (
            <p className="text-xs text-muted-foreground italic">No degradation detected</p>
          ) : null}

          {/* Exponential fit badges */}
          {exponentialFit && Object.keys(exponentialFit).length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Exponential Fit Quality
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(exponentialFit).map(([sensor, fit]) => {
                  const rSq = fit.r_squared ?? 0;
                  return (
                    <div
                      key={sensor}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono ${fitQualityBg(rSq)}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: SENSOR_COLORS[sensor] || "#888" }}
                      />
                      <span className="text-muted-foreground">{sensorSymbol(sensor)}</span>
                      <span className={`font-bold ${fitQualityColor(rSq)}`}>
                        R²={rSq.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
