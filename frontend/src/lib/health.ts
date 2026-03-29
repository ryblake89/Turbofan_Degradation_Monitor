/**
 * Canonical health thresholds and color utilities.
 *
 * The health label system defines:
 *   Healthy     ≥ 80
 *   Degrading   ≥ 50
 *   Critical    ≥ 25
 *   Near Failure < 25
 *
 * All color functions align to these breakpoints.
 */

export type HealthLevel = "healthy" | "degrading" | "critical" | "near_failure";

export const HEALTH_THRESHOLDS = {
  healthy: 80,
  degrading: 50,
  critical: 25,
} as const;

export function getHealthLevel(health: number): HealthLevel {
  if (health >= HEALTH_THRESHOLDS.healthy) return "healthy";
  if (health >= HEALTH_THRESHOLDS.degrading) return "degrading";
  if (health >= HEALTH_THRESHOLDS.critical) return "critical";
  return "near_failure";
}

/** Text color class (e.g. for inline health numbers). */
export function healthTextColor(health: number): string {
  const level = getHealthLevel(health);
  switch (level) {
    case "healthy":
      return "text-emerald-400";
    case "degrading":
      return "text-amber-400";
    case "critical":
      return "text-red-400";
    case "near_failure":
      return "text-red-500";
  }
}

/** Background color class with hover (e.g. heatmap cells). */
export function healthBgColor(health: number): string {
  const level = getHealthLevel(health);
  switch (level) {
    case "healthy":
      return "bg-emerald-600 hover:bg-emerald-500";
    case "degrading":
      return "bg-amber-600 hover:bg-amber-500";
    case "critical":
      return "bg-red-600 hover:bg-red-500";
    case "near_failure":
      return "bg-red-800 hover:bg-red-700";
  }
}

/** Solid background color class (e.g. indicator dots). */
export function healthDotColor(health: number): string {
  const level = getHealthLevel(health);
  switch (level) {
    case "healthy":
      return "bg-emerald-500";
    case "degrading":
      return "bg-amber-500";
    case "critical":
      return "bg-red-500";
    case "near_failure":
      return "bg-red-700";
  }
}

/** Text + bar color pair (e.g. health index progress bars). */
export function healthBarColors(health: number): { text: string; bar: string } {
  const level = getHealthLevel(health);
  switch (level) {
    case "healthy":
      return { text: "text-emerald-400", bar: "bg-emerald-500" };
    case "degrading":
      return { text: "text-amber-400", bar: "bg-amber-500" };
    case "critical":
      return { text: "text-red-400", bar: "bg-red-500" };
    case "near_failure":
      return { text: "text-red-500", bar: "bg-red-700" };
  }
}

/** Badge variant for shadcn Badge component. */
export function healthBadgeVariant(label: string): "outline" | "secondary" | "destructive" {
  if (label === "healthy") return "outline";
  if (label === "degrading") return "secondary";
  return "destructive";
}

/** Label-based color classes (text + bg/border for badge-style elements). */
export function healthLabelColors(label: string): { text: string; bg: string } {
  switch (label) {
    case "healthy":
      return { text: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
    case "degrading":
      return { text: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
    case "critical":
      return { text: "text-red-400", bg: "bg-red-500/15 border-red-500/30" };
    case "near_failure":
      return { text: "text-red-500", bg: "bg-red-600/20 border-red-500/40" };
    default:
      return { text: "text-muted-foreground", bg: "bg-muted border-border" };
  }
}

/** Label-based badge class string (combined bg + text + border). */
export function healthLabelBadge(label: string): string {
  const c = healthLabelColors(label);
  return `${c.bg} ${c.text}`;
}
