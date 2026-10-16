/** Progressive disclosure tiers for Wochenplaner activity blocks (container width in px). */
export type PlannerActivityBlockDensity = "WIDE" | "MEDIUM" | "NARROW" | "VERY_NARROW";

export function resolvePlannerActivityBlockDensity(blockWidthPx: number): PlannerActivityBlockDensity {
  if (blockWidthPx < 56) return "VERY_NARROW";
  if (blockWidthPx < 84) return "NARROW";
  if (blockWidthPx < 128) return "MEDIUM";
  return "WIDE";
}

export function plannerActivityBlockShowsInlineTypeSuffix(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerActivityBlockShowsActivityIcon(density: PlannerActivityBlockDensity): boolean {
  return density !== "VERY_NARROW";
}

export function plannerActivityBlockShowsTeamContext(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE" || density === "MEDIUM";
}
