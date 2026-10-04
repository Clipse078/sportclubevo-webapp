import { describe, expect, it } from "vitest";
import {
  buildManipulationAvailabilityLargeCatalog,
  buildManipulationAvailabilityMediumCatalog,
  buildManipulationAvailabilitySmallFcaCatalog,
  manipulationAvailabilityPhysicalGroupCount,
} from "../manipulation-availability-scale-fixtures";
import {
  buildManipulationResourceAvailabilityList,
  pickRecommendedManipulationResourceId,
} from "../manipulation-resource-availability";
import {
  deriveManipulationResourceAvailabilityPresentationMode,
  filterManipulationAvailabilityGroups,
  pickBestManipulationAlternatives,
  planningResourceGroupMatchesSearch,
  summarizeManipulationPhysicalGroups,
  MANIPULATION_AVAILABILITY_PRESENTATION_POLICY,
} from "../manipulation-resource-availability-presentation";
import { buildPlanningResourceGroupsFromFacilityGroups } from "../resource-timeline/planning-resource-groups";
import type { WeekplannerMatchItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

function refsFromCatalog(catalog: ReturnType<typeof buildManipulationAvailabilityMediumCatalog>): WeekplannerResourceRef[] {
  const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
  return pitchGroups.flatMap((g) =>
    g.segments.map((s) => ({
      facilityResourceId: s.resourceId,
      facilityId: g.facilityId,
      code: s.fullResource.code,
      name: s.fullResource.name,
      facilityName: g.facilityName,
      resourceType: s.fullResource.type,
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    })),
  );
}

function matchEditing(currentId: string, refs: WeekplannerResourceRef[]): WeekplannerMatchItem {
  const current = refs.find((r) => r.facilityResourceId === currentId)!;
  const startAt = new Date("2026-09-20T15:00:00.000Z");
  const endAt = new Date("2026-09-20T16:30:00.000Z");
  return {
    id: "match:edit",
    tenantId: "t1",
    type: "MATCH",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Team A",
    teamNames: ["A"],
    opponentName: "B",
    homeAway: "HOME",
    eventId: "ev",
    pitchAllocations: [current],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [current],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerMatchItem;
}

describe("manipulation-resource-availability-presentation — SCE-PLANNER-UX-08-05R4", () => {
  it("A — 4 physical groups → COMPACT_MATRIX", () => {
    const catalog = buildManipulationAvailabilitySmallFcaCatalog();
    expect(manipulationAvailabilityPhysicalGroupCount(catalog)).toBe(4);
    expect(deriveManipulationResourceAvailabilityPresentationMode(4)).toBe("COMPACT_MATRIX");
  });

  it("B — 10 physical groups → GROUPED_MATRIX", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    expect(manipulationAvailabilityPhysicalGroupCount(catalog)).toBe(10);
    expect(deriveManipulationResourceAvailabilityPresentationMode(10)).toBe("GROUPED_MATRIX");
  });

  it("C — 24 physical groups → LARGE_INVENTORY", () => {
    const catalog = buildManipulationAvailabilityLargeCatalog();
    expect(manipulationAvailabilityPhysicalGroupCount(catalog)).toBe(24);
    expect(deriveManipulationResourceAvailabilityPresentationMode(24)).toBe("LARGE_INVENTORY");
  });

  it("D — raw resource count does not determine mode when physical group count is small", () => {
    const catalog = buildManipulationAvailabilitySmallFcaCatalog();
    const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    const rawResources = pitchGroups.flatMap((g) => g.segments).length;
    expect(rawResources).toBeGreaterThan(4);
    expect(deriveManipulationResourceAvailabilityPresentationMode(pitchGroups.length)).toBe("COMPACT_MATRIX");
  });

  it("H/I — best alternatives are AVAILABLE only and respect max count", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    const refs = refsFromCatalog(catalog);
    const editing = matchEditing(refs[0]!.facilityResourceId, refs);
    const entries = buildManipulationResourceAvailabilityList({
      allItems: [editing],
      editingItem: editing,
      currentResourceId: editing.pitchAllocations[0]!.facilityResourceId,
      resourceOptions: refs,
      reservationStartAt: editing.startAt,
      reservationEndAt: editing.endAt,
      resourceKind: "PITCH_HALL",
    });
    const alternatives = pickBestManipulationAlternatives(
      entries,
      editing.pitchAllocations[0]!,
      MANIPULATION_AVAILABILITY_PRESENTATION_POLICY.bestAlternativesMax,
    );
    expect(alternatives.length).toBeLessThanOrEqual(3);
    expect(alternatives.every((e) => e.state === "AVAILABLE" && !e.isCurrent)).toBe(true);
    expect(alternatives[0]?.resourceId).toBe(pickRecommendedManipulationResourceId(entries, editing.pitchAllocations[0]!));
  });

  it("J — Nur freie filter keeps groups with at least one AVAILABLE segment", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    const refs = refsFromCatalog(catalog);
    const currentResourceId = refs[0]!.facilityResourceId;
    const reservationStartAt = new Date("2026-09-20T15:00:00.000Z");
    const reservationEndAt = new Date("2026-09-20T16:30:00.000Z");
    const entryById = new Map(
      pitchGroups.flatMap((group, groupIndex) =>
        group.segments.map((seg) => {
          const ref = refs.find((r) => r.facilityResourceId === seg.resourceId)!;
          const state = groupIndex === 0 ? "AVAILABLE" : "OCCUPIED";
          return [
            seg.resourceId,
            {
              resourceId: seg.resourceId,
              resourceRef: ref,
              state,
              isCurrent: seg.resourceId === currentResourceId,
              isRecommended: false,
              requestedStartAt: reservationStartAt,
              requestedEndAt: reservationEndAt,
              conflicts: state === "OCCUPIED" ? [{ activityId: "x", activityLabel: "X", startAt: reservationStartAt, endAt: reservationEndAt, overlapStartAt: reservationStartAt, overlapEndAt: reservationEndAt }] : [],
            },
          ] as const;
        }),
      ),
    );
    const filtered = filterManipulationAvailabilityGroups({
      groups: pitchGroups,
      entryById,
      searchQuery: "",
      freeOnly: true,
      currentResourceId,
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(pitchGroups.length);
  });

  it("K — search matches facility and resource labels", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    const target = pitchGroups.find((g) =>
      g.segments.some((s) => s.fullResource.name.includes("Platz 3")),
    );
    expect(target).toBeTruthy();
    expect(planningResourceGroupMatchesSearch(target!, "kunstrasen 7")).toBe(false);
    expect(planningResourceGroupMatchesSearch(target!, "platz 3")).toBe(true);
    expect(planningResourceGroupMatchesSearch(target!, "sportzentrum nord")).toBe(true);
  });

  it("L — collapsed group summary counts derive from availability entries", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog().slice(0, 2);
    const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    const refs = refsFromCatalog(catalog);
    const editing = matchEditing(refs[0]!.facilityResourceId, refs);
    const entries = buildManipulationResourceAvailabilityList({
      allItems: [editing],
      editingItem: editing,
      currentResourceId: editing.pitchAllocations[0]!.facilityResourceId,
      resourceOptions: refs,
      reservationStartAt: editing.startAt,
      reservationEndAt: editing.endAt,
      resourceKind: "PITCH_HALL",
    });
    const entryById = new Map(entries.map((e) => [e.resourceId, e]));
    const summary = summarizeManipulationPhysicalGroups(pitchGroups, entryById);
    expect(summary.pitchCount).toBe(pitchGroups.length);
    expect(summary.availableCount + summary.partialCount + summary.occupiedCount).toBe(
      pitchGroups.length,
    );
  });
});
