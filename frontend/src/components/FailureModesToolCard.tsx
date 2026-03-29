import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SENSOR_COLORS, sensorSymbol } from "@/lib/sensors";

function matchColor(strength: number): string {
  if (strength >= 0.7) return "bg-red-500";
  if (strength >= 0.4) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

interface FailureMode {
  name: string;
  description?: string;
  affected_subsystem?: string;
  indicator_sensors?: string[];
  sensors_currently_flagged?: string[];
  match_strength?: number;
}

export default function FailureModesToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  const modes = (result.matched_failure_modes as FailureMode[]) ?? [];
  const sorted = [...modes].sort((a, b) => (b.match_strength ?? 0) - (a.match_strength ?? 0));

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
        <span className="text-foreground">Failure Modes</span>
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className="text-[10px] text-muted-foreground">
          {sorted.length} matched
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No failure modes matched</p>
          ) : (
            sorted.map((mode, i) => {
              const strength = mode.match_strength ?? 0;
              const flagged = new Set(mode.sensors_currently_flagged ?? []);
              const indicators = mode.indicator_sensors ?? [];

              return (
                <div key={i} className="space-y-1.5">
                  {i > 0 && <div className="border-t border-border/50" />}
                  {/* Name + subsystem */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{mode.name}</span>
                    {mode.affected_subsystem && (
                      <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0 shrink-0">
                        {mode.affected_subsystem}
                      </span>
                    )}
                  </div>

                  {/* Match strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${matchColor(strength)}`}
                        style={{ width: `${(strength * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-16 text-right shrink-0">
                      {(strength * 100).toFixed(0)}% match
                    </span>
                  </div>

                  {/* Indicator sensors */}
                  {indicators.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {indicators.map((sensor) => {
                        const isFlagged = flagged.has(sensor);
                        const color = SENSOR_COLORS[sensor] || "#888";
                        return (
                          <span
                            key={sensor}
                            className={`inline-flex items-center gap-1 px-1.5 py-0 rounded text-[10px] font-mono border ${
                              isFlagged
                                ? "border-current text-foreground"
                                : "border-border text-muted-foreground/50"
                            }`}
                            style={isFlagged ? { borderColor: color, color } : undefined}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isFlagged ? color : "currentColor" }}
                            />
                            {sensorSymbol(sensor)}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Description */}
                  {mode.description && (
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
