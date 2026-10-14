/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.1 — Wochenplaner Liste redundancy & grid alignment.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import { PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS } from "@/lib/planning-hub/planning-hub-liste-grid";
import type {
  WeekplannerMatchItem,
  WeekplannerTrainingItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

const PARENT_PITCH = {
  facilityResourceId: "kr3",
  facilityId: "f1",
  code: "KR3",
  name: "Kunstrasen 3",
  facilityName: "Im Brüel",
  resourceType: "FULL_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const CHILD_PITCH = {
  ...PARENT_PITCH,
  facilityResourceId: "kr3b",
  code: "KR3B",
  name: "Kunstrasen 3 B",
  facilityName: "Kunstrasen 3",
  resourceType: "HALF_PITCH" as const,
};

function training(
  partial: Partial<WeekplannerTrainingItem> & Pick<WeekplannerTrainingItem, "id">,
): WeekplannerTrainingItem {
  return {
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Junioren B2 Training",
    teamNames: ["FC Allschwil Junioren B2"],
    pitchAllocations: [CHILD_PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [CHILD_PITCH],
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
    trainingSessionId: partial.id,
    teamSeasonId: "ts1",
    ...partial,
  };
}

function match(id: string): WeekplannerMatchItem {
  return {
    id,
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-05T18:15:00.000Z"),
    endAt: new Date("2026-10-05T20:15:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T18:15:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T20:15:00.000Z"),
    timeOverridden: false,
    title: "Junioren C2",
    teamNames: ["Junioren C2"],
    pitchAllocations: [PARENT_PITCH],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [PARENT_PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-match",
    opponentName: "FC Therwil C2",
    eventSource: "MANUAL",
    homeSide: {
      displayName: "FC Allschwil",
      logoUrl: "/crests/fca.png",
      isOwnTeam: true,
    },
    awaySide: {
      displayName: "FC Therwil C2",
      logoUrl: "/crests/therwil.png",
      isOwnTeam: false,
    },
    homeAway: "HOME",
    teamSeasonId: "ts1",
  };
}

function week(items: WeekplannerWeek["days"][0]["items"]): WeekplannerWeek {
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [{ dayKey: "2026-10-05", items: annotateWeekplannerConflicts(items) }],
  };
}

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

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
  isStandardplan: false,
  alternativePlanId: "plan-alt",
};

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.1", () => {
  it("uses the shared desktop grid marker on all activity row kinds", () => {
    render(
      <PlanningHubListeView
        week={week([training({ id: "training:1" }), match("match:1")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const liste = screen.getByTestId("planning-hub-liste");
    const rows = within(liste).getAllByTestId(/^planning-hub-liste-row-/);
    const activityRows = rows.filter((node) => node.hasAttribute("data-sce-planning-hub-liste-row"));
    expect(activityRows.length).toBeGreaterThanOrEqual(2);
    for (const row of activityRows) {
      expect(row).toHaveAttribute("data-sce-planning-hub-liste-grid", PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS);
    }
  });

  it("renders training location once in LOCATION column without identity context line", () => {
    render(
      <PlanningHubListeView
        week={week([training({ id: "training:1" })])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const identity = screen.getByTestId("planning-hub-liste-row-identity");
    expect(within(identity).queryByTestId("sce-training-context-line")).not.toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-row-resources").textContent).toContain("Kunstrasen 3 B");
    expect(screen.getByTestId("planning-hub-liste-row-resources").textContent).not.toContain("Kunstrasen 3 ·");
    expect(within(identity).getByTestId("sce-training-title")).toHaveTextContent("Junioren B2 Training");
    expect(within(identity).getByTestId("sce-training-team")).toHaveTextContent("FC Allschwil Junioren B2");
  });

  it("suppresses duplicate training team line when equivalent to title", () => {
    render(
      <PlanningHubListeView
        week={week([
          training({
            id: "training:dup",
            title: "FC Allschwil Junioren B2",
            teamNames: ["FC Allschwil Junioren B2"],
          }),
        ])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const identity = screen.getByTestId("planning-hub-liste-row-identity");
    expect(within(identity).queryByTestId("sce-training-team")).not.toBeInTheDocument();
  });

  it("keeps match fixture grammar without inline location; location appears once", () => {
    render(
      <PlanningHubListeView
        week={week([match("match:1")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const identity = screen.getByTestId("planning-hub-liste-sce-match-match:1");
    expect(within(identity).queryByTestId("sce-match-location")).not.toBeInTheDocument();
    expect(screen.getByTestId("sce-match-vs")).toBeInTheDocument();
    expect(identity.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(identity.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(screen.getAllByTestId("planning-hub-liste-row-resources")).toHaveLength(1);
  });

  it("shows override indicator inside the training row when on an alternative plan", () => {
    render(
      <PlanningHubListeView
        week={week([
          training({
            id: "training:1",
            timeOverridden: true,
            startAt: new Date("2026-10-05T16:00:00.000Z"),
          }),
        ])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        activeAlternativePlanName="Schlechtwetterplan"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const trainingButton = screen.getByTestId("weekplanner-item-training");
    const indicator = within(trainingButton).getByTestId("weekplanner-override-indicator");
    expect(indicator).toHaveTextContent("Schlechtwetterplan angepasst");
  });
});
