/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.4 — immutable desktop LOCATION / STATUS / ACTIONS geometry.
 */

import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import {
  PLANNING_HUB_LISTE_LOCATION_CELL_CLASS,
  PLANNING_HUB_LISTE_LOCATION_ICON_SLOT_CLASS,
  PLANNING_HUB_LISTE_ROW_COLUMN_CLASS,
  PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS,
} from "@/lib/planning-hub/planning-hub-liste-grid";
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
    conflicts: [{ facilityResourceId: "x", facilityResourceName: "X" }],
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
    title: "PlayMore Turnier",
    teamNames: ["Junioren F3", "Junioren F2"],
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
    teamSeasonIds: ["ts1", "ts2"],
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
    eventId: "ev-club",
    allDay: false,
    visibility: { websiteVisible: false, infoboardVisible: false, homepageVisible: false, wochenplanVisible: true },
    audienceScope: "CLUB",
    audienceLabel: "Gesamter Verein",
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

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.4 location geometry", () => {
  it("uses a deterministic desktop grid — fixed operational tracks, only IDENTITY flexes", () => {
    const gridSource = readFileSync(
      join(process.cwd(), "lib/planning-hub/planning-hub-liste-grid.ts"),
      "utf8",
    );
    expect(PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS).toBe(
      "md:grid-cols-[5rem_minmax(0,1fr)_10rem_6.5rem_2.5rem]",
    );
    expect(gridSource).not.toMatch(/grid-cols-\[[^\]]*auto/);
    expect(gridSource).not.toMatch(/0\.55fr|1\.65fr/);
  });

  it("assigns identical column + location cell tokens across mixed activity rows", () => {
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

    const rows = screen.getAllByTestId(/^planning-hub-liste-row-/).filter((node) =>
      node.hasAttribute("data-sce-planning-hub-liste-row"),
    );
    expect(rows).toHaveLength(4);

    const columnClassByKind = new Map<string, Record<string, string>>();

    for (const row of rows) {
      const kind = row.getAttribute("data-sce-planning-hub-liste-activity-kind") ?? "unknown";
      expect(row).toHaveAttribute("data-sce-planning-hub-liste-grid", PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS);

      const timeCol = row.querySelector('[data-sce-planning-hub-liste-column="TIME"]');
      const identityCol = row.querySelector('[data-sce-planning-hub-liste-column="IDENTITY"]');
      const locationCol = row.querySelector('[data-sce-planning-hub-liste-column="LOCATION"]');
      const statusCol = row.querySelector('[data-sce-planning-hub-liste-column="STATUS"]');
      const actionsCol = row.querySelector('[data-sce-planning-hub-liste-column="ACTIONS"]');

      columnClassByKind.set(kind, {
        time: timeCol?.className ?? "",
        identity: identityCol?.className ?? "",
        location: locationCol?.className ?? "",
        status: statusCol?.className ?? "",
        actions: actionsCol?.className ?? "",
      });

      expect(timeCol?.className).toContain(PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.time);
      expect(identityCol?.className).toContain(PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.identity);
      expect(locationCol?.className).toContain(PLANNING_HUB_LISTE_LOCATION_CELL_CLASS);
      expect(statusCol?.className).toContain(PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.status);
      expect(actionsCol?.className).toContain(PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.actions);

      expect(locationCol).toHaveAttribute("data-sce-planning-hub-liste-location-owner");
      const iconSlot = locationCol?.querySelector("[data-sce-planning-hub-liste-location-icon-slot]");
      expect(iconSlot?.className).toContain(PLANNING_HUB_LISTE_LOCATION_ICON_SLOT_CLASS);

      const identity = row.querySelector('[data-testid="planning-hub-liste-row-identity"]');
      expect(within(identity as HTMLElement).queryByTestId("sce-match-location")).not.toBeInTheDocument();
      expect(within(identity as HTMLElement).queryByTestId("sce-training-location")).not.toBeInTheDocument();
      expect(within(identity as HTMLElement).queryByTestId("sce-tournament-location")).not.toBeInTheDocument();
      expect(within(identity as HTMLElement).queryByTestId("sce-club-event-location")).not.toBeInTheDocument();
    }

    const kinds = [...columnClassByKind.keys()];
    const reference = columnClassByKind.get(kinds[0])!;
    for (const kind of kinds.slice(1)) {
      const current = columnClassByKind.get(kind)!;
      expect(current.time).toBe(reference.time);
      expect(current.identity).toBe(reference.identity);
      expect(current.location).toBe(reference.location);
      expect(current.status).toBe(reference.status);
      expect(current.actions).toBe(reference.actions);
    }
  });

  it("keeps match fixture and tournament identity inside IDENTITY — no span into LOCATION", () => {
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
    const matchIdentity = within(matchRow).getByTestId("planning-hub-liste-row-identity");
    expect(within(matchIdentity).getByTestId("sce-match-fixture")).toBeInTheDocument();
    expect(within(matchRow).getAllByTestId("planning-hub-liste-row-resources")).toHaveLength(1);

    const tournamentRow = screen.getByTestId("planning-hub-liste-row-tournament:1");
    const tournamentIdentity = within(tournamentRow).getByTestId("planning-hub-liste-row-identity");
    expect(within(tournamentIdentity).getByTestId("sce-tournament-title")).toBeInTheDocument();
    expect(within(tournamentRow).getAllByTestId("planning-hub-liste-row-resources")).toHaveLength(1);
  });
});
