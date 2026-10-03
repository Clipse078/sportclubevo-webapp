/**
 * SCE-PLANNER-UX-08-01 — adaptive resource timeline lanes (multi-tenant scalability).
 */

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { PlanningHubResourceCategory } from "@/lib/planning-hub/planner-url";
import type { ResourceRow } from "@/lib/planning-hub/scheduler/resource-segments";

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

  for (const facility of input.catalogGroups) {
    if (input.facilityFilterId && facility.facilityId !== input.facilityFilterId) continue;

    const lanes: ResourceTimelineLane[] = [];
    for (const resource of facility.resources) {
      const lane: ResourceTimelineLane = {
        resourceId: resource.id,
        name: resource.name,
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
        segments: segmentByResourceId.get(resource.id)?.segments ?? [],
      };
      if (!laneMatchesFilters(lane, input.facilityFilterId, input.resourceFilterIds)) continue;
      if (!laneMatchesSearch(lane, search)) continue;
      lanes.push(lane);
    }

    if (lanes.length > 0) {
      lanes.sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
      groups.push({
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
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
        .filter((row) => laneMatchesFilters(
          {
            resourceId: row.resourceId,
            name: row.name,
            facilityId: "__orphan__",
            facilityName: row.facilityName,
            segments: row.segments,
          },
          input.facilityFilterId,
          input.resourceFilterIds,
        ))
        .filter((row) =>
          laneMatchesSearch(
            {
              resourceId: row.resourceId,
              name: row.name,
              facilityId: "__orphan__",
              facilityName: row.facilityName,
              segments: row.segments,
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
