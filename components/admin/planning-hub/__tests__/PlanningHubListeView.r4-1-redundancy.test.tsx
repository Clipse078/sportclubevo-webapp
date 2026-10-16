/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.1 — Wochenplaner Liste redundancy (semantic contract).
 * R6: grid/table column markers superseded by R5.5.1 canonical full-width shell — tests migrated.
 */

import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
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

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.1 (R6 migrated)", () => {
  it("uses canonical programme shell on activity rows — no legacy desktop grid marker", () => {
    const rowSource = readFileSync(
      join(process.cwd(), "components/admin/planning-hub/PlanningHubListeActivityRow.tsx"),
      "utf8",
    );
    expect(rowSource).not.toContain("PLANNING_HUB_LISTE_ROW_GRID_CLASS");
    expect(rowSource).toContain('data-sce-planning-hub-liste-full-width-contract="canonical-shell"');

    const { container } = render(
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

    const rows = container.querySelectorAll("[data-sce-planning-hub-liste-row]");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row).toHaveAttribute("data-sce-programme-activity-card-shell");
      expect(row.querySelector('[data-testid="planning-hub-liste-row-time"]')).toBeNull();
      expect(row.querySelector('[data-testid="planning-hub-liste-row-identity"]')).toBeNull();
    }
  });

  it("renders training location once in list-row location — no duplicate hierarchy in identity", () => {
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

    const card = screen.getByTestId("planning-hub-liste-sce-training-training:1");
    expect(within(card).queryByTestId("sce-training-context-line")).not.toBeInTheDocument();
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent("Kunstrasen 3 B");
    expect(screen.getByTestId("sce-training-list-row-location").textContent).not.toContain("Kunstrasen 3 ·");
    expect(within(card).getByTestId("sce-training-title")).toHaveTextContent("Junioren B2 Training");
    expect(within(card).getByTestId("sce-training-team")).toHaveTextContent("FC Allschwil Junioren B2");
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

    const card = screen.getByTestId("planning-hub-liste-sce-training-training:dup");
    expect(within(card).queryByTestId("sce-training-team")).not.toBeInTheDocument();
  });

  it("keeps match fixture grammar without inline location on the card body", () => {
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

    const card = screen.getByTestId("planning-hub-liste-sce-match-match:1");
    expect(within(card).queryByTestId("sce-match-location")).not.toBeInTheDocument();
    expect(screen.getByTestId("sce-match-vs")).toBeInTheDocument();
    expect(card.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(card.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(screen.getAllByTestId("sce-match-list-row-location")).toHaveLength(1);
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
