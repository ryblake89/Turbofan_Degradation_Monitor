import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SensorChart from "@/components/SensorChart";
import DegradationCurve from "@/components/DegradationCurve";
import SubsystemDiagram from "@/components/SubsystemDiagram";
import MaintenanceHistory from "@/components/MaintenanceHistory";
import Collapsible from "@/components/ui/Collapsible";
import { useUnitStatus, useUnitSensors, useMaintenanceLog } from "@/hooks/useUnitData";
import { sensorLabel, sensorFullLabel, SENSORS, SENSOR_PHYSICS } from "@/lib/sensors";
import { healthTextColor, healthBadgeVariant } from "@/lib/health";
import { usePageTitle } from "@/hooks/usePageTitle";

function Skeleton() {
  return <div className="h-8 w-24 bg-muted animate-pulse rounded" />;
}

function HealthMethodology() {
  return (
    <Collapsible title="How is Health Index calculated?" variant="inline">
      <p><strong className="text-foreground">Health Index</strong> = 40% anomaly score + 60% RUL estimate (0–100 scale)</p>
      <p><strong>Anomaly score:</strong> Isolation Forest scores current sensor window (last 30 cycles) against healthy baselines</p>
      <p><strong>RUL estimate:</strong> Piecewise linear regression on key degrading sensors, bootstrapped confidence intervals</p>
      <p><strong>Labels:</strong> Healthy (&ge;80) · Degrading (&ge;50) · Critical (&ge;25) · Near Failure (&lt;25)</p>
      <p className="italic">Note: The paper's original health index used hidden flow/efficiency margins not in the dataset — this composite is a reconstruction.</p>
    </Collapsible>
  );
}

