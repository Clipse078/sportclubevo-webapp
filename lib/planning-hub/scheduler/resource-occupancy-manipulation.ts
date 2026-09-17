import { normalizeOccupancyBufferMinutes } from "@/lib/facilities/resource-occupancy-window";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

/** Minimum dressing occupancy span when resizing (UI guard). */
export const MIN_DRESSING_OCCUPANCY_MINUTES = 15;

export function buffersFromOccupancyInterval(
  activityStart: Date,
  activityEnd: Date,
  occupancyStart: Date,
  occupancyEnd: Date,
): { beforeMinutes: number; afterMinutes: number } {
  const beforeMinutes = normalizeOccupancyBufferMinutes(
    (activityStart.getTime() - occupancyStart.getTime()) / 60_000,
  );
  const afterMinutes = normalizeOccupancyBufferMinutes(
    (occupancyEnd.getTime() - activityEnd.getTime()) / 60_000,
  );
  return { beforeMinutes, afterMinutes };
}

export function isValidDressingOccupancySpan(occupancyStart: Date, occupancyEnd: Date): boolean {
  return (
    occupancyEnd.getTime() > occupancyStart.getTime() &&
    occupancyEnd.getTime() - occupancyStart.getTime() >= MIN_DRESSING_OCCUPANCY_MINUTES * 60_000
  );
}

export function applyDressingOccupancyBuffersToItem(
  item: WeekplannerItem,
  beforeMinutes: number,
  afterMinutes: number,
): WeekplannerItem {
  const unchangedFromCurrent =
    beforeMinutes === item.dressingRoomResolvedBeforeMinutes &&
    afterMinutes === item.dressingRoomResolvedAfterMinutes;
  const mode =
    unchangedFromCurrent && item.dressingRoomOccupancyMode === "DEFAULT" ? "DEFAULT" : "CUSTOM";
  const customBefore = mode === "CUSTOM" ? beforeMinutes : null;
  const customAfter = mode === "CUSTOM" ? afterMinutes : null;

  const patchRefs = (refs: typeof item.dressingRoomAllocations) =>
    refs.map((ref) => ({
      ...ref,
      occupancyBeforeMinutes: beforeMinutes,
      occupancyAfterMinutes: afterMinutes,
    }));

  const next: WeekplannerItem = {
    ...item,
    dressingRoomOccupancyMode: mode,
    dressingRoomOccupancyBeforeMinutes: customBefore,
    dressingRoomOccupancyAfterMinutes: customAfter,
    dressingRoomResolvedBeforeMinutes: beforeMinutes,
    dressingRoomResolvedAfterMinutes: afterMinutes,
    dressingRoomAllocations: patchRefs(item.dressingRoomAllocations),
    canonicalDressingRoomAllocations: patchRefs(item.canonicalDressingRoomAllocations),
  };

  if (item.type === "MATCH") {
    return {
      ...next,
      awayDressingRoomAllocations: patchRefs(item.awayDressingRoomAllocations),
    } as WeekplannerItem;
  }

  if (item.type === "TOURNAMENT") {
    return {
      ...next,
      participantAllocations: item.participantAllocations.map((participant) => ({
        ...participant,
        dressingRoomAllocations: patchRefs(participant.dressingRoomAllocations),
        canonicalDressingRoomAllocations: patchRefs(participant.canonicalDressingRoomAllocations),
      })),
    } as WeekplannerItem;
  }

  return next;
}

export { draftGeometryKey as draftOccupancyGeometryKey } from "@/lib/planning-hub/scheduler/draft-geometry-key";
