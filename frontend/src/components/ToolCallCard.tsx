import { useState } from "react";
import { ChevronRight, ChevronDown, Check, X } from "lucide-react";
import type { ToolResult } from "@/types";

function truncateJson(obj: unknown, maxLength = 800): string {
  const str = JSON.stringify(obj, null, 2);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "\n  …truncated";
}

export default function ToolCallCard({ tool, result, error }: ToolResult) {
  const [expanded, setExpanded] = useState(false);
  const hasError = !!error;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-foreground">{tool}</span>
        <span className="flex-1 border-b border-dotted border-muted-foreground/30 mx-1" />
        {hasError ? (
          <X className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          {hasError ? (
            <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
              {error}
            </pre>
          ) : result ? (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-64 overflow-auto">
              {truncateJson(result)}
            </pre>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No output
            </span>
          )}
        </div>
      )}
    </div>
  );
}
