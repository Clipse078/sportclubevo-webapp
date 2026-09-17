import { describe, expect, it } from "vitest";
import { summarizeAggregateCluster } from "../scheduler/aggregate-cluster";
import {
  CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
  planCalendarDayLayout,
} from "../scheduler/calendar-day-layout";
import { buildPlanningHubHref, parsePlanningHubUrlState } from "../planner-url";
import { resolveCalendarViewport } from "../planning-dayparts";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

function training(id: string): WeekplannerTrainingItem {
  const start = new Date("2026-09-16T15:00:00.000Z");
  const end = new Date("2026-09-16T16:30:00.000Z");
  return {
    id: `training:${id}`,
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: `Training ${id}`,
    teamNames: ["Team"],
    teamSeasonId: "ts1",
    trainingSessionId: id,
    trainingSeriesId: "s1",
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [{ facilityResourceId: "r1", facilityResourceName: "Platz 1" }],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

describe("SCE-EVENTS-01C1 Ganzer Tag layout recovery", () => {
  it("preserves default Ganzer Tag URL contract", () => {
    expect(parsePlanningHubUrlState({}).calendarZeit).toBeUndefined();
    expect(buildPlanningHubHref(parsePlanningHubUrlState({}))).not.toContain("zeit=");
    expect(resolveCalendarViewport(undefined, new Date(), "Europe/Zurich").mode).toBe("full");
  });

  it("aggregates dense overlap at typical day column width", () => {
    const layout = planCalendarDayLayout(
      Array.from({ length: 7 }, (_, i) => ({
        id: `t${i}`,
        startMs: 0,
        endMs: 90,
      })),
      120,
      { aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX },
    );
    expect(layout).toHaveLength(1);
    expect(layout[0]?.kind).toBe("aggregate");
  });

  it("cluster summary exposes count, time, and conflict rollup", () => {
    const items = [training("1"), training("2"), training("3")];
    const summary = summarizeAggregateCluster(items, "17:00–18:30");
    expect(summary.headline).toMatch(/3/);
    expect(summary.conflictCount).toBe(3);
    expect(summary.conflictLabel).toBeTruthy();
  });

  it("single non-overlapping event stays an individual block", () => {
    const layout = planCalendarDayLayout(
      [{ id: "solo", startMs: 0, endMs: 60 }],
      120,
      { aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX },
    );
    expect(layout).toHaveLength(1);
    expect(layout[0]?.kind).toBe("activity");
  });
});
