import { useState } from "react";
import { useFleetSummary } from "@/hooks/useFleetData";
import HealthSummaryCards from "@/components/HealthSummaryCards";
import FleetHeatmap from "@/components/FleetHeatmap";
import AlertList from "@/components/AlertList";
import { Card, CardContent } from "@/components/ui/card";
import { Info, ChevronDown, ChevronRight } from "lucide-react";

function AboutThisData() {
  const [open, setOpen] = useState(false);

  return (
    <Card size="sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Dataset & Methodology</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">NASA C-MAPSS FD001</strong> — 100 turbofan engines, run-to-failure simulation.
            Single fault mode (HPC degradation), single operating condition (sea level).
            21 sensors monitoring temperature, pressure, speed, and flow across 6 engine subsystems.
            <span className="italic ml-1">Saxena et al. 2008, NASA Prognostics Center of Excellence.</span>
          </p>
          <p>
            Most units show late-stage degradation because this is run-to-failure training data —
            critical/near-failure health status is expected, not a bug.
          </p>
          <p>
            <strong className="text-foreground">Methods:</strong> Isolation Forest anomaly detection,
            piecewise linear RUL estimation, CUSUM change-point detection,
            and a Neo4j knowledge graph for structural context.
            Agents use LangGraph multi-agent orchestration with Anthropic Claude.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function FleetOverview() {
  const { data, isLoading, error } = useFleetSummary(100);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">
            Failed to load fleet data
          </p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <p className="text-xs text-muted-foreground">
            Is the API running at localhost:8000?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fleet Overview</h2>
        <p className="text-sm text-muted-foreground">
          Real-time health monitoring across all 100 turbofan units
        </p>
      </div>

      <AboutThisData />

      <HealthSummaryCards data={data} isLoading={isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FleetHeatmap units={data?.priority_list ?? []} isLoading={isLoading} />
        <AlertList units={data?.priority_list ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
