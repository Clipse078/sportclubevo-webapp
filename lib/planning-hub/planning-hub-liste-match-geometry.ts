import type { ActivityClippedDetailGeometry } from "@/lib/planning-hub/activity-clipped-detail";

/**
 * Desktop-forward geometry hints for Wochenplaner Liste match rows (clipped-detail offer only).
 * Fixture layout selection is driven by `listRowPresentation="programme-fixture"` (reference-split),
 * not by this width — see {@link planningHubListeMatchFixtureContractAtWidth}.
 */
export const PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY: ActivityClippedDetailGeometry = {
  blockWidthPx: 1120,
  blockHeightPx: 120,
  compact: false,
} as const;

/** sm breakpoint — reference-split meta + fixture columns expect row-level width at/above this. */
export const PLANNING_HUB_LISTE_MATCH_DESKTOP_MIN_WIDTH_PX = 640;

export type PlanningHubListeMatchFixtureContract = "reference-split" | "planner-liste";

/**
 * Documents which fixture band contract applies for a planner list row width.
 * `programme-fixture` (Matchcenter parity) always uses reference-split regardless of width.
 */
export function planningHubListeMatchFixtureContractAtWidth(
  measuredWidthPx: number | null,
): PlanningHubListeMatchFixtureContract {
  void measuredWidthPx;
  return "reference-split";
}
