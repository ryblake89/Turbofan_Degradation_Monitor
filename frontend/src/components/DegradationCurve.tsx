import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SENSOR_COLORS, sensorSymbol, sensorLabel } from "@/lib/sensors";
import type { SensorHistoryResponse, SensorDetail, ExponentialFit } from "@/types";

interface Props {
  sensorData: SensorHistoryResponse | undefined;
  sensorDetail: Record<string, SensorDetail> | undefined;
  exponentialFit: Record<string, ExponentialFit> | undefined;
  isLoading: boolean;
}

/** Rolling mean with window=10, min_periods=1 — matches backend smoothing. */
function rollingMean(values: number[], window = 10): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += values[j];
    result.push(sum / (i - start + 1));
  }
  return result;
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

export default function DegradationCurve({
  sensorData,
  sensorDetail,
  exponentialFit,
  isLoading,
}: Props) {
  const degradingSensors = useMemo(
    () => (sensorDetail ? Object.keys(sensorDetail) : []),
    [sensorDetail],
  );

  // Build chart data: per-cycle degradation position for each degrading sensor
  const { chartData, kneePoints } = useMemo(() => {
    if (!sensorData || !sensorDetail || degradingSensors.length === 0) {
      return { chartData: [], kneePoints: [] as { sensor: string; cycle: number }[] };
    }

    const cycles = sensorData.cycles;

    // Compute smoothed + normalized degradation position per sensor
    const sensorCurves: Record<string, number[]> = {};
    for (const sensor of degradingSensors) {
      const raw = sensorData.readings[sensor];
      if (!raw) continue;
      const detail = sensorDetail[sensor];
      const smoothed = rollingMean(raw);
      const range = detail.threshold - detail.baseline;
      if (Math.abs(range) < 1e-10) continue;

      sensorCurves[sensor] = smoothed.map((v) => {
        const pos = ((v - detail.baseline) / range) * 100;
        return Math.max(0, Math.min(150, pos)); // clip for display
      });
    }

    const rows = cycles.map((cycle, i) => {
      const row: Record<string, number> = { cycle };
      for (const sensor of degradingSensors) {
        if (sensorCurves[sensor]) {
          row[sensor] = sensorCurves[sensor][i];
        }
      }
      return row;
    });

    // Map knee_cycle_index to actual cycle number
    const knees = degradingSensors
      .filter((s) => sensorDetail[s] && sensorCurves[s])
      .map((s) => ({
        sensor: s,
        cycle: cycles[Math.min(sensorDetail[s].knee_cycle_index, cycles.length - 1)],
      }));

    return { chartData: rows, kneePoints: knees };
  }, [sensorData, sensorDetail, degradingSensors]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Degradation Curves</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!sensorData || !sensorDetail || degradingSensors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Degradation Curves</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No degradation detected — all sensors within healthy baseline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Degradation Curves</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Sensor position between healthy baseline (0%) and failure threshold (100%) — smoothed,
            full lifecycle
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="cycle"
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              label={{
                value: "Cycle",
                position: "insideBottomRight",
                offset: -5,
                fontSize: 11,
                fill: "#888",
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#888" }}
              tickLine={false}
              domain={[0, 110]}
              label={{
                value: "Degradation %",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#888",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.205 0 0)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#aaa", fontWeight: 600 }}
              formatter={(value, name) => [
                `${Number(value).toFixed(1)}%`,
                sensorLabel(String(name)),
              ]}
            />
            <Legend
              formatter={(value: string) => sensorSymbol(value)}
              wrapperStyle={{ fontSize: 11 }}
            />

            {/* 0% healthy baseline */}
            <ReferenceLine
              y={0}
              stroke="#22d3ee"
              strokeDasharray="6 3"
              strokeOpacity={0.3}
              label={{ value: "Healthy", position: "insideTopLeft", fontSize: 10, fill: "#666" }}
            />
            {/* 100% failure threshold */}
            <ReferenceLine
              y={100}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{ value: "Failure", position: "insideBottomLeft", fontSize: 10, fill: "#ef4444" }}
            />

            {/* Knee point vertical lines */}
            {kneePoints.map(({ sensor, cycle }) => (
              <ReferenceLine
                key={`knee-${sensor}`}
                x={cycle}
                stroke={SENSOR_COLORS[sensor] || "#888"}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            ))}

            {/* Degradation lines */}
            {degradingSensors.map((sensor) => (
              <Line
                key={sensor}
                type="monotone"
                dataKey={sensor}
                stroke={SENSOR_COLORS[sensor] || "#888"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Exponential Fit R² badges */}
        {exponentialFit && Object.keys(exponentialFit).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Saxena Exponential Fit — h(t) = 1 - exp(a·t<sup>b</sup>)
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(exponentialFit).map(([sensor, fit]) => (
                <div
                  key={sensor}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-mono ${fitQualityBg(fit.r_squared)}`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SENSOR_COLORS[sensor] || "#888" }}
                  />
                  <span className="text-muted-foreground">{sensorSymbol(sensor)}</span>
                  <span className={`font-bold ${fitQualityColor(fit.r_squared)}`}>
                    R²={fit.r_squared.toFixed(3)}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    ({fit.n_points_fitted}pts)
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              R² &gt; 0.85 = strong physics match · 0.7–0.85 = moderate · &lt; 0.7 = deviates from
              Saxena model. Noisy sensors may show lower R² even with correct exponential form.
            </p>
          </div>
        )}

        {/* Explainer dropdown */}
        <DegradationExplainer />
      </CardContent>
    </Card>
  );
}

function DegradationExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left mt-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Info className="h-3 w-3 shrink-0" />
        <span>How to read this chart</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </div>
      {open && (
        <div
          className="mt-2 text-xs text-muted-foreground space-y-1.5 pl-4 border-l border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <p>
            Each <strong className="text-foreground">colored line</strong> tracks one sensor's
            position between the population's healthy baseline (0%) and failure threshold (100%),
            smoothed with a 10-cycle rolling mean. A line at 60% means that sensor has moved 60% of
            the way from its healthy value toward the value typically seen at engine failure.
          </p>
          <p>
            The <strong className="text-foreground">vertical dashed lines</strong> mark each
            sensor's <strong className="text-foreground">knee point</strong> — the cycle where
            degradation begins to accelerate away from the stable baseline. Before the knee, readings
            fluctuate around normal operating values. After the knee, the sensor trends steadily
            toward the failure threshold. Knee detection uses a two-segment piecewise linear fit to
            find the breakpoint that minimizes residual error.
          </p>
          <p>
            The <strong className="text-foreground">horizontal dashed lines</strong> at 0% and 100%
            represent the population-average healthy baseline and failure threshold respectively,
            learned from the 100 run-to-failure training engines in FD001.
          </p>
          <p>
            Only sensors with detected degradation (knee not near end of life, degradation &gt; 3%)
            are shown. Sensors not yet degrading are omitted.
          </p>
        </div>
      )}
    </button>
  );
}
