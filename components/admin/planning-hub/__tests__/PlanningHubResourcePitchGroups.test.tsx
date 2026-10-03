/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-01-R2 — collapsible pitch groups
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { WeekplannerVisibleTimeRangeProvider } from "@/components/admin/planning-hub/WeekplannerVisibleTimeRangeContext";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";

const FCA_PITCH_CATALOG: FacilityGroup[] = [
  {
    facilityId: "fac-hp",
    facilityName: "Hauptplatz",
    resources: [
      {
        id: "STADION-f",
        name: "Hauptplatz",
        code: "STADION",
        type: "FULL_PITCH",
        facilityId: "fac-hp",
        facilityName: "Hauptplatz",
      },
      {
        id: "STADION-a",
        name: "Hauptplatz A",
        code: "STADION_A",
        type: "HALF_PITCH",
        facilityId: "fac-hp",
        facilityName: "Hauptplatz",
      },
      {
        id: "STADION-b",
        name: "Hauptplatz B",
        code: "STADION_B",
        type: "HALF_PITCH",
        facilityId: "fac-hp",
        facilityName: "Hauptplatz",
      },
    ],
  },
  {
    facilityId: "fac-kr2",
    facilityName: "Kunstrasen 2",
    resources: [
      {
        id: "KR2-f",
        name: "Kunstrasen 2",
        code: "KUNSTRASEN_2",
        type: "FULL_PITCH",
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
      {
        id: "KR2-a",
        name: "Kunstrasen 2 A",
        code: "KUNSTRASEN_2_A",
        type: "HALF_PITCH",
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
      {
        id: "KR2-b",
        name: "Kunstrasen 2 B",
        code: "KUNSTRASEN_2_B",
        type: "HALF_PITCH",
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
    ],
  },
  {
    facilityId: "fac-kr3",
    facilityName: "Kunstrasen 3",
    resources: [
      {
        id: "KR3-f",
        name: "Kunstrasen 3",
        code: "KUNSTRASEN_3",
        type: "FULL_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
      {
        id: "KR3-a",
        name: "Kunstrasen 3 A",
        code: "KUNSTRASEN_3_A",
        type: "HALF_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
      {
        id: "KR3-b",
        name: "Kunstrasen 3 B",
        code: "KUNSTRASEN_3_B",
        type: "HALF_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
    ],
  },
];

const WEEK: WeekplannerWeek = {
  days: [{ dayKey: "2026-09-20", items: [] }],
  weekNumberLabel: "KW 38",
  rangeLabel: "20. Sep 2026",
  param: "2026-09-14",
  previousParam: "2026-09-07",
  nextParam: "2026-09-21",
};

function renderSpielfeld(resourceFilterIds: string[] | null = null) {
  render(
    <WeekplannerVisibleTimeRangeProvider>
      <PlanningHubResourceDayView
        week={WEEK}
        urlState={{
          week: "2026-09-14",
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          conflictsOnly: false,
          resourceCategory: "pitch",
          day: "2026-09-20",
          resourceFilterIds,
        }}
        locale="de-CH"
        timezone="Europe/Zurich"
        todayDayKey="2026-09-20"
        onItemActivate={vi.fn()}
        resourceCatalogGroups={{
          PITCH_HALL: FCA_PITCH_CATALOG,
          DRESSING_ROOM: [],
        }}
      />
    </WeekplannerVisibleTimeRangeProvider>,
  );
}

describe("PlanningHubResourceDayView — R2 pitch groups", () => {
  it("shows three collapsed physical pitch groups by default (Alle)", () => {
    renderSpielfeld();
    const groups = screen.getAllByTestId("planning-hub-pitch-group");
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.getAttribute("data-pitch-group-expanded") === "false")).toBe(true);
    expect(screen.queryAllByTestId("planning-hub-resource-row")).toHaveLength(0);
  });

  it("expands segment lanes when user toggles a group", async () => {
    const user = userEvent.setup();
    renderSpielfeld();
    const toggles = screen.getAllByTestId("planning-hub-pitch-group-toggle");
    await user.click(toggles[0]!);
    const expandedGroups = screen
      .getAllByTestId("planning-hub-pitch-group")
      .filter((g) => g.getAttribute("data-pitch-group-expanded") === "true");
    expect(expandedGroups).toHaveLength(1);
    expect(screen.getAllByTestId("planning-hub-resource-row")).toHaveLength(3);
  });

  it("auto-expands when resource filter selects one physical pitch", () => {
    renderSpielfeld(["KR2-f", "KR2-a", "KR2-b"]);
    const groups = screen.getAllByTestId("planning-hub-pitch-group");
    const kr2 = groups.find((g) => g.getAttribute("data-pitch-group-key") === "fac-kr2");
    expect(kr2?.getAttribute("data-pitch-group-expanded")).toBe("true");
    expect(screen.getAllByTestId("planning-hub-resource-row")).toHaveLength(3);
  });
});
