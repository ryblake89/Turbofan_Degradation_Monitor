import { Check, ChevronRight } from "lucide-react";
import type { PipelineNode } from "@/data/heroReplayScript";

interface ReplayPipelineProps {
  nodes: readonly string[];
  activeNode: PipelineNode | null;
  completedNodes: PipelineNode[];
  allComplete?: boolean;
}

const NODE_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  diagnostic: "Diagnostic",
  ops_planning: "Ops Planning",
  approval_gate: "Approval",
  action_executor: "Executor",
  trace_logger: "Trace",
};

export default function ReplayPipeline({
  nodes,
  activeNode,
  completedNodes,
  allComplete = false,
}: ReplayPipelineProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap px-1 py-2">
      {nodes.map((node, i) => {
        const isActive = node === activeNode;
        const isCompleted = completedNodes.includes(node as PipelineNode);

        let pillClass =
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all duration-300";

        if (isActive) {
          pillClass +=
            " border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-subtlePulse";
        } else if (isCompleted) {
          pillClass +=
            " border-emerald-500/30 text-emerald-600";
          if (allComplete) {
            pillClass += " animate-pipelineFlourish";
          }
        } else {
          pillClass += " border-border text-muted-foreground/50";
        }

        return (
          <span key={node} className="inline-flex items-center gap-1">
            <span className={pillClass}>
              {isCompleted && (
                <Check className="h-2.5 w-2.5" />
              )}
              {NODE_LABELS[node] ?? node}
            </span>
            {i < nodes.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
            )}
          </span>
        );
      })}
    </div>
  );
}
