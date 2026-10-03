/**
 * SCE-PLANNER-UX-08-01-R2 — collapsible physical-pitch groups (presentation only).
 */

import { itemHasCanonicalConflictOnResource } from "@/lib/planning-hub/item-presenters";
import type { PlanningHubResourceCategory } from "@/lib/planning-hub/planner-url";
import type {
  ResourceTimelineFacilityGroup,
  ResourceTimelineLane,
} from "@/lib/planning-hub/resource-timeline/adaptive-lanes";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  resourceIdsMatchGroup,
  type PlanningResourceGroup,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ResourceOccupancySegment } from "@/lib/planning-hub/scheduler/resource-segments";

export function pitchGroupSupportsCollapse(group: ResourceTimelineFacilityGroup): boolean {
  if (group.lanes.length <= 1) return false;
  return group.lanes.some(
    (lane) => lane.presentationRole === "segment" || lane.presentationRole === "whole",
  );
}

export function shouldUsePitchGroupCollapse(
  resourceCategory: PlanningHubResourceCategory,
  group: ResourceTimelineFacilityGroup,
): boolean {
  return resourceCategory === "pitch" && pitchGroupSupportsCollapse(group);
}

export function pitchGroupDisclosureKey(group: ResourceTimelineFacilityGroup): string {
  return group.facilityId;
}

export function resolveAutoExpandedPitchGroupKeys(
  groups: readonly ResourceTimelineFacilityGroup[],
  resourceFilterIds: string[] | null,
  resourceCategory: PlanningHubResourceCategory,
): Set<string> {
  const expanded = new Set<string>();
  if (resourceCategory !== "pitch" || !resourceFilterIds?.length) return expanded;

  for (const group of groups) {
    if (!shouldUsePitchGroupCollapse(resourceCategory, group)) continue;
    const idsInGroup = new Set(group.lanes.map((l) => l.resourceId));
    const filterInGroup = resourceFilterIds.filter((id) => idsInGroup.has(id));
    if (filterInGroup.length > 0) {
      expanded.add(pitchGroupDisclosureKey(group));
    }
  }
  return expanded;
}

export type PitchGroupOverviewSummary =
  | { kind: "free"; label: "Frei" }
  | { kind: "conflict"; label: string; conflictItemCount: number }
  | { kind: "occupancy"; label: string; occupancyCount: number };

export function summarizePitchGroupOverview(lanes: readonly ResourceTimelineLane[]): PitchGroupOverviewSummary {
  const seenItems = new Set<string>();
  const conflictItemIds = new Set<string>();

  for (const lane of lanes) {
    for (const segment of lane.segments) {
      seenItems.add(segment.item.id);
      if (itemHasCanonicalConflictOnResource(segment.item, lane.resourceId)) {
        conflictItemIds.add(segment.item.id);
      }
    }
  }
  const conflictItems = conflictItemIds.size;

  if (conflictItems > 0) {
    const n = conflictItems;
    return {
      kind: "conflict",
      conflictItemCount: n,
      label: n === 1 ? "1 Konflikt" : `${n} Konflikte`,
    };
  }

  const occupancyCount = seenItems.size;
  if (occupancyCount === 0) {
    return { kind: "free", label: "Frei" };
  }
  return {
    kind: "occupancy",
    occupancyCount,
    label: occupancyCount === 1 ? "1 Belegung" : `${occupancyCount} Belegungen`,
  };
}

export type CollapsedPitchLaneSegment = {
  lane: ResourceTimelineLane;
  segment: ResourceOccupancySegment;
  segmentHint: string | null;
};

export function collectCollapsedPitchGroupSegments(
  lanes: readonly ResourceTimelineLane[],
): CollapsedPitchLaneSegment[] {
  const out: CollapsedPitchLaneSegment[] = [];
  for (const lane of lanes) {
    const hint =
      lane.presentationRole === "segment"
        ? lane.presentationPrimaryLabel
        : lane.presentationRole === "whole"
          ? "Gesamt"
          : null;
    for (const segment of lane.segments) {
      out.push({ lane, segment, segmentHint: hint });
    }
  }
  return out;
}

export function countVisibleResourceTimelineRows(
  groups: readonly ResourceTimelineFacilityGroup[],
  resourceCategory: PlanningHubResourceCategory,
  expandedGroupKeys: ReadonlySet<string>,
): number {
  let count = 0;
  for (const group of groups) {
    if (shouldUsePitchGroupCollapse(resourceCategory, group)) {
      const key = pitchGroupDisclosureKey(group);
      if (expandedGroupKeys.has(key)) {
        count += 1 + group.lanes.length;
      } else {
        count += 1;
      }
    } else {
      count += group.lanes.length;
    }
  }
  return count;
}

export function planningGroupsForCatalog(
  catalogGroups: readonly FacilityGroup[],
  category: "pitch" | "dressing",
): PlanningResourceGroup[] {
  return buildPlanningResourceGroupsFromFacilityGroups(catalogGroups, category);
}

export function groupMatchesResourceFilter(
  group: PlanningResourceGroup,
  resourceFilterIds: string[] | null,
): boolean {
  if (!resourceFilterIds?.length) return false;
  return resourceIdsMatchGroup(resourceFilterIds, group);
}
