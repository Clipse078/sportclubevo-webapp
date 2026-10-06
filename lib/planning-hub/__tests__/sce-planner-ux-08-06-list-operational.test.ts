import { describe, expect, it } from "vitest";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import {
  applyListOperationalFilters,
  formatListOperationalDayHeading,
  listOperationalItemMatchesSearch,
  listOperationalItemVisible,
  listOperationalRowStatus,
  listOperationalSearchHaystack,
  listOperationalStatusLabel,
  planningHubFiltersActive,
} from "../list-operational";
import { filterWeekplannerItem } from "../filters";

const HAUPTFELD_A = {
  facilityResourceId: "res-hf-a",
  facilityId: "fac-hf",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const HAUPTFELD_B = {
  ...HAUPTFELD_A,
  facilityResourceId: "res-hf-b",
  code: "STADION_B",
  name: "Hauptfeld B",
};

function training(id: string, team: string, pitch = HAUPTFELD_A): WeekplannerTrainingItem {
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

function matchItem(
  id: string,
  team: string,
  opponent: string,
  pitch = HAUPTFELD_A,
): WeekplannerMatchItem {
  return {
    id,
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-05T18:15:00.000Z"),
    endAt: new Date("2026-10-05T20:15:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T18:15:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T20:15:00.000Z"),
    timeOverridden: false,
    title: "Spiel",
    teamNames: [team],
    teamSeasonId: "ts-match-1",
    opponentName: opponent,
    pitchAllocations: [pitch],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
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
    eventId: id,
    eventSource: "SCE",
    homeAway: "HOME",
    homeSide: { displayName: team, logoUrl: null, isOwnTeam: true },
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
        dayKey: "2026-10-05",
        items: annotateWeekplannerConflicts(items),
      },
    ],
  };
}

describe("SCE-PLANNER-UX-08-06 list operational", () => {
  it("groups by day with uppercase weekday heading", () => {
    const heading = formatListOperationalDayHeading("2026-10-05", "de-CH", "Europe/Zurich");
    expect(heading).toMatch(/MONTAG/i);
    expect(heading).toMatch(/OKTOBER/i);
  });

  it("finds Hauptfeld for Hauptfeld A/B via canonical facilityName", () => {
    const a = training("t1", "Junioren F2", HAUPTFELD_A);
    const b = training("t2", "Junioren E1", HAUPTFELD_B);
    expect(listOperationalItemMatchesSearch(a, "Hauptfeld")).toBe(true);
    expect(listOperationalItemMatchesSearch(b, "hauptfeld")).toBe(true);
    expect(listOperationalSearchHaystack(a)).not.toMatch(/stadion_a/i);
  });

  it("searches team and opponent", () => {
    const tr = training("t1", "Junioren F2");
    const sp = matchItem("m1", "Senioren 30+", "FC Dardania");
    expect(listOperationalItemMatchesSearch(tr, "junioren f2")).toBe(true);
    expect(listOperationalItemMatchesSearch(sp, "dardania")).toBe(true);
  });

  it("composes filters with search intersection", () => {
    const week = weekWith([
      training("t1", "Junioren F2", HAUPTFELD_A),
      matchItem("m1", "Senioren 30+", "FC Dardania", HAUPTFELD_B),
    ]);
    const filtered = applyListOperationalFilters(week, {
      activity: "spiele",
      team: null,
      facility: null,
      conflictsOnly: false,
      search: "Hauptfeld",
    });
    expect(filtered.days[0]?.items.map((i) => i.id)).toEqual(["m1"]);
  });

  it("reset contract — planningHubFiltersActive detects composed filters", () => {
    expect(
      planningHubFiltersActive({
        activity: "alle",
        team: null,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
    expect(
      planningHubFiltersActive({
        activity: "spiele",
        team: null,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(true);
  });

  it("exposes conflict and incomplete status labels", () => {
    const incomplete = training("t1", "Team");
    expect(listOperationalStatusLabel(listOperationalRowStatus(incomplete))).toBe("Unvollständig");

    const conflict = {
      ...training("t2", "Team B", HAUPTFELD_A),
      conflicts: [{ facilityResourceId: "x", facilityResourceName: "X" }],
    };
    expect(listOperationalRowStatus(conflict)).toBe("conflict");
    expect(listOperationalStatusLabel("conflict")).toBe("Konflikt");
  });

  it("listOperationalItemVisible mirrors filter + search pipeline", () => {
    const item = training("t1", "Junioren F2");
    expect(
      listOperationalItemVisible(item, {
        activity: "trainings",
        team: null,
        facility: null,
        conflictsOnly: false,
        search: "",
      }),
    ).toBe(true);
    expect(
      listOperationalItemVisible(item, {
        activity: "spiele",
        team: null,
        facility: null,
        conflictsOnly: false,
        search: "",
      }),
    ).toBe(false);
    expect(filterWeekplannerItem(item, { activity: "trainings", team: null, facility: null, conflictsOnly: false })).toBe(
      true,
    );
  });
});
