import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";

/** Effective Garderobe timeline bounds for resource rows (not nominal activity). */
export function dressingSegmentDisplayWindow(
  activityStart: Date,
  activityEnd: Date,
  resource: WeekplannerResourceRef,
): { startAt: Date; endAt: Date } {
  return resourceSegmentDisplayWindow(activityStart, activityEnd, resource);
}
