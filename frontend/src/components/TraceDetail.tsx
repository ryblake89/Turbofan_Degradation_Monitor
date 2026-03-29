import { Check, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { sensorSymbol } from "@/lib/sensors";
import type { TraceEntry } from "@/types";

interface ToolCalled {
  tool: string;
  has_result: boolean;
}

import { healthTextColor, healthLabelBadge } from "@/lib/health";

function anomalyColor(score: number): string {
  if (score >= 60) return "text-emerald-400";
  if (score >= 30) return "text-amber-400";
  return "text-red-400";
}

function rulColor(rul: number): string {
  if (rul > 30) return "text-emerald-400";
  if (rul > 10) return "text-amber-400";
  return "text-red-400";
}

function trendBadgeClass(summary: string): string {
  switch (summary) {
    case "stable":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "gradual_degradation":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "accelerating":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function divergenceColor(value: number): string {
  if (value >= 0.4) return "bg-red-400/10 border-red-400/30 text-red-400";
  if (value >= 0.2) return "bg-amber-400/10 border-amber-400/30 text-amber-400";
  return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
}


function outcomeBadgeClass(outcome: string): string {
  switch (outcome) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rejected":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface TraceDetailProps {
  trace: TraceEntry;
}

export default function TraceDetail({ trace }: TraceDetailProps) {
  const tools: ToolCalled[] = Array.isArray(trace.tools_called)
    ? (trace.tools_called as unknown as ToolCalled[])
    : [];
  const ctx = trace.sensor_context as Record<string, unknown> | null;
  const isFleet = !trace.unit_id || trace.unit_id === 0;
  const unitLabel = isFleet ? "Fleet" : `Unit ${trace.unit_id}`;

  return (
    <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-4 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-foreground">
          Trace #{trace.id}
        </span>
        <span className="text-xs text-muted-foreground">
          {trace.created_at ? formatTimestamp(trace.created_at) : "\u2014"}
        </span>
      </div>

      {/* Query */}
      {trace.query && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Query
          </span>
          <p className="mt-0.5 text-foreground">{trace.query}</p>
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Intent
          </span>
          {trace.intent ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {trace.intent}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">&mdash;</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Unit
          </span>
          {isFleet ? (
            <span className="text-xs">{unitLabel}</span>
          ) : (
            <Link
              to={`/units/${trace.unit_id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {unitLabel}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Action
          </span>
          <span className="text-xs">{trace.action_taken ?? "\u2014"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Outcome
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${outcomeBadgeClass(trace.outcome ?? "")}`}
          >
            {trace.outcome ?? "unknown"}
          </Badge>
        </div>
      </div>

      {/* Tool Chain */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Tool Chain
        </span>
        {tools.length > 0 ? (
          <div className="mt-1 space-y-0.5">
            {tools.map((t, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground w-4 text-right">
                  {i + 1}.
                </span>
                <span className="text-foreground">{t.tool}</span>
                <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
                {t.has_result ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground italic">
            No tools called
          </p>
        )}
      </div>

      {/* Sensor Context — hide for fleet queries with default values */}
      {ctx && !isFleet && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Sensor Context
          </span>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
            {ctx.health_index != null && (
              <div>
                <span className="text-muted-foreground">Health Index: </span>
                <span className={healthTextColor(ctx.health_index as number)}>
                  {(ctx.health_index as number).toFixed(1)}
                </span>
              </div>
            )}
            {ctx.normalized_score != null && (
              <div>
                <span className="text-muted-foreground">Anomaly Score: </span>
                <span className={anomalyColor(ctx.normalized_score as number)}>
                  {(ctx.normalized_score as number).toFixed(1)}
                </span>
              </div>
            )}
            {ctx.estimated_rul != null && (
              <div>
                <span className="text-muted-foreground">RUL: </span>
                <span className={rulColor(ctx.estimated_rul as number)}>
                  {ctx.estimated_rul as number} cycles
                </span>
              </div>
            )}
            {ctx.degradation_stage != null && (
              <div>
                <span className="text-muted-foreground">Stage: </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${healthLabelBadge(ctx.degradation_stage as string)}`}
                >
                  {ctx.degradation_stage as string}
                </Badge>
              </div>
            )}
            {ctx.trend_summary != null && (
              <div>
                <span className="text-muted-foreground">Trend: </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${trendBadgeClass(ctx.trend_summary as string)}`}
                >
                  {(ctx.trend_summary as string).replace(/_/g, " ")}
                </Badge>
              </div>
            )}
            {Array.isArray(ctx.top_sensors) && ctx.top_sensors.length > 0 && (
              <div className="col-span-2 sm:col-span-3">
                <span className="text-muted-foreground">Top Sensors: </span>
                <span>{(ctx.top_sensors as string[]).map((s) => sensorSymbol(s)).join(", ")}</span>
              </div>
            )}
          </div>
          {!!ctx.divergence_scores &&
            typeof ctx.divergence_scores === "object" &&
            Object.keys(ctx.divergence_scores as object).length > 0 && (
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">Divergence: </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.entries(ctx.divergence_scores as Record<string, number>)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([pair, score]) => {
                      const labeled = pair.split("/").map((s) => sensorSymbol(s.trim())).join("/");
                      const val = typeof score === "number" ? score : 0;
                      return (
                        <span
                          key={pair}
                          className={`inline-flex items-center gap-1 px-1.5 py-0 rounded border text-[10px] font-mono ${divergenceColor(val)}`}
                        >
                          {labeled} <span className="font-bold">{val.toFixed(2)}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Recommendation */}
      {trace.recommendation && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Recommendation
          </span>
          <div className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-2.5 prose prose-sm prose-invert max-w-none text-foreground [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1.5 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:mt-1.5 [&_h3]:mb-1 [&_p]:text-xs [&_p]:my-1 [&_ul]:text-xs [&_ul]:my-0.5 [&_ul]:pl-3 [&_ol]:text-xs [&_ol]:my-0.5 [&_ol]:pl-3 [&_li]:my-0.5 [&_strong]:text-foreground [&_strong]:font-semibold [&_hr]:my-1.5 [&_hr]:border-border [&_code]:text-[10px] [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_table]:w-full [&_th]:text-left [&_th]:text-muted-foreground [&_th]:font-medium">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {trace.recommendation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
