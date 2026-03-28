function healthColor(health: number) {
  if (health >= 60) return { text: "text-emerald-400", bar: "bg-emerald-500" };
  if (health >= 30) return { text: "text-amber-400", bar: "bg-amber-500" };
  if (health >= 15) return { text: "text-red-400", bar: "bg-red-500" };
  return { text: "text-red-500", bar: "bg-red-700" };
}

function labelBadge(label: string) {
  switch (label) {
    case "healthy":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "degrading":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "critical":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "near_failure":
      return "bg-red-600/20 text-red-300 border-red-500/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function HealthIndexToolCard({ result }: { result: Record<string, unknown> }) {
  const health = (result.health_index as number) ?? 0;
  const label = (result.health_label as string) ?? "unknown";
  const colors = healthColor(health);

  return (
    <div className="border border-border rounded-md px-3 py-2 flex items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground shrink-0">Health Index</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${Math.min(Math.max(health, 0), 100)}%` }}
        />
      </div>
      <span className={`text-sm font-mono font-bold shrink-0 ${colors.text}`}>
        {health.toFixed(1)}
      </span>
      <span className={`text-[10px] font-medium border rounded px-1.5 py-0 shrink-0 capitalize ${labelBadge(label)}`}>
        {label.replace("_", " ")}
      </span>
    </div>
  );
}
