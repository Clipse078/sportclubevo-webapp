import { describe, expect, it } from "vitest";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { applyListOperationalFilters } from "../list-operational";
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

/** Realistic SFV week: Event.teamSeasonId null on match; canonical id from read-model resolution. */
function senioren40Match(resolvedTeamSeasonId: string | null): WeekplannerMatchItem {
  return {
    id: "match:event-sfv-40",
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-09T18:30:00.000Z"),
    endAt: new Date("2026-10-09T20:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-09T18:30:00.000Z"),
    canonicalEndAt: new Date("2026-10-09T20:30:00.000Z"),
    timeOverridden: false,
    title: "Senioren 40+ vs FC Birsfelden",
    teamNames: ["Senioren 40+"],
    teamSeasonId: resolvedTeamSeasonId,
    opponentName: "FC Birsfelden",
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
    eventId: "event-sfv-40",
    eventSource: "SFV",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 40+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Birsfelden", logoUrl: null, isOwnTeam: false },
  };
}

function senioren40Training(): WeekplannerTrainingItem {
  return {
    id: "training:ts-senioren-40",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-06T17:00:00.000Z"),
    endAt: new Date("2026-10-06T18:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-06T17:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-06T18:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["FC Allschwil Senioren 40+"],
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
    trainingSeriesId: "s40",
    trainingSessionId: "sess-40",
    teamSeasonId: "ts-senioren-40-fca",
  };
}

function senioren30Training(): WeekplannerTrainingItem {
  return {
    id: "training:ts-senioren-30",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-07T17:00:00.000Z"),
    endAt: new Date("2026-10-07T18:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-07T17:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-07T18:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["FC Allschwil Senioren 30+"],
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
    trainingSeriesId: "s30",
    trainingSessionId: "sess-30",
    teamSeasonId: "ts-senioren-30-fca",
  };
}

function weekWith(items: (WeekplannerTrainingItem | WeekplannerMatchItem)[]): WeekplannerWeek {
  const byDay = new Map<string, (WeekplannerTrainingItem | WeekplannerMatchItem)[]>();
  for (const item of items) {
    const dayKey = item.startAt.toISOString().slice(0, 10);
    const bucket = byDay.get(dayKey) ?? [];
    bucket.push(item);
    byDay.set(dayKey, bucket);
  }
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [...byDay.entries()].map(([dayKey, dayItems]) => ({
      dayKey,
      items: annotateWeekplannerConflicts(dayItems),
    })),
  };
}

describe("SCE-PLANNER-UX-08-06R2 — Senioren 40+ SFV match team filter", () => {
  const TS_40 = "ts-senioren-40-fca";
  const TS_30 = "ts-senioren-30-fca";
  const match = senioren40Match(TS_40);
  const week = weekWith([senioren30Training(), match]);

  it("A — Spiele alone shows Senioren 40+ vs FC Birsfelden", () => {
    const filtered = applyListOperationalFilters(week, {
      activity: "spiele",
      team: null,
      facility: null,
      conflictsOnly: false,
      search: "",
    });
    const ids = filtered.days.flatMap((d) => d.items.map((i) => i.id));
    expect(ids).toContain("match:event-sfv-40");
  });

  it("B — Spiele + canonical TeamSeason for Senioren 40+ keeps the match", () => {
    expect(
      filterWeekplannerItem(match, {
        activity: "spiele",
        team: TS_40,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(true);
  });

  it("C — Spiele + Senioren 30+ excludes Senioren 40+ match", () => {
    expect(
      filterWeekplannerItem(match, {
        activity: "spiele",
        team: TS_30,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
  });

  it("D — Alle + Senioren 30+ shows training", () => {
    const filtered = applyListOperationalFilters(week, {
      activity: "alle",
      team: TS_30,
      facility: null,
      conflictsOnly: false,
      search: "",
    });
    expect(filtered.days.flatMap((d) => d.items.map((i) => i.id))).toEqual(["training:ts-senioren-30"]);
  });

  it("E — Spiele + Senioren 30+ yields zero matches", () => {
    const filtered = applyListOperationalFilters(week, {
      activity: "spiele",
      team: TS_30,
      facility: null,
      conflictsOnly: false,
      search: "",
    });
    expect(filtered.days.every((d) => d.items.length === 0)).toBe(true);
  });

  it("F — filter does not match compact display label as team key", () => {
    expect(
      filterWeekplannerItem(match, {
        activity: "spiele",
        team: "Senioren 40+",
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
    expect(
      filterWeekplannerItem(match, {
        activity: "spiele",
        team: "FC Allschwil Senioren 40+",
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
  });

  it("proves null teamSeasonId on match fails filter until read-model resolves id", () => {
    const unresolved = senioren40Match(null);
    expect(
      filterWeekplannerItem(unresolved, {
        activity: "spiele",
        team: TS_40,
        facility: null,
        conflictsOnly: false,
      }),
    ).toBe(false);
  });

  it("team dropdown uses canonical id with long training label when match has compact team name", () => {
    const options = buildPlanningHubTeamOptions(
      weekWith([senioren40Training(), senioren30Training(), senioren40Match(TS_40)]),
    );
    const opt40 = options.find((o) => o.value === TS_40);
    expect(opt40?.label).toBe("FC Allschwil Senioren 40+");
  });
});
