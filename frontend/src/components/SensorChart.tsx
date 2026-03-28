import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  KEY_SENSOR_IDS,
  SENSOR_COLORS,
  SENSOR_GROUPS,
  sensorSymbol,
  sensorLabel,
  sensorFullLabel,
} from "@/lib/sensors";
import type { SensorHistoryResponse } from "@/types";


interface Props {
  data: SensorHistoryResponse | undefined;
  isLoading: boolean;
  flaggedSensors?: string[];
}

export default function SensorChart({ data, isLoading, flaggedSensors = [] }: Props) {
  const [activeSensors, setActiveSensors] = useState<Set<string>>(
    new Set(KEY_SENSOR_IDS),
  );
  const [normalized, setNormalized] = useState(true);
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  const flaggedSet = useMemo(() => new Set(flaggedSensors), [flaggedSensors]);

  // Transform column-oriented API data to row-oriented for Recharts
  const { chartData, sensorRanges } = useMemo(() => {
    if (!data) return { chartData: [], sensorRanges: {} as Record<string, { min: number; max: number }> };

    const ranges: Record<string, { min: number; max: number }> = {};
    for (const sensor of KEY_SENSOR_IDS) {
      const values = data.readings[sensor];
      if (!values) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      ranges[sensor] = { min, max: max === min ? min + 1 : max };
    }

    const rows = data.cycles.map((cycle, i) => {
      const row: Record<string, number> = { cycle };
      for (const sensor of KEY_SENSOR_IDS) {
        const values = data.readings[sensor];
        if (!values) continue;
        const raw = values[i];
        if (normalized) {
          const { min, max } = ranges[sensor];
          row[sensor] = (raw - min) / (max - min);
        } else {
          row[sensor] = raw;
        }
      }
      return row;
    });

    return { chartData: rows, sensorRanges: ranges };
  }, [data, normalized]);

  // Default brush to start at cycle 1 (index 0)
  const defaultBrushStart = 0;

  const handleBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (range.startIndex != null && range.endIndex != null) {
        setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
      }
    },
    [],
  );

  // Visible cycle range for the subtitle
  const visibleRange = useMemo(() => {
    if (!chartData.length) return null;
    const start = brushRange?.startIndex ?? defaultBrushStart;
    const end = brushRange?.endIndex ?? chartData.length - 1;
    return {
      count: end - start + 1,
      fromCycle: chartData[start]?.cycle,
      toCycle: chartData[end]?.cycle,
    };
  }, [brushRange, defaultBrushStart, chartData]);

  const toggleSensor = (sensor: string) => {
    setActiveSensors((prev) => {
      const next = new Set(prev);
      if (next.has(sensor)) {
        next.delete(sensor);
      } else {
        next.add(sensor);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sensor Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sensor Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No sensor data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Sensor Trends</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {visibleRange
              ? `Cycles ${visibleRange.fromCycle}–${visibleRange.toCycle} (${visibleRange.count} of ${data.total_cycles})`
              : `${data.total_cycles} cycles`}
            {normalized ? " — normalized 0-1" : " — raw values"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNormalized(!normalized)}
        >
          {normalized ? "Raw values" : "Normalize"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Sensor toggles grouped by physical type */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
          {SENSOR_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {group.label}
              </span>
              <div className="flex gap-1.5">
                {group.sensors.map((sensor) => {
                  const active = activeSensors.has(sensor);
                  const isFlagged = flaggedSet.has(sensor);
                  return (
                    <button
                      key={sensor}
                      onClick={() => toggleSensor(sensor)}
                      title={sensorFullLabel(sensor)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors border ${
                        active
                          ? "border-current opacity-100"
                          : "border-transparent opacity-40"
                      } ${isFlagged ? "ring-1 ring-red-500" : ""}`}
                      style={{ color: SENSOR_COLORS[sensor] }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SENSOR_COLORS[sensor] }}
                      />
                      {sensorSymbol(sensor)}
                      {isFlagged && <span className="text-red-400 text-[10px]">!</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="cycle"
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              label={{ value: "Cycle", position: "insideBottomRight", offset: -5, fontSize: 11, fill: "#888" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              domain={normalized ? [0, 1] : ["auto", "auto"]}
              label={
                normalized
                  ? { value: "Normalized", angle: -90, position: "insideLeft", fontSize: 11, fill: "#888" }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.205 0 0)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#aaa", fontWeight: 600 }}
              formatter={(value, name) => {
                const v = Number(value);
                const n = String(name);
                const label = sensorLabel(n);
                if (normalized && sensorRanges[n]) {
                  const { min, max } = sensorRanges[n];
                  const raw = v * (max - min) + min;
                  return [`${v.toFixed(3)} (${raw.toFixed(2)})`, label];
                }
                return [v.toFixed(4), label];
              }}
            />
            <Legend
              formatter={(value: string) => sensorSymbol(value)}
              wrapperStyle={{ fontSize: 11 }}
            />
            {KEY_SENSOR_IDS.filter((s) => activeSensors.has(s)).map((sensor) => (
              <Line
                key={sensor}
                type="monotone"
                dataKey={sensor}
                stroke={SENSOR_COLORS[sensor]}
                strokeWidth={flaggedSet.has(sensor) ? 2.5 : 1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
            <Brush
              dataKey="cycle"
              height={28}
              startIndex={brushRange?.startIndex ?? defaultBrushStart}
              endIndex={brushRange?.endIndex ?? chartData.length - 1}
              onChange={handleBrushChange}
              stroke="rgba(255,255,255,0.15)"
              fill="rgba(255,255,255,0.03)"
              travellerWidth={8}
              tickFormatter={(v: number) => String(v)}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
