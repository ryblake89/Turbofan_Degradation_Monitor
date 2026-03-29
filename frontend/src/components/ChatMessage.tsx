import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, User, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ToolCallCard from "@/components/ToolCallCard";
import RulToolCard from "@/components/RulToolCard";
import AnomalyToolCard from "@/components/AnomalyToolCard";
import HealthIndexToolCard from "@/components/HealthIndexToolCard";
import TrendToolCard from "@/components/TrendToolCard";
import FailureModesToolCard from "@/components/FailureModesToolCard";
import SensorContextToolCard from "@/components/SensorContextToolCard";
import RelatedUnitsToolCard from "@/components/RelatedUnitsToolCard";
import MaintenanceHistoryToolCard from "@/components/MaintenanceHistoryToolCard";
import MaintenanceSchedulerToolCard from "@/components/MaintenanceSchedulerToolCard";
import ComparisonToolCard from "@/components/ComparisonToolCard";
import DirectResponseCard from "@/components/DirectResponseCard";
import ApprovalCard from "@/components/ApprovalCard";
import type { ChatMessage as ChatMessageType } from "@/hooks/useAgentChat";

export const TOOL_CARD_REGISTRY: Record<
  string,
  React.ComponentType<{ result: Record<string, unknown> }>
> = {
  rul_estimate: RulToolCard,
  anomaly_check: AnomalyToolCard,
  health_index: HealthIndexToolCard,
  sensor_trend_analysis: TrendToolCard,
  graph_failure_modes: FailureModesToolCard,
  graph_sensor_context: SensorContextToolCard,
  graph_related_units: RelatedUnitsToolCard,
  graph_maintenance_history: MaintenanceHistoryToolCard,
  maintenance_scheduler: MaintenanceSchedulerToolCard,
  unit_comparison_summary: ComparisonToolCard as React.ComponentType<{ result: Record<string, unknown> }>,
  direct_knowledge_response: DirectResponseCard as React.ComponentType<{ result: Record<string, unknown> }>,
};

interface ChatMessageProps {
  message: ChatMessageType;
  onApprove?: (approved: boolean) => void;
  isLoading?: boolean;
  isLatestApproval?: boolean;
}

export default function ChatMessage({
  message,
  onApprove,
  isLoading = false,
  isLatestApproval = false,
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex gap-3">
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">You</span>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-2 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Agent
          </span>
          {message.intent && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.intent}
            </Badge>
          )}
          {message.unit_id != null && (
            <Link
              to={`/units/${message.unit_id}`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-md px-2.5 py-1 hover:bg-primary/5"
            >
              <ExternalLink className="h-3 w-3" />
              View Unit {message.unit_id} Detail
            </Link>
          )}
          {message.trace_id != null && (
            <Link
              to={`/traces?highlight=${message.trace_id}`}
              className="text-[10px] text-primary hover:underline"
            >
              Trace #{message.trace_id}
            </Link>
          )}
        </div>

        <div className="prose prose-sm prose-invert max-w-none text-foreground leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1.5 [&_p]:text-sm [&_p]:my-1.5 [&_ul]:text-sm [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:text-sm [&_ol]:my-1 [&_ol]:pl-4 [&_li]:my-1 [&_strong]:text-foreground [&_strong]:font-semibold [&_hr]:my-2 [&_hr]:border-border [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_table]:text-xs [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:pr-3 [&_th]:text-muted-foreground [&_th]:font-medium [&_td]:py-0.5 [&_td]:pr-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {message.tool_results && message.tool_results.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Tool Calls
            </span>
            {message.tool_results.map((tr, i) => {
              const SpecializedCard = TOOL_CARD_REGISTRY[tr.tool];
              if (SpecializedCard && tr.result) return <SpecializedCard key={i} result={tr.result} />;
              return <ToolCallCard key={i} {...tr} />;
            })}
          </div>
        )}

        {isLatestApproval && message.pending_action && onApprove && (
          <ApprovalCard
            action={message.pending_action}
            onApprove={onApprove}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
