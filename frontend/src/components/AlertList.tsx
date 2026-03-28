import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { PriorityUnit } from "@/types";

interface Props {
  units: PriorityUnit[];
  isLoading: boolean;
}

function healthBadge(label: string) {
  const variant =
    label === "healthy"
      ? "outline"
      : label === "degrading"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{label}</Badge>;
}

export default function AlertList({ units, isLoading }: Props) {
  const navigate = useNavigate();
  const topUnits = units.slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Priority Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Priority Alerts</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top 10 units by lowest health index
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Unit</TableHead>
              <TableHead className="w-20">Health</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">RUL</TableHead>
              <TableHead className="w-16">Cycle</TableHead>
              <TableHead className="w-20">Anomaly</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topUnits.map((unit) => (
              <TableRow key={unit.unit_id}>
                <TableCell className="font-mono font-bold">
                  {unit.unit_id}
                </TableCell>
                <TableCell className="font-mono">
                  {unit.health_index.toFixed(1)}
                </TableCell>
                <TableCell>{healthBadge(unit.health_label)}</TableCell>
                <TableCell className="font-mono">
                  {unit.estimated_rul}
                </TableCell>
                <TableCell className="font-mono">
                  {unit.current_cycle}
                </TableCell>
                <TableCell className="font-mono">
                  {unit.anomaly_normalized.toFixed(1)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/units/${unit.unit_id}`)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
