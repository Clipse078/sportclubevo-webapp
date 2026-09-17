import {
  computeResourceOccupancyWindow,
  resourceOccupancyWindowsOverlap,
} from "@/lib/facilities/resource-occupancy-window";
import { weekplannerCanonicalActivityKey } from "./canonical-activity-key";
import { facilityResourcesShareConflictCapacity } from "./pitch-capacity-overlap";
import type { WeekplannerConflict, WeekplannerItem, WeekplannerResourceRef } from "./types";

export type OccupiedWeekplannerResource = WeekplannerResourceRef & {
  effectiveStartAt: Date;
  effectiveEndAt: Date;
  resourceKind: "PITCH_HALL" | "DRESSING_ROOM";
};

export function collectWeekplannerOccupiedResources(item: WeekplannerItem): OccupiedWeekplannerResource[] {
  const pitchRefs = item.pitchAllocations.map((ref) => ({ ref, kind: "PITCH_HALL" as const }));
  const dressingRefs = item.dressingRoomAllocations.map((ref) => ({
    ref,
    kind: "DRESSING_ROOM" as const,
  }));

  const entries: { ref: WeekplannerResourceRef; kind: "PITCH_HALL" | "DRESSING_ROOM" }[] = [
    ...pitchRefs,
    ...dressingRefs,
  ];

  if (item.type === "MATCH") {
    for (const ref of item.awayDressingRoomAllocations) {
      entries.push({ ref, kind: "DRESSING_ROOM" });
    }
  }

  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      for (const ref of participant.dressingRoomAllocations) {
        entries.push({ ref, kind: "DRESSING_ROOM" });
      }
    }
  }

  return entries.map(({ ref, kind }) => {
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
      resourceKind: kind,
    };
  });
}

function findSharedResource(
  resourceA: OccupiedWeekplannerResource,
  resourcesB: OccupiedWeekplannerResource[],
): OccupiedWeekplannerResource | undefined {
  return resourcesB.find((candidate) => facilityResourcesShareConflictCapacity(resourceA, candidate));
}

export function detectPairwiseWeekplannerConflicts(
  items: readonly WeekplannerItem[],
): Map<string, Map<string, WeekplannerConflict>> {
  const conflictsById = new Map<string, Map<string, WeekplannerConflict>>();

  const withResources = items.map((item) => ({
    item,
    canonicalKey: weekplannerCanonicalActivityKey(item),
    resources: collectWeekplannerOccupiedResources(item),
  }));

  for (let i = 0; i < withResources.length; i += 1) {
    for (let j = i + 1; j < withResources.length; j += 1) {
      const a = withResources[i];
      const b = withResources[j];
      if (a.canonicalKey === b.canonicalKey) continue;

      for (const resourceA of a.resources) {
        const resourceB = findSharedResource(resourceA, b.resources);
        if (!resourceB) continue;
        if (!resourceOccupancyWindowsOverlap(resourceA, resourceB)) continue;

        const overlapStart = new Date(
          Math.max(resourceA.effectiveStartAt.getTime(), resourceB.effectiveStartAt.getTime()),
        );
        const overlapEnd = new Date(
          Math.min(resourceA.effectiveEndAt.getTime(), resourceB.effectiveEndAt.getTime()),
        );

        const conflict: WeekplannerConflict = {
          facilityResourceId: resourceB.facilityResourceId,
          facilityResourceName: resourceB.name,
          resourceKind: resourceA.resourceKind,
          partnerItemId: b.item.id,
          partnerTitle: b.item.title,
          overlapStartAt: overlapStart,
          overlapEndAt: overlapEnd,
          occupancyStartAt: resourceA.effectiveStartAt,
          occupancyEndAt: resourceA.effectiveEndAt,
        };

        const aMap = conflictsById.get(a.item.id) ?? new Map();
        aMap.set(`${conflict.facilityResourceId}:${b.item.id}`, conflict);
        conflictsById.set(a.item.id, aMap);

        const reverseConflict: WeekplannerConflict = {
          ...conflict,
          partnerItemId: a.item.id,
          partnerTitle: a.item.title,
          occupancyStartAt: resourceB.effectiveStartAt,
          occupancyEndAt: resourceB.effectiveEndAt,
        };
        const bMap = conflictsById.get(b.item.id) ?? new Map();
        bMap.set(`${reverseConflict.facilityResourceId}:${a.item.id}`, reverseConflict);
        conflictsById.set(b.item.id, bMap);
      }
    }
  }

  return conflictsById;
}

export function annotateWeekplannerConflicts(items: readonly WeekplannerItem[]): WeekplannerItem[] {
  const conflictsById = detectPairwiseWeekplannerConflicts(items);
  return items.map((item) => {
    const conflicts = conflictsById.get(item.id);
    return conflicts ? { ...item, conflicts: [...conflicts.values()] } : item;
  });
}
