/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.4 — location presentation on canonical Wochenplaner Liste rows.
 * R6: fixed desktop grid geometry superseded by full-width programme shell (R5.5.1).
 */

import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import type {
  WeekplannerMatchItem,
  WeekplannerTournamentItem,
  WeekplannerTrainingItem,
  WeekplannerVeranstaltungItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

const PITCH_A = {
  facilityResourceId: "p2a",
  facilityId: "f1",
  code: "KR2A",
  name: "Kunstrasen 2 A",
  facilityName: "Im Brüel",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const PITCH_B = {
  ...PITCH_A,
  facilityResourceId: "p3b",
  code: "KR3B",
  name: "Kunstrasen 3 B",
};

function training(id: string, pitch = PITCH_A): WeekplannerTrainingItem {
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Junioren F2 Training",
    teamNames: ["FC Allschwil Junioren F2"],
    pitchAllocations: [pitch],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [pitch],
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
    pitchAllocations: [PITCH_B],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH_B],
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

function tournament(id: string): WeekplannerTournamentItem {
  return {
    id,
    tenantId: "t1",
    type: "TOURNAMENT",
    startAt: new Date("2026-10-05T09:00:00.000Z"),
    endAt: new Date("2026-10-05T17:00:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T09:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T17:00:00.000Z"),
    timeOverridden: false,
    title: "Frühlingscup",
    teamNames: ["Junioren B1"],
    pitchAllocations: [PITCH_A],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH_A],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-tournament",
    homeAway: "HOME",
    teamSeasonIds: ["ts1"],
    participantAllocations: [],
    organizerName: "FC Allschwil",
    organizerLogoUrl: "/crests/fca.png",
    organizerExternalClubId: null,
  };
}

function veranstaltung(id: string): WeekplannerVeranstaltungItem {
  return {
    id,
    tenantId: "t1",
    type: "VERANSTALTUNG",
    startAt: new Date("2026-10-05T18:30:00.000Z"),
    endAt: new Date("2026-10-05T20:00:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T18:30:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T20:00:00.000Z"),
    timeOverridden: false,
    title: "Generalversammlung",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-club",
    location: "Clubhaus",
    teamSeasonId: null,
    allDay: false,
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
  alternativePlanId: null,
};

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.4 (R6 migrated)", () => {
  it("documents legacy grid tokens as reference-only — liste row no longer mounts desktop grid", () => {
    const rowSource = readFileSync(
      join(process.cwd(), "components/admin/planning-hub/PlanningHubListeActivityRow.tsx"),
      "utf8",
    );
    expect(rowSource).not.toContain("PLANNING_HUB_LISTE_ROW_GRID_CLASS");
    expect(rowSource).not.toContain("PLANNING_HUB_LISTE_ROW_COLUMN_CLASS");
    expect(rowSource).toContain("PlanningHubListeSceActivityCard");
  });

  it("renders one canonical list-row location per activity kind", () => {
    render(
      <PlanningHubListeView
        week={week([
          training("training:1"),
          match("match:1"),
          tournament("tournament:1"),
          veranstaltung("veranstaltung:1"),
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

    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent("Kunstrasen 2 A");
    expect(screen.getByTestId("sce-match-list-row-location")).toHaveTextContent("Kunstrasen 3 B");
    expect(screen.getByTestId("sce-tournament-list-row-location")).toHaveTextContent(/Kunstrasen 2 A/i);
    expect(screen.getByTestId("sce-club-event-list-row-location")).toHaveTextContent("Clubhaus");
  });

  it("keeps match fixture and tournament identity inside Sce cards — location on list-row row 3", () => {
    render(
      <PlanningHubListeView
        week={week([match("match:1"), tournament("tournament:1")])}
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

    const matchRow = screen.getByTestId("planning-hub-liste-row-match:1");
    const matchCard = within(matchRow).getByTestId("planning-hub-liste-sce-match-match:1");
    expect(within(matchCard).getByTestId("sce-match-fixture")).toBeInTheDocument();
    expect(within(matchCard).getByTestId("sce-match-list-row-location")).toBeInTheDocument();

    const tournamentRow = screen.getByTestId("planning-hub-liste-row-tournament:1");
    const tournamentCard = within(tournamentRow).getByTestId("planning-hub-liste-sce-tournament-tournament:1");
    expect(within(tournamentCard).getByTestId("sce-tournament-title")).toBeInTheDocument();
    expect(within(tournamentCard).getByTestId("sce-tournament-list-row-location")).toBeInTheDocument();
  });
});
