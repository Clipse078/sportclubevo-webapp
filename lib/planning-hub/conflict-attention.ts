/**
 * PLANNING-HUB-01 — aggregates per-item Weekplanner conflicts into
 * operator-facing incidents for the attention layer.
 */

import { resourceOccupancyWindowsOverlap } from "@/lib/facilities/resource-occupancy-window";
import {
  collectWeekplannerOccupiedResources,
  type OccupiedWeekplannerResource,
} from "@/lib/weekplanner/conflict-detection";
import { weekplannerCanonicalActivityKey } from "@/lib/weekplanner/canonical-activity-key";
import { facilityResourcesShareConflictCapacity } from "@/lib/weekplanner/pitch-capacity-overlap";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

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

function findSharedResource(
  resourceA: OccupiedWeekplannerResource,
  resourcesB: OccupiedWeekplannerResource[],
): OccupiedWeekplannerResource | undefined {
  return resourcesB.find((candidate) => facilityResourcesShareConflictCapacity(resourceA, candidate));
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
    canonicalKey: weekplannerCanonicalActivityKey(item),
    resources: collectWeekplannerOccupiedResources(item),
  }));

  const seen = new Set<string>();
  const incidents: PlanningConflictIncident[] = [];

  for (let i = 0; i < withOccupancy.length; i += 1) {
    for (let j = i + 1; j < withOccupancy.length; j += 1) {
      const a = withOccupancy[i];
      const b = withOccupancy[j];
      if (a.canonicalKey === b.canonicalKey) continue;

      for (const resourceA of a.resources) {
        const resourceB = findSharedResource(resourceA, b.resources);
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
              facilityResourcesShareConflictCapacity(resource, resourceA) &&
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
          resourceKind: resourceA.resourceKind,
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
