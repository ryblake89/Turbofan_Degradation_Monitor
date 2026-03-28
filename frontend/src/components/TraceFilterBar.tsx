import { useState, useEffect } from "react";

const INTENT_OPTIONS = [
  { value: "", label: "All Intents" },
  { value: "status_check", label: "status_check" },
  { value: "anomaly_investigation", label: "anomaly_investigation" },
  { value: "maintenance_request", label: "maintenance_request" },
  { value: "fleet_overview", label: "fleet_overview" },
];

const OUTCOME_OPTIONS = [
  { value: "", label: "All Outcomes" },
  { value: "informational", label: "informational" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
  { value: "pending", label: "pending" },
];

interface TraceFilterBarProps {
  onFiltersChange: (filters: { unit_id?: number; intent?: string }) => void;
  onOutcomeChange: (outcome: string) => void;
  total: number;
  shownCount: number;
}

export default function TraceFilterBar({
  onFiltersChange,
  onOutcomeChange,
  total,
  shownCount,
}: TraceFilterBarProps) {
  const [unitInput, setUnitInput] = useState("");
  const [intent, setIntent] = useState("");
  const [outcome, setOutcome] = useState("");

  // Debounce unit ID input
  useEffect(() => {
    const timer = setTimeout(() => {
      const unitId = unitInput ? parseInt(unitInput, 10) : undefined;
      onFiltersChange({
        unit_id: unitId && !isNaN(unitId) ? unitId : undefined,
        intent: intent || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [unitInput, intent, onFiltersChange]);

  useEffect(() => {
    onOutcomeChange(outcome);
  }, [outcome, onOutcomeChange]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="number"
        min={1}
        max={100}
        placeholder="Filter by unit..."
        value={unitInput}
        onChange={(e) => setUnitInput(e.target.value)}
        className="h-8 w-36 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <select
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        className="h-8 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {INTENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="h-8 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="ml-auto text-xs text-muted-foreground">
        Showing {shownCount} of {total} traces
      </span>
    </div>
  );
}
