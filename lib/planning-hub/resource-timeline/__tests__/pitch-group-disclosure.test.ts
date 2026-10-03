import { describe, expect, it } from "vitest";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  buildAdaptiveResourceTimeline,
  countResourceTimelineLanes,
} from "../adaptive-lanes";
import {
  countVisibleResourceTimelineRows,
  resolveAutoExpandedPitchGroupKeys,
  summarizePitchGroupOverview,
} from "../pitch-group-disclosure";
import { buildPlanningResourceGroupsFromFacilityGroups } from "../planning-resource-groups";
import { shouldUseCompactResourceScopeSelector } from "../planning-resource-groups";
import { PLANNER_SCALE_FIXTURES } from "../scale-fixtures";

function segmentedPitch(id: string, name: string, code: string): FacilityGroup {
  return {
    facilityId: id,
    facilityName: name,
    resources: [
      { id: `${code}-f`, name, code, type: "FULL_PITCH", facilityId: id, facilityName: name },
      {
        id: `${code}-a`,
        name: `${name} A`,
        code: `${code}_A`,
        type: "HALF_PITCH",
        facilityId: id,
        facilityName: name,
      },
      {
        id: `${code}-b`,
        name: `${name} B`,
        code: `${code}_B`,
        type: "HALF_PITCH",
        facilityId: id,
        facilityName: name,
      },
    ],
  };
}

describe("pitch-group-disclosure — FCA canonical seed (3 physical pitches)", () => {
  const fcaCatalog = [
    segmentedPitch("fac-hp", "Hauptplatz", "STADION"),
    segmentedPitch("fac-kr2", "Kunstrasen 2", "KUNSTRASEN_2"),
    segmentedPitch("fac-kr3", "Kunstrasen 3", "KUNSTRASEN_3"),
  ];

  it("builds three physical groups with Gesamt/A/B segments", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    expect(groups).toHaveLength(3);
  });

  it("defaults to three collapsed overview rows (not nine expanded lanes)", () => {
    const timeline = buildAdaptiveResourceTimeline({
      catalogGroups: fcaCatalog,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
      resourceCategory: "pitch",
    });
    expect(countResourceTimelineLanes(timeline)).toBe(9);
    expect(countVisibleResourceTimelineRows(timeline, "pitch", new Set())).toBe(3);
  });

  it("auto-expands when resource filter selects one physical pitch group", () => {
    const timeline = buildAdaptiveResourceTimeline({
      catalogGroups: fcaCatalog,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
      resourceCategory: "pitch",
    });
    const kr2 = fcaCatalog[1]!;
    const expanded = resolveAutoExpandedPitchGroupKeys(
      timeline,
      [kr2.resources[0]!.id, kr2.resources[1]!.id, kr2.resources[2]!.id],
      "pitch",
    );
    expect(expanded.has("fac-kr2")).toBe(true);
  });
});

describe("pitch-group-disclosure — FCA duplicate Hauptfeld + Hauptplatz (STAGE data defect)", () => {
  const duplicateCatalog = [
    segmentedPitch("fac-hauptfeld", "Hauptfeld", "HAUPTFELD"),
    segmentedPitch("fac-hauptplatz", "Hauptplatz", "STADION"),
    segmentedPitch("fac-kr2", "Kunstrasen 2", "KUNSTRASEN_2"),
    segmentedPitch("fac-kr3", "Kunstrasen 3", "KUNSTRASEN_3"),
  ];

  it("truthfully presents four physical facility rows when both exist in catalog", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(duplicateCatalog, "pitch");
    expect(groups.map((g) => g.label).sort()).toEqual([
      "Hauptfeld",
      "Hauptplatz",
      "Kunstrasen 2",
      "Kunstrasen 3",
    ]);
  });

  it("does not merge Hauptfeld/STADION without canonical parent link", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(duplicateCatalog, "pitch");
    expect(groups.filter((g) => g.label === "Hauptfeld" || g.label === "Hauptplatz")).toHaveLength(2);
  });
});

describe("pitch-group-disclosure — scale matrix", () => {
  it.each(PLANNER_SCALE_FIXTURES)("CASE $case — exposes full pitch lane catalog", (fixture) => {
    const timeline = buildAdaptiveResourceTimeline({
      catalogGroups: fixture.pitchGroups,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
      resourceCategory: "pitch",
    });
    expect(countResourceTimelineLanes(timeline)).toBe(fixture.expectedPitchCount);
  });

  it("CASE small segmented — three collapsed rows for three physical pitches (FCA-shaped)", () => {
    const catalog = [
      segmentedPitch("fac-1", "Platz 1", "P1"),
      segmentedPitch("fac-2", "Platz 2", "P2"),
      segmentedPitch("fac-3", "Platz 3", "P3"),
    ];
    const timeline = buildAdaptiveResourceTimeline({
      catalogGroups: catalog,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
      resourceCategory: "pitch",
    });
    expect(countResourceTimelineLanes(timeline)).toBe(9);
    expect(countVisibleResourceTimelineRows(timeline, "pitch", new Set())).toBe(3);
  });

  it("activates compact scope selector when physical pitch group count exceeds threshold", () => {
    const catalog = Array.from({ length: 10 }, (_, i) =>
      segmentedPitch(`fac-${i}`, `Platz ${i + 1}`, `P${i}`),
    );
    const groups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    expect(groups).toHaveLength(10);
    expect(shouldUseCompactResourceScopeSelector(groups, "pitch")).toBe(true);
  });

  it("summarizes conflict on collapsed overview", () => {
    const lanes = [
      {
        resourceId: "KR2-a",
        name: "Kunstrasen 2 A",
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
        segments: [
          {
            segmentId: "a1:KR2-a",
            item: {
              id: "a1",
              conflicts: [{ facilityResourceId: "KR2-a", facilityResourceName: "A", kind: "PITCH_HALL" }],
            },
            resource: { facilityResourceId: "KR2-a", name: "A", code: "KR2_A" },
            startAt: new Date("2026-09-20T08:00:00.000Z"),
            endAt: new Date("2026-09-20T09:00:00.000Z"),
          },
        ],
        presentationGroupKey: "fac-kr2",
        presentationPrimaryLabel: "A",
        presentationSecondaryLabel: "Kunstrasen 2",
        presentationTier: "secondary" as const,
        presentationRole: "segment" as const,
      },
    ];
    const summary = summarizePitchGroupOverview(lanes);
    expect(summary.kind).toBe("conflict");
    expect(summary.label).toBe("1 Konflikt");
  });
});
