import { describe, expect, it } from "vitest";
import {
  buildTrainingSeriesManagementRows,
  filterTrainingSeriesManagementRows,
} from "../management-series-view";
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

describe("SCE-TRAININGS-UX-01 management view models", () => {
  it("aggregates series rows with rhythm and time labels", () => {
    const rows = buildTrainingSeriesManagementRows({
      series: [SERIES],
      teamDisplayNameByTeamSeasonId: new Map([["ts-1", "Junioren F2 Team"]]),
      allocationsBySeriesId: new Map([
        [
          "series-1",
          [
            {
              id: "a1",
              tenantId: "tenant-1",
              trainingSeriesId: "series-1",
              facilityResourceId: "r1",
              facilityResourceName: "Kunstrasen 2",
              facilityResourceCode: "KR2",
              facilityResourceType: "FULL_PITCH",
              facilityId: "f1",
              facilityName: "Anlage",
              notes: null,
              displayOrder: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ],
      ]),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.rhythmLabel).toBe("Mo · Mi");
    expect(rows[0]?.timeLabel).toBe("17:00–18:30");
    expect(rows[0]?.facilityLabel).toBe("Kunstrasen 2");
  });

  it("produces one management row per series with variable weekday times", () => {
    const variableSeries: TrainingSeriesDto = {
      ...SERIES,
      weekdaySchedules: [
        { weekday: "MONDAY", startsAt: "18:45", endsAt: "20:15" },
        { weekday: "WEDNESDAY", startsAt: "19:45", endsAt: "21:15" },
        { weekday: "FRIDAY", startsAt: "18:45", endsAt: "20:15" },
      ],
    };

    const rows = buildTrainingSeriesManagementRows({
      series: [variableSeries],
      teamDisplayNameByTeamSeasonId: new Map([["ts-1", "1. Mannschaft"]]),
      allocationsBySeriesId: new Map(),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.rhythmLabel).toBe("Mo · Mi · Fr");
    expect(rows[0]?.timeLabel).toBe("Variabel");
    expect(rows[0]?.timeLines).toEqual([
      "Mo 18:45–20:15",
      "Mi 19:45–21:15",
      "Fr 18:45–20:15",
    ]);
  });

  it("filters series by search and team", () => {
    const rows = buildTrainingSeriesManagementRows({
      series: [SERIES],
      teamDisplayNameByTeamSeasonId: new Map([["ts-1", "Junioren F2 Team"]]),
      allocationsBySeriesId: new Map(),
    });

    expect(filterTrainingSeriesManagementRows(rows, { search: "junioren", teamSeasonId: "ts-1" })).toHaveLength(1);
    expect(filterTrainingSeriesManagementRows(rows, { teamSeasonId: "other" })).toHaveLength(0);
  });

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
