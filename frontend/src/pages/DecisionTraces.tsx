import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTraces, type TraceFilters } from "@/hooks/useDecisionTraces";
import TraceFilterBar from "@/components/TraceFilterBar";
import TraceListItem from "@/components/TraceListItem";
import TraceDetail from "@/components/TraceDetail";

function AboutDecisionTraces() {
  const [open, setOpen] = useState(false);

  return (
    <Card size="sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">About Decision Traces</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
          <p>
            Every agent interaction is logged as an immutable <strong className="text-foreground">decision trace</strong> —
            a complete record of the system's reasoning chain from question to recommendation.
          </p>
          <p>
            Each trace captures: the user's <strong className="text-foreground">query</strong>, the
            system's <strong className="text-foreground">intent classification</strong> (anomaly investigation,
            maintenance request, fleet overview, etc.), the <strong className="text-foreground">tool chain</strong> (which
            tools ran in what order and whether they succeeded), the <strong className="text-foreground">sensor
            context</strong> (the data snapshot the agent saw at decision time), and
            the <strong className="text-foreground">recommendation</strong> (the LLM's synthesized response).
          </p>
          <p>
            Decision traces enable <strong className="text-foreground">audit, reproducibility, and
            accountability</strong> for autonomous maintenance recommendations. If the system proposes a
            borescope inspection, the trace shows exactly what data led to that recommendation.
          </p>
          <p>
            Traces are linked from Agent Chat responses via the <strong className="text-foreground">"Trace #N"</strong> link
            in the message metadata row. You can also filter traces by unit, intent type, or outcome using the filter bar below.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function DecisionTraces() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [filters, setFilters] = useState<TraceFilters>({});
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(
    highlightId ? parseInt(highlightId, 10) : null
  );

  const { data, isLoading, isError, isFetching, refetch } = useTraces(filters);

  // Auto-expand highlighted trace when data loads
  useEffect(() => {
    if (highlightId && data?.traces) {
      const id = parseInt(highlightId, 10);
      if (data.traces.some((t) => t.id === id)) {
        setExpandedId(id);
      }
    }
  }, [highlightId, data?.traces]);

  const handleFiltersChange = useCallback(
    (f: { unit_id?: number; intent?: string }) => {
      setFilters((prev) => ({ ...prev, ...f }));
      setExpandedId(null);
    },
    []
  );

  const handleOutcomeChange = useCallback((outcome: string) => {
    setOutcomeFilter(outcome);
    setExpandedId(null);
  }, []);

  const filteredTraces = useMemo(() => {
    if (!data?.traces) return [];
    if (!outcomeFilter) return data.traces;
    return data.traces.filter((t) => t.outcome === outcomeFilter);
  }, [data?.traces, outcomeFilter]);

  const total = data?.total ?? 0;
  const hasData = !!data;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Decision Traces</h2>

      <AboutDecisionTraces />

      <TraceFilterBar
        onFiltersChange={handleFiltersChange}
        onOutcomeChange={handleOutcomeChange}
        total={total}
        shownCount={filteredTraces.length}
      />

      {isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load decision traces. Is the backend running?
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-primary underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : isLoading && !hasData ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTraces.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {isFetching ? "Loading..." : "No decision traces found."}
          </p>
          {!isFetching && (
            <p className="mt-1 text-xs text-muted-foreground">
              Start a conversation in{" "}
              <Link to="/chat" className="text-primary underline hover:no-underline">
                Agent Chat
              </Link>{" "}
              to generate traces.
            </p>
          )}
        </div>
      ) : (
        <div className={`rounded-lg border border-border bg-card overflow-hidden ${isFetching ? "opacity-60 transition-opacity" : ""}`}>
          {filteredTraces.map((trace) => (
            <div key={trace.id}>
              <TraceListItem
                trace={trace}
                isExpanded={expandedId === trace.id}
                onToggle={() =>
                  setExpandedId(expandedId === trace.id ? null : trace.id)
                }
              />
              {expandedId === trace.id && <TraceDetail trace={trace} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
