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
import type { MaintenanceLogResponse } from "@/types";

interface Props {
  data: MaintenanceLogResponse | undefined;
  isLoading: boolean;
}

function statusBadge(status: string) {
  const variant =
    status === "approved"
      ? "outline"
      : status === "pending"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function urgencyColor(urgency: string) {
  if (urgency === "immediate") return "text-red-400";
  if (urgency === "soon") return "text-amber-400";
  return "text-muted-foreground";
}

export default function MaintenanceHistory({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Maintenance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Maintenance History</CardTitle>
        <p className="text-xs text-muted-foreground">
          {entries.length === 0
            ? "No work orders for this unit"
            : `${entries.length} work order${entries.length > 1 ? "s" : ""}`}
        </p>
      </CardHeader>
      <CardContent className={entries.length > 0 ? "p-0" : undefined}>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No maintenance requests yet. Use the Agent Chat to request maintenance for this unit.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proposed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">
                    {entry.cmms_work_order_id ?? `#${entry.id}`}
                  </TableCell>
                  <TableCell className="capitalize">{entry.action_type}</TableCell>
                  <TableCell className={`capitalize ${urgencyColor(entry.urgency)}`}>
                    {entry.urgency}
                  </TableCell>
                  <TableCell>{statusBadge(entry.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.proposed_at
                      ? new Date(entry.proposed_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
