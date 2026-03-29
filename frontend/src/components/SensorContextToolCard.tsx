import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SENSOR_COLORS, sensorSymbol } from "@/lib/sensors";

function criticalityColor(level: string): string {
  if (level === "high") return "text-red-400";
  if (level === "medium") return "text-amber-400";
  return "text-muted-foreground";
}

function correlationColor(strength: number): string {
  if (strength >= 0.75) return "text-emerald-400";
  if (strength >= 0.5) return "text-amber-400";
  return "text-red-400";
}

interface RelatedFailureMode {
  name: string;
  correlation_strength: number;
}

interface SensorEntry {
  sensor_id: string;
  name?: string;
  symbol?: string;
  subsystem?: string;
  criticality?: string;
  related_failure_modes?: RelatedFailureMode[];
}

export default function SensorContextToolCard({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  const sensors = (result.sensors as SensorEntry[]) ?? [];

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
        <span className="text-foreground">Sensor Context</span>
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        <span className="text-[10px] text-muted-foreground">
          {sensors.length} sensor{sensors.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-muted/20 space-y-2">
          {sensors.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No sensor context available</p>
          ) : (
            sensors.map((sensor) => {
              const color = SENSOR_COLORS[sensor.sensor_id] || "#888";
              const crit = sensor.criticality ?? "low";
              const modes = sensor.related_failure_modes ?? [];

              return (
                <div key={sensor.sensor_id} className="flex items-start gap-2 text-xs">
                  {/* Color dot + symbol */}
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono w-10 shrink-0 text-foreground">
                    {sensor.symbol ?? sensorSymbol(sensor.sensor_id)}
                  </span>

                  {/* Subsystem badge */}
                  {sensor.subsystem && (
                    <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0 shrink-0">
                      {sensor.subsystem}
                    </span>
                  )}

                  {/* Criticality */}
                  <span className={`text-[10px] font-medium shrink-0 capitalize ${criticalityColor(crit)}`}>
                    {crit}
                  </span>

                  {/* Related failure modes */}
                  {modes.length > 0 && (
                    <span className="text-muted-foreground">
                      →{" "}
                      {modes.map((m, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          {m.name}{" "}
                          <span className={`font-mono ${correlationColor(m.correlation_strength)}`}>
                            ({m.correlation_strength.toFixed(2)})
                          </span>
                        </span>
                      ))}
                    </span>
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
