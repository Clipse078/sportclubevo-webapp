/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-06 — operational Liste presentation.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import type { WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

function training(id: string, team: string): WeekplannerTrainingItem {
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: [team],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

function week(items: WeekplannerTrainingItem[]): WeekplannerWeek {
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [{ dayKey: "2026-10-05", items: annotateWeekplannerConflicts(items) }],
  };
}

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: false,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

const baseUrlState = {
  perspective: "liste" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
  search: "",
  conflictsOnly: false,
  resourceCategory: "pitch" as const,
  resourceFilterIds: null,
};

describe("PlanningHubListeView", () => {
  it("renders day grouping, type pill, resources, and opens detail on row click", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={onOpen}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    expect(screen.getByTestId("planning-hub-liste-day-2026-10-05")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-row-resources").textContent).toContain("Hauptfeld A");
    expect(screen.getByTestId("planning-hub-liste-row-status").textContent).toBe("Unvollständig");

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not render selection checkboxes or bulk bar", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2"), training("training:2", "Junioren E1")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    expect(screen.queryByTestId("planning-hub-liste-select-all")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-liste-select-training:1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-liste-bulk-bar")).not.toBeInTheDocument();
    expect(screen.queryByText("Sichtbare auswählen")).not.toBeInTheDocument();
  });

  it("shows filtered empty state with reset when filters yield no rows", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={{
          ...baseUrlState,
          activity: "spiele",
        }}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => false}
        permissionContext={{ ...permissionContext, canManageTrainings: false }}
      />,
    );
    expect(screen.getByTestId("planning-hub-liste-empty-filtered").textContent).toContain(
      "Für die aktuellen Filter",
    );
    expect(screen.getByText("Keine passenden Einträge")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-filtered-empty-reset")).toBeInTheDocument();
  });

  it("shows search-specific filtered empty copy", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={{
          ...baseUrlState,
          search: "KeinTreffer",
        }}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => false}
        permissionContext={{ ...permissionContext, canManageTrainings: false }}
      />,
    );
    expect(screen.getByTestId("planning-hub-liste-empty-filtered").textContent).toContain(
      "Für die aktuellen Filter",
    );
    expect(screen.getByText("Keine passenden Einträge")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-filtered-empty-reset")).toBeInTheDocument();
  });
});
