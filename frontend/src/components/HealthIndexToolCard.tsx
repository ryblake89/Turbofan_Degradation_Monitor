import { healthBarColors, healthLabelBadge } from "@/lib/health";

export default function HealthIndexToolCard({ result }: { result: Record<string, unknown> }) {
  const health = (result.health_index as number) ?? 0;
  const label = (result.health_label as string) ?? "unknown";
  const colors = healthBarColors(health);

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
      <span className={`text-[10px] font-medium border rounded px-1.5 py-0 shrink-0 capitalize ${healthLabelBadge(label)}`}>
        {label.replace("_", " ")}
      </span>
    </div>
  );
}
