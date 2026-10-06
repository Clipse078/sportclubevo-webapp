/**
 * SCE-PLANNER-UX-08-07R5 — reconcile planner week after canonical training cancellation.
 */

import { defaultActivityIdForIncident } from "@/lib/planning-hub/conflict-resolution";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import { buildWeekplannerWeek } from "@/lib/weekplanner/view-model";
import { WEEKPLANNER_DEFAULT_TIMEZONE } from "@/lib/weekplanner/date";
import type { WeekplannerItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";

export function weekplannerTrainingItemSessionId(item: WeekplannerItem): string | null {
  if (item.type !== "TRAINING") return null;
  const sessionId = item.trainingSessionId?.trim();
  return sessionId || null;
}

export function removeCancelledTrainingSessionFromItems(
  items: readonly WeekplannerItem[],
  trainingSessionId: string,
): WeekplannerItem[] {
  const normalizedId = trainingSessionId.trim();
  if (!normalizedId) return [...items];
  return items.filter((item) => weekplannerTrainingItemSessionId(item) !== normalizedId);
}

export function applyTrainingCancellationToPlannerWeek(
  week: WeekplannerWeek,
  trainingSessionId: string,
  timeZone: string = WEEKPLANNER_DEFAULT_TIMEZONE,
): WeekplannerWeek {
  const flatItems = week.days.flatMap((day) => day.items);
  const withoutCancelled = removeCancelledTrainingSessionFromItems(flatItems, trainingSessionId).map(
    (item) => ({ ...item, conflicts: [] }),
  );
  if (withoutCancelled.length === flatItems.length) {
    return week;
  }
  return buildWeekplannerWeek({
    items: withoutCancelled,
    days: week.days.map((day) => day.dayKey),
    weekNumberLabel: week.weekNumberLabel,
    rangeLabel: week.rangeLabel,
    param: week.param,
    previousParam: week.previousParam,
    nextParam: week.nextParam,
    timeZone,
  });
}

export function reconcileConflictWorkspaceActivityId(
  currentActivityId: string | null,
  selectedIncident: PlanningConflictIncident | null,
  itemsById: ReadonlyMap<string, WeekplannerItem>,
): string | null {
  if (currentActivityId && itemsById.has(currentActivityId)) {
    return currentActivityId;
  }
  if (!selectedIncident) return null;
  return defaultActivityIdForIncident(
    selectedIncident,
    itemsById as Map<string, WeekplannerItem>,
  );
}

export function isWeekplannerTrainingCancellationTarget(
  item: WeekplannerItem,
  trainingSessionId: string,
): item is WeekplannerTrainingItem {
  return weekplannerTrainingItemSessionId(item) === trainingSessionId.trim();
}
