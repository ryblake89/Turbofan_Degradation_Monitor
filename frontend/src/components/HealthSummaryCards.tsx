import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FleetSummaryResponse } from "@/types";
import { Activity, AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";
import { healthTextColor } from "@/lib/health";

interface Props {
  data: FleetSummaryResponse | undefined;
  isLoading: boolean;
}

function Skeleton() {
  return <div className="h-8 w-20 bg-muted animate-pulse rounded" />;
}

export default function HealthSummaryCards({ data, isLoading }: Props) {
  const cards = [
    {
      title: "Total Units",
      value: data?.total_units,
      icon: Activity,
      color: "text-foreground",
    },
    {
      title: "Critical",
      value: data?.units_critical,
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      title: "Degrading",
      value: data?.units_degrading,
      icon: TrendingDown,
      color: "text-amber-500",
    },
    {
      title: "Healthy",
      value: data?.units_healthy,
      icon: CheckCircle,
      color: "text-emerald-500",
    },
    {
      title: "Fleet Health Avg",
      value: data ? `${data.fleet_health_avg.toFixed(1)}/100` : undefined,
      icon: Activity,
      color: data ? healthTextColor(data.fleet_health_avg) : "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map(({ title, value, icon: Icon, color }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <Icon className={`h-4 w-4 ${color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton />
            ) : (
              <div className={`text-2xl font-bold ${color}`}>
                {value ?? "—"}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
