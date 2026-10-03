/**
 * SCE-PLANNER-UX-08-01-R1/R2 — presentation-level resource hierarchy for the Wochenplaner.
 *
 * Groups canonical FacilityResource rows for UX only. Mutation identity remains each
 * resource id (FULL_PITCH / HALF_PITCH / DRESSING_ROOM). No fabricated site hierarchy.
 *
 * Pitch grouping uses the existing facility record: one facility may contain one FULL_PITCH
 * plus HALF_PITCH segments (FCA seed). Facility id/name come from the data model.
 *
 * Gap for FACILITY-MODEL-01: there is no separate “site → physical pitch” layer when multiple
 * pitches share one facility row; multi-pitch sites use multiple facility records today.
 */

import type { FacilityGroup, ResourceOption } from "@/components/admin/training/FacilityResourceSelector";

export type PlanningResourceSegmentRole = "whole" | "segment" | "standalone";

export type PlanningResourceSegment = {
  resourceId: string;
  /** Subordinate segment label (A, B, Gesamt) or room name for standalone. */
  segmentLabel: string;
  role: PlanningResourceSegmentRole;
  fullResource: ResourceOption;
};

export type PlanningResourceGroup = {
  /** Stable key — facility id for grouped pitches, resource id for standalone dressing rows. */
  groupKey: string;
  /** Primary physical resource label (facility name for subdividable pitches). */
  label: string;
  facilityId: string;
  facilityName: string;
  segments: PlanningResourceSegment[];
  /** All canonical resource ids represented by this group (for URL resFilter). */
  allResourceIds: string[];
};

export const PLANNER_RESOURCE_SCOPE_CHIP_GROUP_MAX = 4;
export const PLANNER_RESOURCE_SCOPE_CHIP_DRESSING_MAX = 8;

function halfPitchSegmentLabel(halfName: string, parentFullName: string): string {
  const trimmed = halfName.trim();
  if (/\s+[AB]$/.test(trimmed)) {
    return trimmed.slice(trimmed.lastIndexOf(" ") + 1);
  }
  const prefix = `${parentFullName.trim()} `;
  if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  return trimmed;
}

function buildPitchGroupFromFacility(facility: FacilityGroup): PlanningResourceGroup | null {
  const pitches = facility.resources.filter(
    (r) => r.type === "FULL_PITCH" || r.type === "HALF_PITCH",
  );
  if (pitches.length === 0) return null;

  const fullPitches = pitches.filter((r) => r.type === "FULL_PITCH");
  const halfPitches = pitches.filter((r) => r.type === "HALF_PITCH");

  const segments: PlanningResourceSegment[] = [];

  if (fullPitches.length === 1 && halfPitches.length > 0) {
    const full = fullPitches[0]!;
    segments.push({
      resourceId: full.id,
      segmentLabel: "Gesamt",
      role: "whole",
      fullResource: full,
    });
    for (const half of halfPitches) {
      segments.push({
        resourceId: half.id,
        segmentLabel: halfPitchSegmentLabel(half.name, full.name),
        role: "segment",
        fullResource: half,
      });
    }
  } else {
    for (const resource of pitches) {
      segments.push({
        resourceId: resource.id,
        segmentLabel: resource.name,
        role: resource.type === "HALF_PITCH" ? "segment" : "standalone",
        fullResource: resource,
      });
    }
  }

  return {
    groupKey: facility.facilityId,
    label: facility.facilityName,
    facilityId: facility.facilityId,
    facilityName: facility.facilityName,
    segments,
    allResourceIds: segments.map((s) => s.resourceId),
  };
}

function buildDressingGroupFromResource(facility: FacilityGroup, resource: ResourceOption): PlanningResourceGroup {
  return {
    groupKey: resource.id,
    label: resource.name,
    facilityId: facility.facilityId,
    facilityName: facility.facilityName,
    segments: [
      {
        resourceId: resource.id,
        segmentLabel: resource.name,
        role: "standalone",
        fullResource: resource,
      },
    ],
    allResourceIds: [resource.id],
  };
}

