import { describe, expect, it } from "vitest";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  formatPlanningResourceScopeSummary,
  lanePresentationForSegment,
  resourceIdsMatchGroup,
  shouldUseCompactResourceScopeSelector,
} from "../planning-resource-groups";

function fcaPitchFacility(
  facilityId: string,
  facilityName: string,
  fullName: string,
  codeBase: string,
): FacilityGroup {
  return {
    facilityId,
    facilityName,
    resources: [
      {
        id: `${codeBase}-full`,
        name: fullName,
        code: codeBase,
        type: "FULL_PITCH",
        facilityId,
        facilityName,
      },
      {
        id: `${codeBase}-a`,
        name: `${fullName} A`,
        code: `${codeBase}_A`,
        type: "HALF_PITCH",
        facilityId,
        facilityName,
      },
      {
        id: `${codeBase}-b`,
        name: `${fullName} B`,
        code: `${codeBase}_B`,
        type: "HALF_PITCH",
        facilityId,
        facilityName,
      },
    ],
  };
}

describe("planning-resource-groups — FCA pitch hierarchy", () => {
  const fcaCatalog = [
    fcaPitchFacility("fac-hp", "Hauptplatz", "Hauptplatz", "STADION"),
    fcaPitchFacility("fac-kr2", "Kunstrasen 2", "Kunstrasen 2", "KR2"),
    fcaPitchFacility("fac-kr3", "Kunstrasen 3", "Kunstrasen 3", "KR3"),
  ];

  it("builds three physical pitch groups with whole + A/B segments", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    expect(groups).toHaveLength(3);
    expect(groups[0]!.segments.map((s) => s.segmentLabel)).toEqual(["Gesamt", "A", "B"]);
    expect(groups[0]!.allResourceIds).toHaveLength(3);
  });

  it("does not treat parent and segments as equivalent top-level labels", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    const kr2 = groups.find((g) => g.groupKey === "fac-kr2")!;
    const whole = lanePresentationForSegment(kr2, kr2.segments[0]!);
    const segA = lanePresentationForSegment(kr2, kr2.segments[1]!);
    expect(whole.primaryLabel).toBe("Kunstrasen 2");
    expect(whole.tier).toBe("primary");
    expect(segA.primaryLabel).toBe("A");
    expect(segA.tier).toBe("secondary");
    expect(segA.secondaryLabel).toBe("Kunstrasen 2");
  });

  it("formats scope summary for whole-group selection", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    const kr2 = groups.find((g) => g.groupKey === "fac-kr2")!;
    expect(
      formatPlanningResourceScopeSummary({
        groups,
        activeIds: kr2.allResourceIds,
        perspectiveLabel: "Spielfelder",
      }),
    ).toBe("Kunstrasen 2");
    expect(resourceIdsMatchGroup(kr2.allResourceIds, kr2)).toBe(true);
  });

  it("keeps small FCA on direct chip selection (not compact-only)", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    expect(shouldUseCompactResourceScopeSelector(groups, "pitch")).toBe(false);
  });
});

describe("planning-resource-groups — scale", () => {
  it("medium pitch count uses compact scope selector", () => {
    const catalog: FacilityGroup[] = Array.from({ length: 10 }, (_, i) =>
      fcaPitchFacility(`fac-${i}`, `Platz ${i + 1}`, `Platz ${i + 1}`, `P${i}`),
    );
    const groups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    expect(groups).toHaveLength(10);
    expect(shouldUseCompactResourceScopeSelector(groups, "pitch")).toBe(true);
  });
});
