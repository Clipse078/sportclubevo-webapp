/**
 * @vitest-environment jsdom
 * SCE-DS2-PLANNER-UX-01 — Wochenplaner match list parity with Matchcenter.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { formatListOperationalDayHeading } from "@/lib/planning-hub/list-operational";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type {
  WeekplannerMatchItem,
  WeekplannerTrainingItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" } as const;

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
    title: "Training",
    teamNames: ["Junioren F2"],
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

function matchWithLongNames(id: string): WeekplannerMatchItem {
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
    opponentName: "FC Langenthal Spielvereinigung",
    eventSource: "MANUAL",
    homeSide: {
      displayName: "FC Allschwil Sportverein Junioren",
      logoUrl: null,
      isOwnTeam: true,
    },
    awaySide: {
      displayName: "FC Langenthal Spielvereinigung Oberaargau",
      logoUrl: null,
      isOwnTeam: false,
    },
    homeAway: "HOME",
    teamSeasonId: "ts1",
  };
}

function week(items: WeekplannerWeek["days"][0]["items"]): WeekplannerWeek {
  return {
    param: "2026-W40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [
      {
        dayKey: "2026-10-05",
        items,
      },
    ],
  };
}

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null,
  canViewTrainings: true,
  canViewEvents: true,
};

function mcSide(overrides: Partial<MatchcenterSide> = {}): MatchcenterSide {
  const displayName = overrides.displayName ?? "FC Allschwil";
  return {
    providerTeamId: 1,
    providerTeamName: displayName,
    canonicalTeamId: "team-1",
    canonicalTeamName: displayName,
    displayName,
    resolution: "RESOLVED",
    isOwnTeam: true,
    ...overrides,
  };
}

function matchcenterSummary(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "mc-1",
    tenantId: "t1",
    teamId: "team-1",
    seasonId: "s1",
    type: "MATCH",
    title: "Spiel",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-10-05T18:15:00.000Z"),
    endAt: new Date("2026-10-05T20:15:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-10-05T20:15:00.000Z"),
    location: "Kunstrasen 2",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: mcSide({ displayName: "FC Allschwil Sportverein Junioren", isOwnTeam: true }),
    away: mcSide({
      displayName: "FC Langenthal Spielvereinigung Oberaargau",
      isOwnTeam: false,
    }),
    source: {
      eventSource: "MANUAL",
      externalSource: null,
      externalSourceId: null,
      provider: null,
      externalMatchId: null,
      externalSeasonId: null,
      matchNumber: null,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: "KR2",
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: true,
    },
    ...overrides,
  };
}

describe("SCE-DS2-PLANNER-UX-01 — planner list date tiles", () => {
  it("liste row shell renders leading SceDateTile for non-match activities", () => {
    const { container } = render(
      <PlanningHubListeView
        week={week([training("training:1"), matchWithLongNames("match:1")])}
        urlState={{
          week: "2026-W40",
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
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

    const leadingDateRows = container.querySelectorAll("[data-sce-planning-hub-liste-leading-date]");
    expect(leadingDateRows.length).toBe(1);
    const externalDateTiles = container.querySelectorAll('[data-testid^="planning-hub-liste-date-tile-"]');
    expect(externalDateTiles.length).toBe(1);
    expect(container.querySelectorAll('[data-testid="sce-programme-date-tile-day"]').length).toBeGreaterThan(0);
  });

  it("uses tenant timezone for list day headings near midnight UTC", () => {
    const label = formatListOperationalDayHeading("2026-03-29", "de-CH", "Europe/Zurich");
    expect(label.length).toBeGreaterThan(0);
    expect(label).toMatch(/2026|Mär|Montag|Sonntag/i);
  });

  it("match list row fixture band uses flexible team names without break-all", () => {
    const model = resolveSceMatchCardFixture({
      home: {
        ...resolveSceMatchCardFixture().fixture.home,
        displayName: "FC Langenthal Spielvereinigung",
        logoUrl: null,
      },
      away: {
        ...resolveSceMatchCardFixture().fixture.away,
        displayName: "FC Allschwil",
        logoUrl: null,
      },
    });

    const { container } = render(
      <SceMatchCard
        model={model}
        density="STANDARD"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );

    expect(container.innerHTML).not.toContain("break-all");
    expect(container.querySelector('[data-sce-match-programme-fixture="reference-split"]')).toBeTruthy();
    const homeName = container.querySelector('[data-sce-match-region="home-name"]');
    expect(homeName?.textContent).toContain("FC Langenthal");
  });

  it("wiring: match rows use programme-fixture like Matchcenter", () => {
    const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
    expect(row).toContain("usesMatchcenterListComposition");
    const card = read("components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx");
    expect(card).toContain('listRowPresentation="programme-fixture"');
    const matchRow = read("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(matchRow).toContain('listRowPresentation="programme-fixture"');
  });

  it("activity cards use SceProgrammeActivityDateTile on training operational date columns", () => {
    const trainingCard = read("components/sporting-activity/SceTrainingCard.tsx");
    expect(trainingCard).toContain("SceProgrammeActivityDateTile");
    expect(trainingCard).not.toMatch(/trainingReferenceDateClass[\s\S]*formatFixtureDateLine/);
    const fixture = read("components/sporting-activity/SceMatchFixtureReferenceLayout.tsx");
    expect(fixture).toContain("showDateTile");
    expect(fixture).toContain("reference-split");
  });
});

describe("SCE-DS2-PLANNER-UX-01 — Matchcenter composition parity", () => {
  it("planner and Matchcenter match list rows share reference-split fixture presentation", () => {
    const { container: plannerContainer } = render(
      <PlanningHubListeView
        week={week([matchWithLongNames("match:1")])}
        urlState={{
          week: "2026-W40",
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
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

    const mc = matchcenterSummary();
    const { container: mcContainer } = render(
      <SpieleManagementMatchRow
        match={mc}
        assessment={assessMatchOperationalState(mc)}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage={false}
      />,
    );

    const plannerFixture = plannerContainer.querySelector('[data-testid="sce-match-fixture"]');
    const mcFixture = mcContainer.querySelector('[data-testid="sce-match-fixture"]');
    expect(plannerFixture).toHaveAttribute("data-sce-match-programme-fixture", "reference-split");
    expect(mcFixture).toHaveAttribute("data-sce-match-programme-fixture", "reference-split");

    expect(plannerFixture?.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(plannerFixture?.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(mcFixture?.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(mcFixture?.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
  });

  it("match list row has exactly one canonical date tile (reference meta column)", () => {
    render(
      <PlanningHubListeView
        week={week([matchWithLongNames("match:1")])}
        urlState={{
          week: "2026-W40",
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
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

    const row = screen.getByTestId("planning-hub-liste-row-match:1");
    expect(within(row).getByTestId("sce-match-reference-date")).toBeInTheDocument();
    expect(within(row).queryByTestId("planning-hub-liste-date-tile-match:1")).not.toBeInTheDocument();
    expect(within(row).getAllByTestId("sce-match-reference-date")).toHaveLength(1);
  });

  it("exposes planner row menu in Matchcenter-aligned absolute anchor", () => {
    render(
      <PlanningHubListeView
        week={week([matchWithLongNames("match:1")])}
        urlState={{
          week: "2026-W40",
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
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

    const row = screen.getByTestId("planning-hub-liste-row-match:1");
    const menu = within(row).getByTestId("planning-hub-liste-row-menu-match:1");
    const anchor = menu.closest("[data-sce-planning-hub-liste-menu-anchor]");
    expect(anchor?.className).toMatch(/absolute/);
    expect(anchor?.querySelector('[data-sce-planning-hub-liste-column="ACTIONS"]')).toBeNull();
  });
});