export function buildPlanningResourceGroupsFromFacilityGroups(
  facilityGroups: readonly FacilityGroup[],
  category: "pitch" | "dressing",
): PlanningResourceGroup[] {
  const groups: PlanningResourceGroup[] = [];

  for (const facility of facilityGroups) {
    if (category === "pitch") {
      const pitchGroup = buildPitchGroupFromFacility(facility);
      if (pitchGroup) groups.push(pitchGroup);
    } else {
      for (const resource of facility.resources) {
        if (resource.type !== "DRESSING_ROOM") continue;
        groups.push(buildDressingGroupFromResource(facility, resource));
      }
    }
  }

  groups.sort((a, b) =>
    `${a.facilityName} ${a.label}`.localeCompare(`${b.facilityName} ${b.label}`, "de-CH"),
  );
  return groups;
}

export function flattenPlanningResourceSegments(
  groups: readonly PlanningResourceGroup[],
): PlanningResourceSegment[] {
  return groups.flatMap((g) => g.segments);
}

export function resourceIdsMatchGroup(
  activeIds: string[] | null | undefined,
  group: PlanningResourceGroup,
): boolean {
  if (!activeIds?.length) return false;
  if (activeIds.length !== group.allResourceIds.length) return false;
  const set = new Set(activeIds);
  return group.allResourceIds.every((id) => set.has(id));
}

export function resourceIdsMatchSegment(
  activeIds: string[] | null | undefined,
  segmentResourceId: string,
): boolean {
  return activeIds?.length === 1 && activeIds[0] === segmentResourceId;
}

export type ResourceScopeSummaryInput = {
  groups: readonly PlanningResourceGroup[];
  activeIds: string[] | null;
  perspectiveLabel: "Spielfelder" | "Garderoben";
};

/** Confirmation / manipulation copy — physical pitch + segment when subdivided. */
export function formatManipulationResourceLabel(
  resourceId: string,
  groups: readonly PlanningResourceGroup[],
  fallbackName: string,
): string {
  for (const group of groups) {
    const seg = group.segments.find((s) => s.resourceId === resourceId);
    if (!seg) continue;
    if (group.segments.length > 1) {
      return `${group.label} · ${seg.segmentLabel}`;
    }
    return group.label;
  }
  return fallbackName;
}

export function formatPlanningResourceScopeSummary(input: ResourceScopeSummaryInput): string {
  const { groups, activeIds, perspectiveLabel } = input;
  if (!activeIds?.length) {
    return perspectiveLabel === "Garderoben" ? "Alle Garderoben" : "Alle Spielfelder";
  }

  const matchedGroups = groups.filter((g) => resourceIdsMatchGroup(activeIds, g));
  if (matchedGroups.length === 1) {
    return matchedGroups[0]!.label;
  }

  if (activeIds.length === 1) {
    for (const group of groups) {
      const seg = group.segments.find((s) => s.resourceId === activeIds[0]);
      if (seg) {
        if (seg.role === "segment" && group.segments.length > 1) {
          return `${group.label} · ${seg.segmentLabel}`;
        }
        return group.label;
      }
    }
  }

  const unit = perspectiveLabel === "Garderoben" ? "Garderoben" : "Spielfelder";
  return `${activeIds.length} ${unit}`;
}

export function shouldUseCompactResourceScopeSelector(
  groups: readonly PlanningResourceGroup[],
  category: "pitch" | "dressing",
): boolean {
  if (category === "pitch") {
    return groups.length > PLANNER_RESOURCE_SCOPE_CHIP_GROUP_MAX;
  }
  return groups.length > PLANNER_RESOURCE_SCOPE_CHIP_DRESSING_MAX;
}

export function lanePresentationForSegment(
  group: PlanningResourceGroup,
  segment: PlanningResourceSegment,
): {
  primaryLabel: string;
  secondaryLabel: string | null;
  tier: "primary" | "secondary";
} {
  if (segment.role === "segment") {
    return {
      primaryLabel: segment.segmentLabel,
      secondaryLabel: group.label,
      tier: "secondary",
    };
  }
  if (segment.role === "whole" && group.segments.length > 1) {
    return {
      primaryLabel: group.label,
      secondaryLabel: "Gesamt",
      tier: "primary",
    };
  }
  return {
    primaryLabel: group.label,
    secondaryLabel:
      group.facilityName !== group.label ? group.facilityName : null,
    tier: "primary",
  };
}
