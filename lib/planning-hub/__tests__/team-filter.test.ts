import { describe, expect, it } from "vitest";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { applyListOperationalFilters, listOperationalItemVisible } from "../list-operational";
import { filterWeekplannerItem } from "../filters";
import { buildPlanningHubTeamOptions } from "../team-filter";

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

function training(teamSeasonId: string, teamLabel: string): WeekplannerTrainingItem {
  return {
    id: `training:${teamSeasonId}`,
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: [teamLabel],
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
    trainingSessionId: teamSeasonId,
    teamSeasonId,
  };
}

function match(
  teamSeasonId: string,
  compactTeamLabel: string,
  opponent: string,
): WeekplannerMatchItem {
  return {
    id: `match:${teamSeasonId}`,
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-09T18:15:00.000Z"),
    endAt: new Date("2026-10-09T20:15:00.000Z"),
    canonicalStartAt: new Date("2026-10-09T18:15:00.000Z"),
    canonicalEndAt: new Date("2026-10-09T20:15:00.000Z"),
    timeOverridden: false,
    title: "Spiel",
    teamNames: [compactTeamLabel],
    teamSeasonId,
    opponentName: opponent,
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
    eventId: teamSeasonId,
    eventSource: "SCE",
    homeAway: "HOME",
    homeSide: { displayName: compactTeamLabel, logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: opponent, logoUrl: null, isOwnTeam: false },
  };
}

function weekWith(items: (WeekplannerTrainingItem | WeekplannerMatchItem)[]): WeekplannerWeek {
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [
      {
        dayKey: "2026-10-09",
        items: annotateWeekplannerConflicts(items),
      },
    ],
  };
}

describe("planning hub team filter — canonical TeamSeason ids", () => {
  const senioren40 = match("ts-senioren-40", "Senioren 40+", "FC Birsfelden");
  const week = weekWith([
    training("ts-senioren-40", "FC Allschwil Senioren 40+"),
    senioren40,
    match("ts-other", "Junioren F2", "FC Test"),
  ]);

  it("shows Senioren 40+ match with Spiele alone", () => {
    const filtered = applyListOperationalFilters(week, {
      activity: "spiele",
      team: null,
      facility: null,
      conflictsOnly: false,
      search: "",
    });
    expect(filtered.days[0]?.items.map((i) => i.id)).toContain("match:ts-senioren-40");
  });

  it("keeps the match when Spiele is combined with FC Allschwil Senioren 40+ teamSeason id", () => {
    expect(
      filterWeekplannerItem(senioren40, {
        activity: "spiele",
        team: "ts-senioren-40",
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(true);

    const filtered = applyListOperationalFilters(week, {
      activity: "spiele",
      team: "ts-senioren-40",
      facility: null,
      conflictsOnly: false,
      search: "",
    });
    expect(filtered.days[0]?.items.map((i) => i.id)).toEqual(["match:ts-senioren-40"]);
  });

  it("does not match by compact display label as filter key", () => {
    expect(
      filterWeekplannerItem(senioren40, {
        activity: "spiele",
        team: "Senioren 40+",
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
  });

  it("excludes the match for an unrelated teamSeason id", () => {
    expect(
      filterWeekplannerItem(senioren40, {
        activity: "spiele",
        team: "ts-other",
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
  });

  it("composes team + type + search", () => {
    expect(
      listOperationalItemVisible(senioren40, {
        activity: "spiele",
        team: "ts-senioren-40",
        facility: null,
        conflictsOnly: false,
        search: "birsfelden",
      }),
    ).toBe(true);
    expect(
      listOperationalItemVisible(senioren40, {
        activity: "spiele",
        team: "ts-senioren-40",
        facility: null,
        conflictsOnly: false,
        search: "junioren",
      }),
    ).toBe(false);
  });

  it("buildPlanningHubTeamOptions prefers long training label for shared teamSeason id", () => {
    const options = buildPlanningHubTeamOptions(week);
    const senioren = options.find((o) => o.value === "ts-senioren-40");
    expect(senioren?.label).toBe("FC Allschwil Senioren 40+");
  });
});
