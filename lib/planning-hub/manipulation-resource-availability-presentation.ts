/**
 * SCE-PLANNER-UX-08-05R4 — adaptive manipulation availability presentation (UX only).
 *
 * Single policy for pitch and dressing inventories. Availability truth remains
 * `manipulation-resource-availability.ts`.
 */

import type { ManipulationResourceAvailability } from "@/lib/planning-hub/manipulation-resource-availability";
import {
  formatManipulationResourceLabel,
  type PlanningResourceGroup,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";

export type ManipulationResourceAvailabilityPresentationMode =
  | "COMPACT_MATRIX"
  | "GROUPED_MATRIX"
  | "LARGE_INVENTORY";

/**
 * Initial UX thresholds (physical pitch / dressing room groups, not raw segment count).
 * Tune here — do not scatter magic numbers in components.
 */
export const MANIPULATION_AVAILABILITY_PRESENTATION_POLICY = {
  compactMatrixMaxPhysicalGroups: 6,
  groupedMatrixMaxPhysicalGroups: 12,
  bestAlternativesMax: 3,
} as const;

export function deriveManipulationResourceAvailabilityPresentationMode(
  physicalGroupCount: number,
): ManipulationResourceAvailabilityPresentationMode {
  const { compactMatrixMaxPhysicalGroups, groupedMatrixMaxPhysicalGroups } =
    MANIPULATION_AVAILABILITY_PRESENTATION_POLICY;
  if (physicalGroupCount <= compactMatrixMaxPhysicalGroups) return "COMPACT_MATRIX";
  if (physicalGroupCount <= groupedMatrixMaxPhysicalGroups) return "GROUPED_MATRIX";
  return "LARGE_INVENTORY";
}

export function manipulationAvailabilityPresentationUsesAdaptiveControls(
  mode: ManipulationResourceAvailabilityPresentationMode,
): boolean {
  return mode !== "COMPACT_MATRIX";
}

export function manipulationAvailabilitySiteGroupsDefaultCollapsed(
  mode: ManipulationResourceAvailabilityPresentationMode,
): boolean {
  return mode === "LARGE_INVENTORY";
}

function rankAvailableEntry(
  entry: ManipulationResourceAvailability,
  stableIndex: number,
  currentResourceRef: WeekplannerResourceRef | null,
): number {
  const currentFacilityId = currentResourceRef?.facilityId ?? null;
  const currentType = currentResourceRef?.resourceType ?? null;
  const sameFacility =
    currentFacilityId !== null && entry.resourceRef.facilityId === currentFacilityId ? 0 : 1;
  const sameType =
    currentType !== null && entry.resourceRef.resourceType === currentType ? 0 : 1;
  return sameFacility * 10 + sameType * 5 + stableIndex;
}

/** Ranked AVAILABLE alternatives (excludes current); reuses R2 recommendation criteria. */
export function pickBestManipulationAlternatives(
  entries: readonly ManipulationResourceAvailability[],
  currentResourceRef: WeekplannerResourceRef | null,
  maxCount: number = MANIPULATION_AVAILABILITY_PRESENTATION_POLICY.bestAlternativesMax,
): ManipulationResourceAvailability[] {
  const candidates = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.state === "AVAILABLE" && !entry.isCurrent);

  candidates.sort(
    (a, b) =>
      rankAvailableEntry(a.entry, a.index, currentResourceRef) -
      rankAvailableEntry(b.entry, b.index, currentResourceRef),
  );

  return candidates.slice(0, maxCount).map(({ entry }) => entry);
}

export type ManipulationPhysicalGroupAvailabilityKind = "available" | "partial" | "occupied";

export function classifyManipulationPhysicalGroupAvailability(
  group: PlanningResourceGroup,
  entryById: ReadonlyMap<string, ManipulationResourceAvailability>,
): ManipulationPhysicalGroupAvailabilityKind {
  const states = group.segments
    .map((s) => entryById.get(s.resourceId)?.state)
    .filter((s): s is NonNullable<typeof s> => s != null);

  if (states.length === 0) return "occupied";
  if (states.some((s) => s === "AVAILABLE")) return "available";
  if (states.some((s) => s === "PARTIAL")) return "partial";
  return "occupied";
}

export type ManipulationPhysicalGroupAvailabilitySummary = {
  pitchCount: number;
  availableCount: number;
  partialCount: number;
  occupiedCount: number;
};

