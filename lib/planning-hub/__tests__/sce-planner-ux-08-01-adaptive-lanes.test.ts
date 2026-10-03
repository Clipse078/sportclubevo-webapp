import { describe, expect, it } from "vitest";
import {
  buildAdaptiveResourceTimeline,
  countResourceTimelineLanes,
  RESOURCE_TIMELINE_LABEL_MIN_WIDTH_PX,
  RESOURCE_TIMELINE_MIN_TIMELINE_WIDTH_PX,
} from "../resource-timeline/adaptive-lanes";
import { PLANNER_SCALE_FIXTURES } from "../resource-timeline/scale-fixtures";

describe("SCE-PLANNER-UX-08-01 adaptive resource timeline", () => {
  it("enforces readable minimum layout constants", () => {
    expect(RESOURCE_TIMELINE_LABEL_MIN_WIDTH_PX).toBeGreaterThanOrEqual(140);
    expect(RESOURCE_TIMELINE_MIN_TIMELINE_WIDTH_PX).toBeGreaterThanOrEqual(640);
  });

  it.each(PLANNER_SCALE_FIXTURES)("CASE $case — exposes full pitch catalog ($expectedPitchCount)", (fixture) => {
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: fixture.pitchGroups,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
    });
    expect(countResourceTimelineLanes(groups)).toBe(fixture.expectedPitchCount);
  });

  it.each(PLANNER_SCALE_FIXTURES)(
    "CASE $case — exposes full dressing catalog ($expectedDressingCount)",
    (fixture) => {
      const groups = buildAdaptiveResourceTimeline({
        catalogGroups: fixture.dressingGroups,
        segmentRows: [],
        facilityFilterId: null,
        resourceFilterIds: null,
      });
      expect(countResourceTimelineLanes(groups)).toBe(fixture.expectedDressingCount);
    },
  );

  it("medium club — facility grouping yields multiple groups", () => {
    const medium = PLANNER_SCALE_FIXTURES.find((f) => f.case === "medium")!;
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: medium.pitchGroups,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
    });
    expect(groups.length).toBe(2);
  });

  it("large club — resource subset filter reduces visible lanes without hard limits", () => {
    const large = PLANNER_SCALE_FIXTURES.find((f) => f.case === "large")!;
    const firstId = large.pitchGroups[0]!.resources[0]!.id;
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: large.pitchGroups,
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: [firstId],
    });
    expect(countResourceTimelineLanes(groups)).toBe(1);
  });

  it("preserves orphan segment rows not in catalog", () => {
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: [],
      segmentRows: [
        {
          resourceId: "legacy-pitch",
          name: "Legacy Platz",
          facilityName: "Alt",
          segments: [],
        },
      ],
      facilityFilterId: null,
      resourceFilterIds: null,
    });
    expect(countResourceTimelineLanes(groups)).toBe(1);
  });
});
