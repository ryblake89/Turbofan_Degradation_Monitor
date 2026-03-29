import { usePageTitle } from "@/hooks/usePageTitle";
import { useFleetSummary } from "@/hooks/useFleetData";
import HealthSummaryCards from "@/components/HealthSummaryCards";
import FleetHeatmap from "@/components/FleetHeatmap";
import AlertList from "@/components/AlertList";
import Collapsible from "@/components/ui/Collapsible";

function AboutThisData() {
  return (
    <Collapsible title="Dataset & Methodology">
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
    </Collapsible>
  );
}

export default function FleetOverview() {
  usePageTitle("Fleet Overview");
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
          Real-time health monitoring across all 100 <strong className="text-red-400">failing</strong> turbofan units
        </p>
      </div>

      <AboutThisData />

      <HealthSummaryCards data={data} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FleetHeatmap units={data?.priority_list ?? []} isLoading={isLoading} />
        <AlertList units={data?.priority_list ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
