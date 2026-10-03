import { describe, expect, it } from "vitest";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  buildAdaptiveResourceTimeline,
  countResourceTimelineLanes,
} from "../resource-timeline/adaptive-lanes";

function fcaCatalog(): FacilityGroup[] {
  const pitch = (id: string, name: string, code: string): FacilityGroup => ({
    facilityId: id,
    facilityName: name,
    resources: [
      { id: `${code}-f`, name, code, type: "FULL_PITCH", facilityId: id, facilityName: name },
      { id: `${code}-a`, name: `${name} A`, code: `${code}_A`, type: "HALF_PITCH", facilityId: id, facilityName: name },
      { id: `${code}-b`, name: `${name} B`, code: `${code}_B`, type: "HALF_PITCH", facilityId: id, facilityName: name },
    ],
  });
  return [pitch("hp", "Hauptplatz", "HP"), pitch("kr2", "Kunstrasen 2", "KR2"), pitch("kr3", "Kunstrasen 3", "KR3")];
}

describe("SCE-PLANNER-UX-08-01-R1 adaptive timeline hierarchy", () => {
  it("FCA — three physical pitch groups with subordinate A/B lane labels", () => {
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: fcaCatalog(),
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: null,
      resourceCategory: "pitch",
    });
    expect(groups).toHaveLength(3);
    expect(countResourceTimelineLanes(groups)).toBe(9);
    const kr2 = groups.find((g) => g.facilityId === "kr2")!;
    expect(kr2.lanes[0]!.presentationPrimaryLabel).toBe("Kunstrasen 2");
    expect(kr2.lanes[1]!.presentationTier).toBe("secondary");
    expect(kr2.lanes[1]!.presentationPrimaryLabel).toBe("A");
    expect(kr2.lanes[1]!.resourceId).toBe("KR2-a");
  });

  it("resource filter preserves canonical resource id for segment lane", () => {
    const groups = buildAdaptiveResourceTimeline({
      catalogGroups: fcaCatalog(),
      segmentRows: [],
      facilityFilterId: null,
      resourceFilterIds: ["KR2-a"],
      resourceCategory: "pitch",
    });
    expect(countResourceTimelineLanes(groups)).toBe(1);
    expect(groups[0]!.lanes[0]!.resourceId).toBe("KR2-a");
  });
});
