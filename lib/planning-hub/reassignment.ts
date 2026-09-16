/**
 * PLANNING-HUB-01A — which activities support inline reassignment in the
 * Wochenplaner (via WeekplannerPlanningSheet), vs edit-navigation only.
 */

import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type PlanningHubReassignContext = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  /** Standardplan only — alternative plans use operational sheet separately. */
  isStandardplan: boolean;
};

export function canInlineReassignItem(
  item: WeekplannerItem,
  context: PlanningHubReassignContext | undefined,
): boolean {
  if (!context?.isStandardplan) return false;
  if (item.type === "VERANSTALTUNG") return false;
  if (item.type === "TRAINING") return context.canManageTrainings;
  if (item.type === "MATCH" || item.type === "TOURNAMENT") return context.canManageEvents;
  return false;
}
