/**
 * SCE-PLANNER-UX-08-01 — adaptive resource timeline lanes (multi-tenant scalability).
 */

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { PlanningHubResourceCategory } from "@/lib/planning-hub/planner-url";
import type { ResourceRow } from "@/lib/planning-hub/scheduler/resource-segments";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  lanePresentationForSegment,
  type PlanningResourceSegmentRole,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";

/** Minimum readable label column width (px) — never shrink below this in product semantics. */
export const RESOURCE_TIMELINE_LABEL_MIN_WIDTH_PX = 148;

/** Minimum horizontal timeline width before scroll (px). */
export const RESOURCE_TIMELINE_MIN_TIMELINE_WIDTH_PX = 640;

export type ResourceTimelineLane = {
  resourceId: string;
  name: string;
  facilityId: string;
  facilityName: string;
  segments: ResourceRow["segments"];
  /** Presentation hierarchy — canonical mutation id remains resourceId. */
  presentationGroupKey: string;
  presentationPrimaryLabel: string;
  presentationSecondaryLabel: string | null;
  presentationTier: "primary" | "secondary";
  presentationRole: PlanningResourceSegmentRole;
};

export type ResourceTimelineFacilityGroup = {
  facilityId: string;
  facilityName: string;
  lanes: ResourceTimelineLane[];
};

export type BuildAdaptiveResourceTimelineInput = {
  catalogGroups: readonly FacilityGroup[];
  segmentRows: readonly ResourceRow[];
  facilityFilterId: string | null;
  resourceFilterIds: string[] | null;
  searchQuery?: string;
  resourceCategory?: PlanningHubResourceCategory;
};

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function laneMatchesSearch(lane: ResourceTimelineLane, query: string): boolean {
  if (!query) return true;
  const hay = `${lane.facilityName} ${lane.name}`.toLowerCase();
  return hay.includes(query);
}

function laneMatchesFilters(
  lane: ResourceTimelineLane,
  facilityFilterId: string | null,
  resourceFilterIds: string[] | null,
): boolean {
  if (facilityFilterId && lane.facilityId !== facilityFilterId) return false;
  if (resourceFilterIds?.length && !resourceFilterIds.includes(lane.resourceId)) return false;
  return true;
}

/**
 * Merges tenant facility catalog with day occupancy segments.
 * Empty lanes remain visible so planners can spot capacity gaps at scale.
 */
export function buildAdaptiveResourceTimeline(
  input: BuildAdaptiveResourceTimelineInput,
): ResourceTimelineFacilityGroup[] {
  const segmentByResourceId = new Map<string, ResourceRow>();
  for (const row of input.segmentRows) {
    segmentByResourceId.set(row.resourceId, row);
  }

  const search = normalizeSearch(input.searchQuery ?? "");
  const groups: ResourceTimelineFacilityGroup[] = [];

  const category: PlanningHubResourceCategory =
    input.resourceCategory ??
    (input.catalogGroups.some((g) => g.resources.some((r) => r.type === "DRESSING_ROOM")) &&
    !input.catalogGroups.some((g) =>
      g.resources.some((r) => r.type === "FULL_PITCH" || r.type === "HALF_PITCH"),
    )
      ? "dressing"
      : "pitch");

  const planningGroups = buildPlanningResourceGroupsFromFacilityGroups(input.catalogGroups, category);

  for (const planningGroup of planningGroups) {
    if (input.facilityFilterId && planningGroup.facilityId !== input.facilityFilterId) continue;

    const lanes: ResourceTimelineLane[] = [];
    for (const segment of planningGroup.segments) {
      const presentation = lanePresentationForSegment(planningGroup, segment);
      const lane: ResourceTimelineLane = {
        resourceId: segment.resourceId,
        name: segment.fullResource.name,
        facilityId: planningGroup.facilityId,
        facilityName: planningGroup.facilityName,
        segments: segmentByResourceId.get(segment.resourceId)?.segments ?? [],
        presentationGroupKey: planningGroup.groupKey,
        presentationPrimaryLabel: presentation.primaryLabel,
        presentationSecondaryLabel: presentation.secondaryLabel,
        presentationTier: presentation.tier,
        presentationRole: segment.role,
      };
      if (!laneMatchesFilters(lane, input.facilityFilterId, input.resourceFilterIds)) continue;
      if (!laneMatchesSearch(lane, search)) continue;
      lanes.push(lane);
    }

    if (lanes.length > 0) {
      groups.push({
        facilityId: planningGroup.groupKey,
        facilityName: planningGroup.label,
        lanes,
      });
    }
  }

  /** Occupied resources outside filtered catalog (e.g. historical refs) — preserve truth. */
  const catalogResourceIds = new Set(
    groups.flatMap((g) => g.lanes.map((l) => l.resourceId)),
  );
  const orphanRows = input.segmentRows.filter((row) => !catalogResourceIds.has(row.resourceId));
  if (orphanRows.length > 0) {
    groups.push({
      facilityId: "__orphan__",
      facilityName: "Weitere Ressourcen",
      lanes: orphanRows
        .filter((row) =>
          laneMatchesFilters(
            {
              resourceId: row.resourceId,
              name: row.name,
              facilityId: "__orphan__",
              facilityName: row.facilityName,
              segments: row.segments,
              presentationGroupKey: row.resourceId,
              presentationPrimaryLabel: row.name,
              presentationSecondaryLabel: row.facilityName,
              presentationTier: "primary",
              presentationRole: "standalone",
            },
            input.facilityFilterId,
            input.resourceFilterIds,
          ),
        )
        .filter((row) =>
          laneMatchesSearch(
            {
              resourceId: row.resourceId,
              name: row.name,
              facilityId: "__orphan__",
              facilityName: row.facilityName,
              segments: row.segments,
              presentationGroupKey: row.resourceId,
              presentationPrimaryLabel: row.name,
              presentationSecondaryLabel: row.facilityName,
              presentationTier: "primary",
              presentationRole: "standalone",
            },
            search,
          ),
        )
        .map((row) => ({
          resourceId: row.resourceId,
          name: row.name,
          facilityId: "__orphan__",
          facilityName: row.facilityName,
          segments: row.segments,
          presentationGroupKey: row.resourceId,
          presentationPrimaryLabel: row.name,
          presentationSecondaryLabel: row.facilityName,
          presentationTier: "primary" as const,
          presentationRole: "standalone" as const,
        })),
    });
  }

  groups.sort((a, b) => a.facilityName.localeCompare(b.facilityName, "de-CH"));
  return groups.filter((g) => g.lanes.length > 0);
}

export function flattenResourceTimelineLanes(
  groups: readonly ResourceTimelineFacilityGroup[],
): ResourceTimelineLane[] {
  return groups.flatMap((g) => g.lanes);
}

export function countResourceTimelineLanes(groups: readonly ResourceTimelineFacilityGroup[]): number {
  return flattenResourceTimelineLanes(groups).length;
}

export function pickFacilityGroupsForCategory(
  groups: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] },
  category: PlanningHubResourceCategory,
): FacilityGroup[] {
  return category === "dressing" ? groups.DRESSING_ROOM : groups.PITCH_HALL;
}
