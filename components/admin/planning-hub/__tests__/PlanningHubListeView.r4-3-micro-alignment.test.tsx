/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.3 — Wochenplaner Liste grid alignment + MICRO crest polish.
 */

import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import {
  PLANNING_HUB_LISTE_ROW_COLUMN_CLASS,
  PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS,
} from "@/lib/planning-hub/planning-hub-liste-grid";
import { SCE_ACTIVITY_LIST_ROW_SCALE } from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import type {
  WeekplannerMatchItem,
  WeekplannerTournamentItem,
  WeekplannerTrainingItem,
  WeekplannerVeranstaltungItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Im Brüel",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

function training(id: string): WeekplannerTrainingItem {
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
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
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

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.3", () => {
  it("assigns the same outer grid column classes to TIME, IDENTITY, LOCATION, STATUS, and ACTIONS for all activity kinds", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1"), match("match:1"), tournament("tournament:1"), veranstaltung("veranstaltung:1")])}
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

    for (const row of rows) {
      expect(row).toHaveAttribute("data-sce-planning-hub-liste-grid", PLANNING_HUB_LISTE_ROW_DESKTOP_GRID_COLS);
      const timeCol = row.querySelector('[data-sce-planning-hub-liste-column="TIME"]');
      const identityCol = row.querySelector('[data-sce-planning-hub-liste-column="IDENTITY"]');
      const locationCol = row.querySelector('[data-sce-planning-hub-liste-column="LOCATION"]');
      const statusCol = row.querySelector('[data-sce-planning-hub-liste-column="STATUS"]');
      const actionsCol = row.querySelector('[data-sce-planning-hub-liste-column="ACTIONS"]');
      expect(timeCol?.className).toContain("md:col-start-1");
      expect(identityCol?.className).toContain("md:col-start-2");
      expect(locationCol?.className).toContain("md:col-start-3");
      expect(statusCol?.className).toContain("md:col-start-4");
      expect(actionsCol?.className).toContain("md:col-start-5");
    }

    const rowSource = readFileSync(
      join(process.cwd(), "components/admin/planning-hub/PlanningHubListeActivityRow.tsx"),
      "utf8",
    );
    expect(rowSource).toContain("PLANNING_HUB_LISTE_ROW_COLUMN_CLASS");
    expect(PLANNING_HUB_LISTE_ROW_COLUMN_CLASS.location).toContain("md:col-start-3");
  });

  it("keeps a single location owner on the row — identity cards do not own LOCATION column", () => {
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

    const identity = screen.getByTestId("planning-hub-liste-row-identity");
    expect(within(identity).queryByTestId("sce-match-location")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("planning-hub-liste-row-resources")).toHaveLength(1);
    expect(screen.getByTestId("planning-hub-liste-row-resources")).toHaveAttribute(
      "data-sce-planning-hub-liste-column",
      "LOCATION",
    );
  });

  it("hides visible HEIM/AUSWÄRTS in list-row while preserving home/away in the presentation model", () => {
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

    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-region="tenant-side-marker"]')).toBeNull();
    expect(screen.queryByTestId("sce-match-context-heim")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-match-context-auswaerts")).not.toBeInTheDocument();

    const model = resolveSceMatchPresentationFromWeekplannerMatch(match("match:1"), {
      timezone: "Europe/Zurich",
    });
    expect(model.contextBadges?.some((b) => b.kind === "tenant-side" && b.label === "Heim")).toBe(true);
  });

  it("retains HEIM/AUSWÄRTS on non-list-row match surfaces", () => {
    const model = resolveSceMatchPresentationFromWeekplannerMatch(match("match:standalone"), {
      timezone: "Europe/Zurich",
    });
    render(
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}
        linkToDetail={false}
        surface="standalone"
      />,
    );
    expect(screen.getByTestId("sce-match-context-heim")).toBeInTheDocument();
  });

  it("uses canonical MICRO list-row crest bounds on match fixture crests", () => {
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

    expect(SCE_ACTIVITY_LIST_ROW_SCALE.crestBoundsClass).toContain("h-9");
    const bounds = document.querySelectorAll('[data-sce-match-region="home-crest"] [data-testid="club-crest-bounds"]');
    expect(bounds.length).toBeGreaterThan(0);
    for (const node of bounds) {
      expect(node.className).toContain("h-9");
      expect(node.className).toContain("w-9");
    }
  });

  it("associates tournament organiser crest with organiser identity under the title", () => {
    render(
      <PlanningHubListeView
        week={week([tournament("tournament:1")])}
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

    const composition = screen.getByTestId("sce-tournament-organiser-crest").closest(
      "[data-sce-tournament-organiser-composition]",
    );
    expect(composition).toBeTruthy();
    expect(within(composition as HTMLElement).getByTestId("sce-tournament-organiser")).toHaveTextContent(
      "FC Allschwil",
    );
    expect(screen.getByTestId("sce-tournament-title")).toHaveTextContent("PlayMore Turnier");
    expect(screen.queryByTestId("sce-match-vs")).not.toBeInTheDocument();
  });

  it("does not add training or club-event crests in list-row identity", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1"), veranstaltung("veranstaltung:1")])}
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

    expect(screen.queryAllByTestId("club-crest-bounds")).toHaveLength(0);
  });
});
