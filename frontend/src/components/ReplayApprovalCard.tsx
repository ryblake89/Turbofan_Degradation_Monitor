import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PendingAction } from "@/types";

interface ReplayApprovalCardProps {
  action: PendingAction;
  decision: "approved" | "rejected" | null;
  buttonPulse?: boolean;
}

export default function ReplayApprovalCard({
  action,
  decision,
  buttonPulse = false,
}: ReplayApprovalCardProps) {
  const wo = action.cmms_work_order_draft;

  return (
    <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-4 space-y-3 animate-scaleIn animate-pulseGlow">
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" />
        Maintenance Proposal — Requires Approval
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Unit:</span>{" "}
          <span className="font-medium">{action.unit_id}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Action:</span>{" "}
          <Badge variant="outline" className="ml-1 uppercase text-xs">
            {action.proposed_action}
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Urgency:</span>{" "}
          <span className="font-medium capitalize">{action.urgency}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Window:</span>{" "}
          <span className="font-medium">{action.proposed_window}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {action.evidence_summary}
      </p>

      {wo && (
        <div className="border-t border-border pt-2 space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Work Order:</span>{" "}
            {wo.work_order_id} &middot; {wo.equipment_id}
          </div>
          <p>{wo.description}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {decision ? (
          <Badge
            variant={decision === "approved" ? "default" : "destructive"}
            className="text-xs"
          >
            {decision === "approved" ? "Approved" : "Rejected"}
          </Badge>
        ) : (
          <>
            <Button
              size="sm"
              className={`bg-emerald-600 hover:bg-emerald-700 text-white ${
                buttonPulse ? "animate-subtlePulse" : ""
              }`}
            >
              Approve
            </Button>
            <Button size="sm" variant="destructive">
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
