import { describe, expect, it } from "vitest";
import {
  buildTrainingSeriesManagementRows,
  deriveGroupedTeamStatus,
  filterTrainingSeriesManagementRows,
  groupPerSeriesRowsByTeam,
  paginateTrainingSeriesManagementRows,
  parseTrainingSeriesManagementSort,
  resolveTeamManagementContextLabel,
  resolveTeamManagementPrimaryTitle,
  sortTrainingSeriesManagementRows,
} from "../management-series-view";
import { trainingManagementStatusPresentation } from "../management-presentation";
import {
  buildTrainingSessionManagementRows,
  filterTrainingSessionManagementRows,
  paginateTrainingSessionManagementRows,
  resolveManagementSessionDateWindow,
} from "../management-session-view";
import { isLegacyTrainingCalendarUrl, buildNormalizedTrainingManagementHref } from "../legacy-training-url";
import { buildTrainingSessionWochenplanerHref } from "../wochenplaner-deep-links";
import type { TrainingSessionDto, TrainingSeriesDto } from "../types";

const SERIES: TrainingSeriesDto = {
  id: "series-1",
  tenantId: "tenant-1",
  teamSeasonId: "ts-1",
  title: "Junioren F2",
  description: null,
  status: "ACTIVE",
  startsAt: "17:00",
  endsAt: "18:30",
  timezone: "Europe/Zurich",
  weekdays: ["MONDAY", "WEDNESDAY"],
  weekdaySchedules: [
    { weekday: "MONDAY", startsAt: "17:00", endsAt: "18:30" },
    { weekday: "WEDNESDAY", startsAt: "17:00", endsAt: "18:30" },
  ],
  validFrom: null,
  validUntil: null,
  archivedAt: null,
  sessionCount: 12,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  planningStage: "APPROVED",
  planningSubmittedAt: null,
  planningSubmittedById: null,
  planningValidatedAt: null,
  planningValidatedById: null,
  createdByUserId: null,
};

const BUILD_DEFAULT = {
  tenantName: "FC Allschwil",
  teamDisplayNameByTeamSeasonId: new Map([["ts-1", "1. Mannschaft"]]),
  teamLabelByTeamSeasonId: new Map([["ts-1", "1. Mannschaft"]]),
  allocationsBySeriesId: new Map<string, never>(),
};