function DegradationPhysics({ flaggedSensors }: { flaggedSensors: string[] }) {
  const flaggedWithPhysics = flaggedSensors.filter((s) => SENSOR_PHYSICS[s]);

  if (flaggedWithPhysics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Degradation Physics</CardTitle>
        <p className="text-xs text-muted-foreground">
          Why flagged sensors are moving — HPC degradation cascade (Saxena et al. 2008)
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {flaggedWithPhysics.map((sId) => {
          const physics = SENSOR_PHYSICS[sId];
          const sensor = SENSORS[sId];
          return (
            <div key={sId} className="flex items-start gap-2 text-xs">
              {physics.direction === "increases" ? (
                <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
              )}
              <div>
                <span className="font-mono font-medium text-foreground">{sensor.symbol}</span>
                <span className="text-muted-foreground ml-1">{physics.direction}</span>
                <span className="text-muted-foreground"> — {physics.explanation}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function UnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const id = Number(unitId);
  usePageTitle(`Unit ${id}`);
  const [inputValue, setInputValue] = useState(String(id));

  useEffect(() => {
    setInputValue(String(id));
  }, [id]);

  const status = useUnitStatus(id);
  const sensors = useUnitSensors(id, 999);
  const maintenance = useMaintenanceLog(id);

  const flaggedSensors = useMemo(() => {
    if (!status.data) return [];
    const fromAnomaly = status.data.anomaly.top_contributing_sensors?.map(
      (s: { sensor: string }) => s.sensor,
    ) ?? [];
    const fromRul = status.data.rul.key_degrading_sensors ?? [];
    return [...new Set([...fromAnomaly, ...fromRul])];
  }, [status.data]);

  const isError = status.isError || sensors.isError;

  if (isError) {
    return (
      <div className="space-y-4">
        <Link to="/fleet" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Fleet
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-400 font-medium">Failed to load unit {unitId}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {status.error?.message || sensors.error?.message || "Check that the backend is running."}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { status.refetch(); sensors.refetch(); }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = status.data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/fleet" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Fleet
      </Link>

      {/* Unit Header */}
      <div className="flex flex-wrap items-end gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Unit {unitId}</h2>
        {status.isLoading ? (
          <Skeleton />
        ) : d ? (
          <>
            <span className={`text-3xl font-bold font-mono ${healthTextColor(d.health_index)}`}>
              {d.health_index.toFixed(1)}
            </span>
            <span className="text-muted-foreground text-sm">/100</span>
            <Badge variant={healthBadgeVariant(d.health_label)} className="capitalize">
              {d.health_label.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Cycle {d.rul.current_cycle} &middot; {d.rul.model_type}
            </span>
          </>
        ) : null}
      </div>

      {/* Unit Switcher */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { if (id > 1) navigate(`/units/${id - 1}`); }}
          disabled={id <= 1}
          className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Unit</span>
          <input
            type="number"
            min={1}
            max={100}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(inputValue, 10);
                if (n >= 1 && n <= 100) navigate(`/units/${n}`);
              }
            }}
            onBlur={() => {
              const n = parseInt(inputValue, 10);
              if (n >= 1 && n <= 100) navigate(`/units/${n}`);
              else setInputValue(String(id));
            }}
            className="w-12 text-center text-sm font-mono bg-muted border border-border rounded-md px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted-foreground">of 100</span>
        </div>
        <button
          onClick={() => { if (id < 100) navigate(`/units/${id + 1}`); }}
          disabled={id >= 100}
          className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Health summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Index */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Index</CardTitle>
          </CardHeader>
          <CardContent>
            {status.isLoading ? <Skeleton /> : (
              <div className={`text-2xl font-bold font-mono ${d ? healthTextColor(d.health_index) : ""}`}>
                {d ? `${d.health_index.toFixed(1)}` : "—"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Anomaly Score</CardTitle>
          </CardHeader>
          <CardContent>
            {status.isLoading ? <Skeleton /> : d ? (
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${d.anomaly.is_anomalous ? "text-red-400" : "text-emerald-400"}`}>
                  {d.anomaly.normalized_score.toFixed(1)}
                </span>
                {d.anomaly.is_anomalous && (
                  <Badge variant="destructive" className="text-[10px]">Anomalous</Badge>
                )}
              </div>
            ) : <span>—</span>}
          </CardContent>
        </Card>

        {/* RUL Estimate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RUL Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            {status.isLoading ? <Skeleton /> : d ? (
              <div>
                <span className={`text-2xl font-bold font-mono ${d.rul.estimated_rul <= 10 ? "text-red-400" : d.rul.estimated_rul <= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                  {d.rul.estimated_rul}
                </span>
                <span className="text-sm text-muted-foreground ml-1">cycles</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CI: [{d.rul.confidence_interval[0]}, {d.rul.confidence_interval[1]}]
                </p>
              </div>
            ) : <span>—</span>}
          </CardContent>
        </Card>

        {/* Degradation Stage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Degradation Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {status.isLoading ? <Skeleton /> : d ? (
              <Badge variant={healthBadgeVariant(d.rul.degradation_stage)} className="text-sm capitalize">
                {d.rul.degradation_stage.replace("_", " ")}
              </Badge>
            ) : <span>—</span>}
          </CardContent>
        </Card>
      </div>

      {/* Health Index Methodology */}
      <HealthMethodology />

      {/* Sensor Chart */}
      <SensorChart
        data={sensors.data}
        isLoading={sensors.isLoading}
        flaggedSensors={flaggedSensors}
      />

      {/* Degradation Curves */}
      <DegradationCurve
        sensorData={sensors.data}
        sensorDetail={d?.rul.sensor_detail}
        exponentialFit={d?.rul.exponential_fit}
        isLoading={sensors.isLoading || status.isLoading}
      />

      {/* Subsystem Diagram */}
      <SubsystemDiagram flaggedSensors={flaggedSensors} />

      {/* Degradation Physics */}
      <DegradationPhysics flaggedSensors={flaggedSensors} />

      {/* Bottom row: Top Contributing Sensors + Maintenance History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributing Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Contributing Sensors</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sensors driving the anomaly score
            </p>
          </CardHeader>
          <CardContent>
            {status.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : d?.anomaly.top_contributing_sensors?.length ? (
              <div className="space-y-2">
                {d.anomaly.top_contributing_sensors.map((s: { sensor: string; contribution: number }) => (
                  <div key={s.sensor} className="flex items-center gap-3">
                    <span className="font-mono text-xs w-48 shrink-0 truncate" title={sensorFullLabel(s.sensor)}>{sensorLabel(s.sensor)}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
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
            ) : (
              <p className="text-sm text-muted-foreground">No contributing sensors identified.</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance History */}
        <MaintenanceHistory data={maintenance.data} isLoading={maintenance.isLoading} />
      </div>
    </div>
  );
}
