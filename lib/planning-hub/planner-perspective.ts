/**
 * SCE-PLANNER-UX-08-01 — shared manipulation surface for resource timelines.
 */

import type { PlanningHubPerspective } from "./planner-url";

export type PlanningHubManipulationSurface = "kalender" | "resourceTimeline";

export function manipulationSurfaceForPerspective(
  perspective: PlanningHubPerspective,
): PlanningHubManipulationSurface {
  return perspective === "spielfeld" || perspective === "garderobe"
    ? "resourceTimeline"
    : "kalender";
}