describe("TRAININGS-UX-01J2 team-grouped management view models", () => {
  it("defaults sort parser to team A–Z", () => {
    expect(parseTrainingSeriesManagementSort(undefined)).toBe("TEAM_ASC");
    expect(parseTrainingSeriesManagementSort("")).toBe("TEAM_ASC");
    expect(parseTrainingSeriesManagementSort("UPDATED_DESC")).toBe("UPDATED_DESC");
  });

  it("aggregates multiple series for the same team into one management row", () => {
    const mondaySeries: TrainingSeriesDto = {
      ...SERIES,
      id: "series-mon",
      title: "1. Mannschaft Training",
      weekdaySchedules: [{ weekday: "MONDAY", startsAt: "18:45", endsAt: "20:15" }],
    };
    const wednesdaySeries: TrainingSeriesDto = {
      ...SERIES,
      id: "series-wed",
      title: "1. Mannschaft Training",
      weekdaySchedules: [{ weekday: "WEDNESDAY", startsAt: "18:45", endsAt: "20:15" }],
    };
    const fridaySeries: TrainingSeriesDto = {
      ...SERIES,
      id: "series-fri",
      title: "1. Mannschaft Training",
      weekdaySchedules: [{ weekday: "FRIDAY", startsAt: "18:45", endsAt: "20:15" }],
    };

    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [mondaySeries, wednesdaySeries, fridaySeries],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.weekdays).toEqual(["MONDAY", "WEDNESDAY", "FRIDAY"]);
    expect(rows[0]?.rhythmLabel).toBe("Mo · Mi · Fr");
    expect(rows[0]?.timeLabel).toBe("18:45–20:15");
    expect(rows[0]?.seriesEntries).toHaveLength(3);
  });

  it("deduplicates weekday pills across aggregated series", () => {
    const duplicateWeekday: TrainingSeriesDto = {
      ...SERIES,
      id: "series-a",
      weekdaySchedules: [{ weekday: "MONDAY", startsAt: "18:45", endsAt: "20:15" }],
    };
    const duplicateWeekdayB: TrainingSeriesDto = {
      ...SERIES,
      id: "series-b",
      weekdaySchedules: [{ weekday: "MONDAY", startsAt: "19:00", endsAt: "20:30" }],
    };

    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [duplicateWeekday, duplicateWeekdayB],
    });

    expect(rows[0]?.weekdays).toEqual(["MONDAY"]);
  });

  it("sorts grouped rows naturally by team A–Z by default", () => {
    const teamB: TrainingSeriesDto = { ...SERIES, id: "b", teamSeasonId: "ts-b", title: "B Team Training" };
    const teamA: TrainingSeriesDto = { ...SERIES, id: "a", teamSeasonId: "ts-a", title: "A Team Training" };

    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [teamB, teamA],
      teamDisplayNameByTeamSeasonId: new Map([
        ["ts-a", "A Team"],
        ["ts-b", "B Team"],
      ]),
      teamLabelByTeamSeasonId: new Map([
        ["ts-a", "A Team"],
        ["ts-b", "B Team"],
      ]),
    });

    const sorted = sortTrainingSeriesManagementRows(rows, "TEAM_ASC");
    expect(sorted.map((row) => row.teamSeasonId)).toEqual(["ts-a", "ts-b"]);
  });

  it("shows uniform aggregated time when all team series share the same slot", () => {
    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [
        {
          ...SERIES,
          id: "s1",
          weekdaySchedules: [{ weekday: "MONDAY", startsAt: "18:45", endsAt: "20:15" }],
        },
        {
          ...SERIES,
          id: "s2",
          weekdaySchedules: [{ weekday: "FRIDAY", startsAt: "18:45", endsAt: "20:15" }],
        },
      ],
    });

    expect(rows[0]?.timeLabel).toBe("18:45–20:15");
    expect(rows[0]?.timeDetailLines).toBeNull();
  });

  it("shows different times honestly for grouped teams", () => {
    const variableSeries: TrainingSeriesDto = {
      ...SERIES,
      weekdaySchedules: [
        { weekday: "MONDAY", startsAt: "18:45", endsAt: "20:15" },
        { weekday: "WEDNESDAY", startsAt: "19:45", endsAt: "21:15" },
      ],
    };

    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [variableSeries],
    });

    expect(rows[0]?.timeLabel).toBe("Unterschiedliche Zeiten");
    expect(rows[0]?.timeDetailLines).toEqual(["Mo 18:45–20:15", "Mi 19:45–21:15"]);
  });

  it("summarizes primary facility and extra count across team series", () => {
    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [SERIES],
      allocationsBySeriesId: new Map([
        [
          "series-1",
          [
            {
              id: "a1",
              tenantId: "tenant-1",
              trainingSeriesId: "series-1",
              facilityResourceId: "r1",
              facilityResourceName: "Kunstrasen 2 A",
              facilityResourceCode: "KR2A",
              facilityResourceType: "FULL_PITCH",
              facilityId: "f1",
              facilityName: "Anlage",
              notes: null,
              displayOrder: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "a2",
              tenantId: "tenant-1",
              trainingSeriesId: "series-1",
              facilityResourceId: "r2",
              facilityResourceName: "Kunstrasen 3 B",
              facilityResourceCode: "KR3B",
              facilityResourceType: "HALF_PITCH",
              facilityId: "f1",
              facilityName: "Anlage",
              notes: null,
              displayOrder: 1,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ],
      ]),
    });

    expect(rows[0]?.facilityLabel).toBe("Kunstrasen 2 A");
    expect(rows[0]?.facilityExtraCount).toBe(1);
  });

  it("derives grouped active status when any series is active", () => {
    expect(
      deriveGroupedTeamStatus([
        { status: "INACTIVE" },
        { status: "ACTIVE" },
      ]),
    ).toBe("ACTIVE");
    expect(deriveGroupedTeamStatus([{ status: "INACTIVE" }])).toBe("INACTIVE");
    expect(deriveGroupedTeamStatus([{ status: "ARCHIVED" }, { status: "ARCHIVED" }])).toBe("ARCHIVED");
  });

  it("filters grouped rows by search, team, and status", () => {
    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [SERIES],
    });

    expect(filterTrainingSeriesManagementRows(rows, { search: "junioren", teamSeasonId: "ts-1" })).toHaveLength(1);
    expect(filterTrainingSeriesManagementRows(rows, { teamSeasonId: "other" })).toHaveLength(0);
    expect(filterTrainingSeriesManagementRows(rows, { status: "INACTIVE" })).toHaveLength(0);
  });

  it("paginates after aggregation using grouped totals", () => {
    const manyTeams = Array.from({ length: 11 }, (_, index) => ({
      ...SERIES,
      id: `series-${index}`,
      teamSeasonId: `ts-${index}`,
      title: `Team ${index} Training`,
    }));

    const rows = buildTrainingSeriesManagementRows({
      tenantName: "FC Allschwil",
      teamDisplayNameByTeamSeasonId: new Map(manyTeams.map((series) => [series.teamSeasonId, series.title])),
      teamLabelByTeamSeasonId: new Map(manyTeams.map((series) => [series.teamSeasonId, series.title])),
      allocationsBySeriesId: new Map(),
      series: manyTeams,
    });

    expect(rows).toHaveLength(11);

    const page1 = paginateTrainingSeriesManagementRows(rows, 1, 10);
    expect(page1.rows).toHaveLength(10);
    expect(page1.totalCount).toBe(11);
    expect(page1.rangeStart).toBe(1);
    expect(page1.rangeEnd).toBe(10);

    const page2 = paginateTrainingSeriesManagementRows(rows, 2, 10);
    expect(page2.rows).toHaveLength(1);
    expect(page2.rangeStart).toBe(11);
  });

  it("builds team identity title and tenant context label", () => {
    expect(resolveTeamManagementPrimaryTitle("1. Mannschaft", ["1. Mannschaft Training"])).toBe(
      "1. Mannschaft Training",
    );
    expect(resolveTeamManagementContextLabel("FC Allschwil", "1. Mannschaft")).toBe(
      "FC Allschwil · 1. Mannschaft",
    );
  });

  it("exposes compact active/inactive status labels without workflow badges", () => {
    expect(trainingManagementStatusPresentation("ACTIVE").label).toBe("Aktiv");
    expect(trainingManagementStatusPresentation("INACTIVE").label).toBe("Inaktiv");
    expect(trainingManagementStatusPresentation("ACTIVE").badgeClassName).toContain("emerald");
  });

  it("represents missing pitch allocation as null facility label", () => {
    const rows = buildTrainingSeriesManagementRows({
      ...BUILD_DEFAULT,
      series: [SERIES],
    });
    expect(rows[0]?.facilityLabel).toBeNull();
  });

  it("sorts grouped rows by updatedAt when requested", () => {
    const older: TrainingSeriesDto = {
      ...SERIES,
      id: "series-old",
      teamSeasonId: "ts-old",
      title: "Alpha",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const newer: TrainingSeriesDto = {
      ...SERIES,
      id: "series-new",
      teamSeasonId: "ts-new",
      title: "Beta",
      updatedAt: "2026-02-01T00:00:00.000Z",
    };

    const rows = buildTrainingSeriesManagementRows({
      tenantName: "FC Allschwil",
      teamDisplayNameByTeamSeasonId: new Map([
        ["ts-old", "Old"],
        ["ts-new", "New"],
      ]),
      teamLabelByTeamSeasonId: new Map([
        ["ts-old", "Old"],
        ["ts-new", "New"],
      ]),
      allocationsBySeriesId: new Map(),
      series: [older, newer],
    });

    const sorted = sortTrainingSeriesManagementRows(rows, "UPDATED_DESC");
    expect(sorted.map((row) => row.teamSeasonId)).toEqual(["ts-new", "ts-old"]);
  });

  it("groupPerSeriesRowsByTeam keeps series entries for multi-series action safety", () => {
    const grouped = groupPerSeriesRowsByTeam({
      tenantName: "FC Allschwil",
      teamLabelByTeamSeasonId: BUILD_DEFAULT.teamLabelByTeamSeasonId,
      perSeriesRows: [
        {
          seriesId: "s1",
          teamSeasonId: "ts-1",
          title: "1. Mannschaft Training",
          teamDisplayName: "1. Mannschaft",
          weekdays: ["MONDAY"],
          rhythmLabel: "Mo",
          timeLabel: "18:45–20:15",
          timeLines: null,
          sortStartTime: "18:45",
          facilityLabel: null,
          facilityExtraCount: 0,
          facilityLabels: [],
          status: "ACTIVE",
          planningStage: "APPROVED",
          validFrom: null,
          validUntil: null,
          sessionCount: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
          actionLabel: "Montag · 18:45–20:15",
        },
        {
          seriesId: "s2",
          teamSeasonId: "ts-1",
          title: "1. Mannschaft Training",
          teamDisplayName: "1. Mannschaft",
          weekdays: ["WEDNESDAY"],
          rhythmLabel: "Mi",
          timeLabel: "18:45–20:15",
          timeLines: null,
          sortStartTime: "18:45",
          facilityLabel: null,
          facilityExtraCount: 0,
          facilityLabels: [],
          status: "ACTIVE",
          planningStage: "APPROVED",
          validFrom: null,
          validUntil: null,
          sessionCount: 1,
          updatedAt: "2026-01-02T00:00:00.000Z",
          actionLabel: "Mittwoch · 18:45–20:15",
        },
      ],
    });

    expect(grouped[0]?.seriesEntries).toHaveLength(2);
    expect(grouped[0]?.seriesEntries.map((entry) => entry.actionLabel)).toEqual([
      "Montag · 18:45–20:15",
      "Mittwoch · 18:45–20:15",
    ]);
  });
});

