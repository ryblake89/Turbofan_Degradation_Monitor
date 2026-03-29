import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriorityUnit } from "@/types";

interface Props {
  units: PriorityUnit[];
  isLoading: boolean;
}

function healthColor(health: number): string {
  if (health >= 60) return "bg-emerald-600 hover:bg-emerald-500";
  if (health >= 30) return "bg-amber-600 hover:bg-amber-500";
  if (health >= 15) return "bg-red-600 hover:bg-red-500";
  return "bg-red-800 hover:bg-red-700";
}

export default function FleetHeatmap({ units, isLoading }: Props) {
  const navigate = useNavigate();

  // Build a map of unit_id -> unit for O(1) lookup
  const unitMap = new Map(units.map((u) => [u.unit_id, u]));

  // Grid: units 1-100 in a 10x10 grid
  const grid = Array.from({ length: 100 }, (_, i) => {
    const unitId = i + 1;
    return unitMap.get(unitId) ?? null;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fleet Health Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
            {Array.from({ length: 100 }, (_, i) => (
              <div
                key={i}
                className="aspect-square bg-muted animate-pulse rounded-sm"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fleet Health Heatmap</CardTitle>
        <p className="text-xs text-muted-foreground">
          Click a unit to view details. Color: green (&gt;60) / amber (30-60) /
          red (&lt;30)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
          {grid.map((unit, i) => {
            const unitId = i + 1;
            const health = unit?.health_index ?? 0;

            return (
              <button
                key={unitId}
                onClick={() => navigate(`/units/${unitId}`)}
                className={`aspect-square rounded-sm flex flex-col items-center justify-center text-xs cursor-pointer transition-colors text-white ${healthColor(health)}`}
                title={
                  unit
                    ? `Unit ${unitId}: Health ${health.toFixed(1)}, RUL ${unit.estimated_rul}, ${unit.degradation_stage}`
                    : `Unit ${unitId}: No data`
                }
              >
                <span className="font-bold leading-none">{unitId}</span>
                <span className="text-[10px] leading-none opacity-90">
                  {unit ? health.toFixed(0) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