export function summarizeManipulationPhysicalGroups(
  groups: readonly PlanningResourceGroup[],
  entryById: ReadonlyMap<string, ManipulationResourceAvailability>,
): ManipulationPhysicalGroupAvailabilitySummary {
  let availableCount = 0;
  let partialCount = 0;
  let occupiedCount = 0;

  for (const group of groups) {
    const kind = classifyManipulationPhysicalGroupAvailability(group, entryById);
    if (kind === "available") availableCount += 1;
    else if (kind === "partial") partialCount += 1;
    else occupiedCount += 1;
  }

  return {
    pitchCount: groups.length,
    availableCount,
    partialCount,
    occupiedCount,
  };
}

/** Fixed copy for site / facility group headers (de-CH). */
export function formatManipulationSiteGroupSummaryLine(
  summary: ManipulationPhysicalGroupAvailabilitySummary,
  resourceKind: "PITCH_HALL" | "DRESSING_ROOM",
): string {
  const unit = resourceKind === "PITCH_HALL" ? "Plätze" : "Garderoben";
  const chunks: string[] = [`${summary.pitchCount} ${unit}`];
  if (summary.availableCount > 0) chunks.push(`${summary.availableCount} frei`);
  if (summary.partialCount > 0) chunks.push(`${summary.partialCount} teilweise`);
  if (summary.occupiedCount > 0) chunks.push(`${summary.occupiedCount} belegt`);
  return chunks.join(" · ");
}

export type ManipulationAvailabilitySiteGroup = {
  siteKey: string;
  siteLabel: string;
  groups: PlanningResourceGroup[];
};

/**
 * Presentation-only site buckets using canonical `facilityName` (no fabricated Site entity).
 * FACILITY-MODEL-01 may introduce a dedicated Site/Anlage layer later.
 */
export function buildManipulationAvailabilitySiteGroups(
  groups: readonly PlanningResourceGroup[],
): ManipulationAvailabilitySiteGroup[] {
  const order: string[] = [];
  const map = new Map<string, PlanningResourceGroup[]>();

  for (const group of groups) {
    const key = group.facilityName.trim() || group.facilityId;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(group);
  }

  return order.map((siteKey) => ({
    siteKey,
    siteLabel: siteKey,
    groups: map.get(siteKey)!,
  }));
}

export function normalizeManipulationAvailabilitySearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function planningResourceGroupMatchesSearch(
  group: PlanningResourceGroup,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  const haystack = [
    group.label,
    group.facilityName,
    ...group.segments.map((s) => s.segmentLabel),
    ...group.segments.map((s) => s.fullResource.name),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function filterManipulationAvailabilityGroups(input: {
  groups: readonly PlanningResourceGroup[];
  entryById: ReadonlyMap<string, ManipulationResourceAvailability>;
  searchQuery: string;
  freeOnly: boolean;
  currentResourceId: string;
}): PlanningResourceGroup[] {
  const normalized = normalizeManipulationAvailabilitySearchQuery(input.searchQuery);

  return input.groups.filter((group) => {
    const hasCurrent = group.segments.some((s) => s.resourceId === input.currentResourceId);
    if (input.freeOnly) {
      const kind = classifyManipulationPhysicalGroupAvailability(group, input.entryById);
      if (kind !== "available" && !hasCurrent) return false;
    }
    if (!planningResourceGroupMatchesSearch(group, normalized)) return false;
    return group.segments.some((s) => input.entryById.has(s.resourceId));
  });
}

export function formatManipulationAlternativeLabel(
  entry: ManipulationResourceAvailability,
  groups: readonly PlanningResourceGroup[],
): string {
  return formatManipulationResourceLabel(
    entry.resourceId,
    groups,
    entry.resourceRef.name,
  );
}

export function manipulationAvailabilityInventoryHeading(
  mode: ManipulationResourceAvailabilityPresentationMode,
  resourceKind: "PITCH_HALL" | "DRESSING_ROOM",
  visibleGroupCount: number,
): string | null {
  if (mode === "COMPACT_MATRIX") return null;
  const noun = resourceKind === "PITCH_HALL" ? "SPIELFELDER" : "GARDEROBEN";
  return `ALLE ${noun} · ${visibleGroupCount}`;
}
