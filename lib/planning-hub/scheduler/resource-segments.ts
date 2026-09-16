import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

export type ResourceOccupancySegment = {
  segmentId: string;
  item: WeekplannerItem;
  resource: WeekplannerResourceRef;
  startAt: Date;
  endAt: Date;
};

export function resourcesForPlanningItem(
  item: WeekplannerItem,
  category: PlanningHubUrlState["resourceCategory"],
): WeekplannerResourceRef[] {
  if (category === "pitch") return item.pitchAllocations;
  const refs = [...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  const unique = new Map<string, WeekplannerResourceRef>();
  for (const ref of refs) unique.set(ref.facilityResourceId, ref);
  return [...unique.values()];
}

export function buildResourceSegmentsForDay(
  items: readonly WeekplannerItem[],
  category: PlanningHubUrlState["resourceCategory"],
): ResourceOccupancySegment[] {
  const segments: ResourceOccupancySegment[] = [];
  for (const item of items) {
    for (const resource of resourcesForPlanningItem(item, category)) {
      segments.push({
        segmentId: `${item.id}:${resource.facilityResourceId}`,
        item,
        resource,
        startAt: item.startAt,
        endAt: item.endAt,
      });
    }
  }
  return segments;
}

export type ResourceRow = {
  resourceId: string;
  name: string;
  facilityName: string;
  segments: ResourceOccupancySegment[];
};

export function groupSegmentsByResource(segments: readonly ResourceOccupancySegment[]): ResourceRow[] {
  const map = new Map<string, ResourceRow>();
  for (const segment of segments) {
    const row = map.get(segment.resource.facilityResourceId) ?? {
      resourceId: segment.resource.facilityResourceId,
      name: segment.resource.name,
      facilityName: segment.resource.facilityName,
      segments: [],
    };
    row.segments.push(segment);
    map.set(segment.resource.facilityResourceId, row);
  }
  return [...map.values()].sort((a, b) =>
    `${a.facilityName} ${a.name}`.localeCompare(`${b.facilityName} ${b.name}`, "de-CH"),
  );
}
