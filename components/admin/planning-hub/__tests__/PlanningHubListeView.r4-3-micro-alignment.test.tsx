/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4.3 — Wochenplaner Liste alignment + crest polish.
 * R6: obsolete TIME/IDENTITY/LOCATION grid columns replaced by canonical Sce* list-row semantics.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
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

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4.3 (R6 migrated)", () => {
  it("does not expose legacy desktop column markers on liste rows", () => {
    const { container } = render(
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

    const rows = container.querySelectorAll("[data-sce-planning-hub-liste-row]");
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.querySelector('[data-sce-planning-hub-liste-column="TIME"]')).toBeNull();
      expect(row.querySelector('[data-sce-planning-hub-liste-column="IDENTITY"]')).toBeNull();
      expect(row.querySelector('[data-sce-planning-hub-liste-column="LOCATION"]')).toBeNull();
      expect(row.querySelector('[data-sce-planning-hub-liste-column="STATUS"]')).toBeNull();
      expect(row.querySelector('[data-sce-planning-hub-liste-column="ACTIONS"]')).toBeTruthy();
    }
  });

  it("keeps a single list-row location owner on match cards", () => {
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
    expect(screen.getAllByTestId("sce-match-list-row-location")).toHaveLength(1);
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

  it("uses programme-fixture crest bounds on Wochenplaner match list rows", () => {
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

    expect(SCE_ACTIVITY_LIST_ROW_SCALE.programmeMatchCrestBoundsClass).toContain("h-11");
    const bounds = document.querySelectorAll(
      '[data-sce-match-region="home-crest"] [data-testid="club-crest-bounds"]',
    );
    expect(bounds.length).toBeGreaterThan(0);
    for (const node of bounds) {
      expect(node.className).toContain("h-11");
      expect(node.className).toContain("w-11");
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

    expect(screen.getByTestId("sce-tournament-organiser-crest")).toBeInTheDocument();
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F3");
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