describe("SCE-TRAININGS-UX-01 session management helpers (unchanged)", () => {
  it("derives session exception and cancelled display states", () => {
    const base: TrainingSessionDto = {
      id: "s1",
      tenantId: "tenant-1",
      trainingSeriesId: "series-1",
      trainingSeriesTitle: "Junioren F2",
      teamSeasonId: "ts-1",
      teamName: "Junioren F2",
      date: "2026-09-23",
      weekday: "WEDNESDAY",
      startAt: "2026-09-23T13:45:00.000Z",
      endAt: "2026-09-23T15:15:00.000Z",
      timezone: "Europe/Zurich",
      status: "SCHEDULED",
      originalDate: "2026-09-23",
      originalStartAt: "2026-09-23T15:00:00.000Z",
      originalEndAt: "2026-09-23T16:30:00.000Z",
      isRescheduled: true,
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomBeforeMinutes: null,
      dressingRoomAfterMinutes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const rows = buildTrainingSessionManagementRows({
      sessions: [base],
      seriesAllocationSummaries: new Map(),
      sessionAllocationSummaries: new Map(),
      sessionAllocationsBySessionId: new Map(),
      pitchNameBySeriesId: new Map([["series-1", "Kunstrasen 2"]]),
    });

    expect(rows[0]?.displayStatus).toBe("AUSNAHME");
    expect(rows[0]?.exceptionReasons).toContain("Zeit geändert");

    const cancelled = buildTrainingSessionManagementRows({
      sessions: [{ ...base, status: "CANCELLED" }],
      seriesAllocationSummaries: new Map(),
      sessionAllocationSummaries: new Map(),
      sessionAllocationsBySessionId: new Map(),
      pitchNameBySeriesId: new Map(),
    });
    expect(cancelled[0]?.displayStatus).toBe("ABGESAGT");
  });

  it("paginates session rows", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      sessionId: `s-${index}`,
      trainingSeriesId: "series-1",
      teamSeasonId: "ts-1",
      date: "2026-09-23",
      teamName: "Team",
      seriesTitle: "Serie",
      startAt: "2026-09-23T13:45:00.000Z",
      endAt: "2026-09-23T15:15:00.000Z",
      timezone: "Europe/Zurich",
      facilityLabel: null,
      status: "SCHEDULED" as const,
      displayStatus: "GEPLANT" as const,
      exceptionReasons: [],
      contextLabel: "Aus Serie · Serie",
      isRescheduled: false,
    }));

    const page1 = paginateTrainingSessionManagementRows(rows, 1, 2);
    expect(page1.rows).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextPage).toBe(2);

    const filtered = filterTrainingSessionManagementRows(rows, { status: "GEPLANT" });
    expect(filtered).toHaveLength(5);
  });

  it("uses bounded upcoming session window", () => {
    const window = resolveManagementSessionDateWindow({ now: new Date("2026-09-17T12:00:00.000Z"), horizonDays: 7 });
    expect(window.dateFromKey).toBe("2026-09-17");
    expect(window.dateToKey).toBe("2026-09-24");
  });

  it("normalizes legacy calendar URLs", () => {
    expect(isLegacyTrainingCalendarUrl({ tab: "kalender" })).toBe(true);
    expect(isLegacyTrainingCalendarUrl({ view: "month" })).toBe(true);
    expect(isLegacyTrainingCalendarUrl({ tab: "serien" })).toBe(true);
    expect(buildNormalizedTrainingManagementHref({ tab: "kalender", seriesSearch: "f2" })).toBe(
      "/dashboard/training?seriesSearch=f2",
    );
  });

  it("builds wochenplaner deep link for a session week", () => {
    const href = buildTrainingSessionWochenplanerHref({
      sessionDate: "2026-09-23",
      teamSeasonId: "ts-1",
      timezone: "Europe/Zurich",
      now: new Date("2026-09-17T12:00:00.000Z"),
    });
    expect(href).toContain("/dashboard/planner/week");
    expect(href).toContain("week=2026-09-21");
    expect(href).toContain("typ=trainings");
    expect(href).toContain("team=ts-1");
  });
});
