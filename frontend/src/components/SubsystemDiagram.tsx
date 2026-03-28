import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SENSORS, SUBSYSTEM_ORDER, sensorSymbol, sensorFullLabel } from "@/lib/sensors";

interface Props {
  flaggedSensors: string[];
}

export default function SubsystemDiagram({ flaggedSensors }: Props) {
  const flaggedSubsystems = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const sensor of flaggedSensors) {
      const sub = SENSORS[sensor]?.subsystem;
      if (!sub) continue;
      const existing = map.get(sub) ?? [];
      existing.push(sensor);
      map.set(sub, existing);
    }
    return map;
  }, [flaggedSensors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Subsystem Map</CardTitle>
        <p className="text-xs text-muted-foreground">
          Engine flow path — flagged subsystems highlighted in red
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Flow diagram */}
        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {SUBSYSTEM_ORDER.map((sub, i) => {
            const isFlagged = flaggedSubsystems.has(sub);
            const sensors = flaggedSubsystems.get(sub);

            return (
              <div key={sub} className="flex items-center">
                <div
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 min-w-[100px] transition-colors ${
                    isFlagged
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <span className={`font-bold text-sm ${isFlagged ? "text-red-300" : "text-foreground"}`}>
                    {sub}
                  </span>
                  {sensors && (
                    <span className="text-[10px] mt-1 text-red-400 font-mono">
                      {sensors.map((s) => sensorSymbol(s)).join(", ")}
                    </span>
                  )}
                </div>
                {i < SUBSYSTEM_ORDER.length - 1 && (
                  <svg width="24" height="16" viewBox="0 0 24 16" className="shrink-0 text-muted-foreground mx-0.5">
                    <path
                      d="M0 8h18m0 0l-5-5m5 5l-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Sensor legend for flagged subsystems */}
        {flaggedSubsystems.size > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1">
            {SUBSYSTEM_ORDER.filter((sub) => flaggedSubsystems.has(sub)).map((sub) => (
              <div key={sub}>
                <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">
                  {sub} Sensors
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {flaggedSubsystems.get(sub)!.map((sId) => (
                    <div key={sId} className="text-xs text-muted-foreground font-mono">
                      {sensorFullLabel(sId)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
