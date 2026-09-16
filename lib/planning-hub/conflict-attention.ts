/**
 * PLANNING-HUB-01 — aggregates per-item Weekplanner conflicts into
 * operator-facing incidents for the attention layer.
 */

import {
  computeResourceOccupancyWindow,
  resourceOccupancyWindowsOverlap,
} from "@/lib/facilities/resource-occupancy-window";
import type { WeekplannerItem, WeekplannerResourceRef, WeekplannerWeek } from "@/lib/weekplanner/types";

export type PlanningResourceKind = "PITCH_HALL" | "DRESSING_ROOM";

export type PlanningConflictIncident = {
  id: string;
  facilityResourceId: string;
  facilityResourceName: string;
  resourceKind: PlanningResourceKind;
  dayKey: string;
  startAt: Date;
  endAt: Date;
  occupancyCount: number;
  itemIds: string[];
};

type Occupied = WeekplannerResourceRef & {
  effectiveStartAt: Date;
  effectiveEndAt: Date;
};

function collectOccupied(item: WeekplannerItem): Occupied[] {
  const refs: WeekplannerResourceRef[] = [...item.pitchAllocations, ...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }

  return refs.map((ref) => {
    const window = computeResourceOccupancyWindow(
      item.startAt,
      item.endAt,
      ref.occupancyBeforeMinutes,
      ref.occupancyAfterMinutes,
    );
    return {
      ...ref,
      effectiveStartAt: window.effectiveStartAt,
      effectiveEndAt: window.effectiveEndAt,
    };
  });
}

function inferResourceKind(item: WeekplannerItem, resourceId: string): PlanningResourceKind {
  if (item.pitchAllocations.some((r) => r.facilityResourceId === resourceId)) {
    return "PITCH_HALL";
  }
  return "DRESSING_ROOM";
}

function incidentKey(resourceId: string, startMs: number, endMs: number): string {
  return `${resourceId}|${startMs}|${endMs}`;
}

/**
 * Builds deduplicated conflict incidents for a resolved week (items already
 * annotated by detectWeekplannerConflicts).
 */
export function buildPlanningConflictIncidents(week: WeekplannerWeek): PlanningConflictIncident[] {
  const items = week.days.flatMap((day) => day.items.map((item) => ({ item, dayKey: day.dayKey })));
  const withOccupancy = items.map(({ item, dayKey }) => ({
    item,
    dayKey,
    resources: collectOccupied(item),
  }));

  const seen = new Set<string>();
  const incidents: PlanningConflictIncident[] = [];

  for (let i = 0; i < withOccupancy.length; i += 1) {
    for (let j = i + 1; j < withOccupancy.length; j += 1) {
      const a = withOccupancy[i];
      const b = withOccupancy[j];

      for (const resourceA of a.resources) {
        const resourceB = b.resources.find(
          (candidate) => candidate.facilityResourceId === resourceA.facilityResourceId,
        );
        if (!resourceB) continue;
        if (!resourceOccupancyWindowsOverlap(resourceA, resourceB)) continue;

        const key = incidentKey(
          resourceA.facilityResourceId,
          Math.max(resourceA.effectiveStartAt.getTime(), resourceB.effectiveStartAt.getTime()),
          Math.min(resourceA.effectiveEndAt.getTime(), resourceB.effectiveEndAt.getTime()),
        );
        if (seen.has(key)) continue;
        seen.add(key);

        const overlapStart = new Date(
          Math.max(resourceA.effectiveStartAt.getTime(), resourceB.effectiveStartAt.getTime()),
        );
        const overlapEnd = new Date(
          Math.min(resourceA.effectiveEndAt.getTime(), resourceB.effectiveEndAt.getTime()),
        );

        const participants = withOccupancy.filter((entry) =>
          entry.resources.some(
            (resource) =>
              resource.facilityResourceId === resourceA.facilityResourceId &&
              resourceOccupancyWindowsOverlap(resource, {
                ...resourceA,
                effectiveStartAt: overlapStart,
                effectiveEndAt: overlapEnd,
              }),
          ),
        );

        incidents.push({
          id: key,
          facilityResourceId: resourceA.facilityResourceId,
          facilityResourceName: resourceA.name,
          resourceKind: inferResourceKind(a.item, resourceA.facilityResourceId),
          dayKey: a.dayKey,
          startAt: overlapStart,
          endAt: overlapEnd,
          occupancyCount: participants.length,
          itemIds: participants.map((p) => p.item.id),
        });
      }
    }
  }

  incidents.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  return incidents;
}

export function countConflictsByKind(incidents: PlanningConflictIncident[]): {
  pitch: number;
  dressing: number;
} {
  let pitch = 0;
  let dressing = 0;
  for (const incident of incidents) {
    if (incident.resourceKind === "PITCH_HALL") pitch += 1;
    else dressing += 1;
  }
  return { pitch, dressing };
}
