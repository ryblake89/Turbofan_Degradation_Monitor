import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SENSOR_COLORS, sensorSymbol } from "@/lib/sensors";

function summaryBadge(summary: string) {
  switch (summary) {
    case "stable":
      return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
    case "gradual_degradation":
      return "bg-amber-400/10 border-amber-400/30 text-amber-400";
    case "accelerating":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function summaryLabel(summary: string): string {
  return summary.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function divergenceColor(value: number): string {
  if (value >= 0.4) return "bg-red-400/10 border-red-400/30 text-red-400";
  if (value >= 0.2) return "bg-amber-400/10 border-amber-400/30 text-amber-400";
  return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
}

interface RollingFeature {
  mean?: number;
  std?: number;
  slope?: number;
  rate_of_change?: number;
}

interface ChangePoint {
  sensor: string;
  cycle_index: number;
  direction: string;
  magnitude: number;
}

export default function TrendToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true);

  const trendSummary = (result.trend_summary as string) ?? "stable";
  const rollingFeatures = result.rolling_features as Record<string, RollingFeature> | undefined;
  const changePoints = result.change_points as ChangePoint[] | undefined;
  const divergence = result.cross_sensor_divergence as Record<string, number> | undefined;

  // Sort sensors by |rate_of_change| descending, filter negligible
  const sortedSensors = rollingFeatures
    ? Object.entries(rollingFeatures)
        .filter(([, f]) => Math.abs(f.rate_of_change ?? 0) >= 0.00001)
        .sort(([, a], [, b]) => Math.abs(b.rate_of_change ?? 0) - Math.abs(a.rate_of_change ?? 0))
    : [];

  // Group change points by sensor
  const cpBySensor: Record<string, number[]> = {};
  if (changePoints) {
    for (const cp of changePoints) {
      if (!cpBySensor[cp.sensor]) cpBySensor[cp.sensor] = [];
      cpBySensor[cp.sensor].push(cp.cycle_index);
    }
  }
  const cpTotal = changePoints?.length ?? 0;

  // Filter non-zero divergence pairs
  const divPairs = divergence
    ? Object.entries(divergence).filter(([, v]) => v > 0.01)
        .sort(([, a], [, b]) => b - a)
    : [];

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
        <span className="text-foreground">Trend Analysis</span>
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className={`px-1.5 py-0 rounded text-[10px] font-medium border ${summaryBadge(trendSummary)}`}>
          {summaryLabel(trendSummary)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {/* Sensor slopes */}
          {sortedSensors.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sensor Rates of Change
              </span>
              <div className="mt-1 space-y-1">
                {sortedSensors.map(([sensor, feat]) => {
                  const roc = feat.rate_of_change ?? 0;
                  const isPositive = roc >= 0;
                  const color = SENSOR_COLORS[sensor] || "#888";
                  return (
                    <div key={sensor} className="flex items-center gap-2 text-xs font-mono">
                      <span style={{ color }} className="w-4 text-center shrink-0">
                        {isPositive ? "↑" : "↓"}
                      </span>
                      <span className="text-muted-foreground w-10 shrink-0">
                        {sensorSymbol(sensor)}
                      </span>
                      <span className="text-foreground">
                        {isPositive ? "+" : ""}
                        {(roc * 100).toFixed(3)}%/cyc
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Change points */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Change Points{cpTotal > 0 && ` (${cpTotal} detected)`}
            </span>
            {cpTotal > 0 ? (
              <div className="mt-1 space-y-0.5">
                {Object.entries(cpBySensor).map(([sensor, cycles]) => (
                  <div key={sensor} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: SENSOR_COLORS[sensor] || "#888" }}
                    />
                    <span className="font-mono text-muted-foreground w-10 shrink-0">
                      {sensorSymbol(sensor)}
                    </span>
                    <span className="text-foreground font-mono">
                      {cycles.length === 1 ? `cycle ${cycles[0]}` : `cycles ${cycles.join(", ")}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground italic">No change points detected</p>
            )}
          </div>

          {/* Cross-sensor divergence */}
          {divPairs.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cross-Sensor Divergence
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {divPairs.map(([pair, value]) => {
                  const [s1, s2] = pair.split("/");
                  return (
                    <span
                      key={pair}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono ${divergenceColor(value)}`}
                    >
                      {sensorSymbol(s1)}/{sensorSymbol(s2)}{" "}
                      <span className="font-bold">{value.toFixed(2)}</span>
                    </span>
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
