/**
 * @vitest-environment jsdom
 * SCE-DS2-PLANNER-UX-01 — Wochenplaner canonical date tiles + list card alignment.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { formatListOperationalDayHeading } from "@/lib/planning-hub/list-operational";
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

describe("SCE-DS2-PLANNER-UX-01 — planner list date tiles", () => {
  it("liste row shell renders leading SceDateTile per activity type", () => {
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
    expect(leadingDateRows.length).toBe(2);
    const dateTiles = container.querySelectorAll('[data-testid^="planning-hub-liste-date-tile-"]');
    expect(dateTiles.length).toBe(2);
    expect(container.querySelectorAll('[data-testid="sce-programme-date-tile-day"]').length).toBeGreaterThan(0);
    expect(screen.queryByTestId("sce-match-reference-date")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-training-list-row-date")).not.toBeInTheDocument();
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
        listRowPresentation="programme-personal"
        linkToDetail={false}
      />,
    );

    expect(container.innerHTML).not.toContain("break-all");
    expect(container.querySelector('[data-sce-match-programme-fixture="planner-liste"]')).toBeTruthy();
    const homeName = container.querySelector('[data-sce-match-region="home-name"]');
    expect(homeName?.textContent).toContain("FC Langenthal");
  });

  it("wiring: PlanningHubListeActivityRow uses canonical date tile shell", () => {
    const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
    expect(row).toContain("SceProgrammeActivityDateTile");
    expect(row).toContain("planningHubListeRowShellClass");
    const card = read("components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx");
    expect(card).toContain("programme-personal");
  });

  it("activity cards use SceProgrammeActivityDateTile on operational date columns", () => {
    const training = read("components/sporting-activity/SceTrainingCard.tsx");
    expect(training).toContain("SceProgrammeActivityDateTile");
    expect(training).not.toMatch(/trainingReferenceDateClass[\s\S]*formatFixtureDateLine/);
    const fixture = read("components/sporting-activity/SceMatchFixtureReferenceLayout.tsx");
    expect(fixture).toContain("showDateTile");
    expect(fixture).toContain("plannerListeMatchRootClass");
  });
});
