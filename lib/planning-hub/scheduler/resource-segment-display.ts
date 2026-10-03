import { computeResourceOccupancyWindow } from "@/lib/facilities/resource-occupancy-window";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";

/** Effective resource-timeline bounds (reservation window, not nominal activity). */
export function resourceSegmentDisplayWindow(
  activityStart: Date,
  activityEnd: Date,
  resource: WeekplannerResourceRef,
): { startAt: Date; endAt: Date } {
  const window = computeResourceOccupancyWindow(
    activityStart,
    activityEnd,
    resource.occupancyBeforeMinutes,
    resource.occupancyAfterMinutes,
  );
  return { startAt: window.effectiveStartAt, endAt: window.effectiveEndAt };
}
