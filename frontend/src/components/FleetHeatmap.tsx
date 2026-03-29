import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriorityUnit } from "@/types";
import { healthBgColor } from "@/lib/health";

interface Props {
  units: PriorityUnit[];
  isLoading: boolean;
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
          Click a unit to view details. Color: green (&ge;80) / amber (50–79) /
          red (&lt;50)
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
                className={`aspect-square rounded-sm flex flex-col items-center justify-center text-xs cursor-pointer transition-colors text-white ${healthBgColor(health)}`}
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
