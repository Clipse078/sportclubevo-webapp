/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubResourceScopeControl from "../PlanningHubResourceScopeControl";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PLANNER_SCALE_FIXTURES } from "@/lib/planning-hub/resource-timeline/scale-fixtures";

function fcaPitchGroups(): FacilityGroup[] {
  return [
    {
      facilityId: "fac-kr2",
      facilityName: "Kunstrasen 2",
      resources: [
        { id: "kr2-full", name: "Kunstrasen 2", code: "KR2", type: "FULL_PITCH", facilityId: "fac-kr2", facilityName: "Kunstrasen 2" },
        { id: "kr2-a", name: "Kunstrasen 2 A", code: "KR2_A", type: "HALF_PITCH", facilityId: "fac-kr2", facilityName: "Kunstrasen 2" },
        { id: "kr2-b", name: "Kunstrasen 2 B", code: "KR2_B", type: "HALF_PITCH", facilityId: "fac-kr2", facilityName: "Kunstrasen 2" },
      ],
    },
  ];
}

describe("PlanningHubResourceScopeControl — SCE-PLANNER-UX-08-01-R1", () => {
  it("small tenant — renders physical pitch chips, not one chip per segment", () => {
    render(
      <PlanningHubResourceScopeControl
        urlState={{
          week: "2026-08-10",
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        facilityGroups={fcaPitchGroups()}
        perspectiveLabel="Spielfelder"
      />,
    );

    expect(screen.getByTestId("planning-hub-resource-scope")).toHaveAttribute(
      "data-planning-resource-scope-mode",
      "chips",
    );
    expect(screen.getByTestId("planning-hub-resource-scope-group-fac-kr2")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-resource-scope-kr2-a")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-resource-scope-trigger")).not.toBeInTheDocument();
  });

  it.each(["medium", "large"] as const)(
    "scale fixture %s — renders facility-level chips, not one chip per pitch resource",
    (scaleCase) => {
      const fixture = PLANNER_SCALE_FIXTURES.find((f) => f.case === scaleCase)!;
      render(
        <PlanningHubResourceScopeControl
          urlState={{
            week: "2026-08-10",
            perspective: "spielfeld",
            activity: "alle",
            team: null,
            facility: null,
            search: "",
            conflictsOnly: false,
            resourceCategory: "pitch",
            resourceFilterIds: null,
          }}
          facilityGroups={fixture.pitchGroups}
          perspectiveLabel="Spielfelder"
        />,
      );

      const groupChips = screen.getAllByTestId(/^planning-hub-resource-scope-group-/);
      expect(groupChips.length).toBe(fixture.pitchGroups.length);
      expect(groupChips.length).toBeLessThan(fixture.expectedPitchCount);
      expect(screen.queryByTestId("planning-hub-resource-scope-trigger")).not.toBeInTheDocument();
    },
  );

  it("many physical pitch facilities — compact popover instead of chip strip", () => {
    const manySites = Array.from({ length: 6 }, (_, i) => ({
      facilityId: `fac-${i}`,
      facilityName: `Platz ${i + 1}`,
      resources: [
        {
          id: `p-${i}`,
          name: `Platz ${i + 1}`,
          code: `P${i}`,
          type: "FULL_PITCH" as const,
          facilityId: `fac-${i}`,
          facilityName: `Platz ${i + 1}`,
        },
      ],
    }));
    render(
      <PlanningHubResourceScopeControl
        urlState={{
          week: "2026-08-10",
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        facilityGroups={manySites}
        perspectiveLabel="Spielfelder"
      />,
    );
    expect(screen.getByTestId("planning-hub-resource-scope")).toHaveAttribute(
      "data-planning-resource-scope-mode",
      "compact",
    );
  });
});
