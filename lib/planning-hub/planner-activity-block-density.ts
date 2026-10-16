import { CALENDAR_MIN_ACTIVITY_WIDTH_PX } from "@/lib/planning-hub/scheduler/calendar-day-layout";

/** Progressive disclosure tiers for Wochenplaner activity blocks (layout width in px). */
export type PlannerActivityBlockDensity = "WIDE" | "MEDIUM" | "NARROW" | "MICRO";

/** @deprecated Use {@link PlannerActivityBlockDensity.MICRO} — alias retained for transitional imports. */
export type PlannerActivityBlockDensityLegacy = PlannerActivityBlockDensity | "VERY_NARROW";

/** Readable full-detail band — aligned with {@link CALENDAR_MIN_ACTIVITY_WIDTH_PX} + headroom for pill + identity. */
export const PLANNER_ACTIVITY_BLOCK_DENSITY_WIDE_MIN_PX = 128;

/** Minimum width before NARROW/MICRO progressive stripping (calendar layout floor). */
export const PLANNER_ACTIVITY_BLOCK_DENSITY_MEDIUM_MIN_PX = CALENDAR_MIN_ACTIVITY_WIDTH_PX;

/** Below this width, type pills and secondary chrome are removed. */
export const PLANNER_ACTIVITY_BLOCK_DENSITY_NARROW_MIN_PX = 56;

/** Inline reschedule affordance needs clear horizontal headroom on WIDE cards only. */
export const PLANNER_ACTIVITY_BLOCK_INLINE_MANIPULATION_MIN_PX = 140;

export function resolvePlannerActivityBlockDensity(blockWidthPx: number): PlannerActivityBlockDensity {
  if (blockWidthPx < PLANNER_ACTIVITY_BLOCK_DENSITY_NARROW_MIN_PX) return "MICRO";
  if (blockWidthPx < PLANNER_ACTIVITY_BLOCK_DENSITY_MEDIUM_MIN_PX) return "NARROW";
  if (blockWidthPx < PLANNER_ACTIVITY_BLOCK_DENSITY_WIDE_MIN_PX) return "MEDIUM";
  return "WIDE";
}

export function plannerActivityBlockShowsTypePill(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerActivityBlockShowsCompactTypeLabel(density: PlannerActivityBlockDensity): boolean {
  return density === "NARROW" || density === "MICRO";
}

export function plannerActivityBlockShowsInlineTypeSuffix(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE";
}

export function plannerActivityBlockShowsActivityIcon(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerActivityBlockShowsTimeWithTypePresentation(
  density: PlannerActivityBlockDensity,
): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerActivityBlockShowsPrimaryIdentityLine(density: PlannerActivityBlockDensity): boolean {
  return density !== "MICRO";
}

export function plannerActivityBlockMicroShowsTypeOnly(
  density: PlannerActivityBlockDensity,
  hasTypePresentation: boolean,
): boolean {
  return density === "MICRO" && hasTypePresentation;
}

export function plannerActivityBlockShowsTeamContext(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE";
}

export function plannerActivityBlockShowsResourceLine(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE";
}

export function plannerActivityBlockShowsStandaloneTimeLine(
  density: PlannerActivityBlockDensity,
  hasTypePresentationRow: boolean,
): boolean {
  return density === "WIDE" && !hasTypePresentationRow;
}

export function plannerActivityBlockShowsEndTimeActionInline(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE";
}

export function plannerActivityBlockShowsOperationalIndicators(
  density: PlannerActivityBlockDensity,
): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerActivityBlockShowsInlineManipulationEdit(
  density: PlannerActivityBlockDensity,
  layoutWidthPx: number,
): boolean {
  if (density !== "WIDE") return false;
  return layoutWidthPx >= PLANNER_ACTIVITY_BLOCK_INLINE_MANIPULATION_MIN_PX;
}

export function plannerAggregateBlockShowsIdentityPreview(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE" || density === "MEDIUM";
}

export function plannerAggregateBlockShowsTime(density: PlannerActivityBlockDensity): boolean {
  return density !== "MICRO";
}

export function plannerAggregateBlockShowsOperationalLabels(density: PlannerActivityBlockDensity): boolean {
  return density === "WIDE";
}
