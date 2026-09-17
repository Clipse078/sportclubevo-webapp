import { describe, expect, it } from "vitest";
import {
  CALENDAR_AGGREGATE_BELOW_WIDTH_PX,
  CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
  CALENDAR_MIN_ACTIVITY_WIDTH_PX,
  planCalendarDayLayout,
  shouldAggregateCluster,
  shouldUseCompactActivityBlock,
} from "../calendar-day-layout";
import { assignIntervalLanes } from "../interval-lanes";
import { buildOverlapClusters } from "../overlap-clusters";

describe("planCalendarDayLayout", () => {
  it("renders a single activity without aggregation", () => {
    const layout = planCalendarDayLayout(
      [{ id: "a", startMs: 0, endMs: 60 }],
      200,
    );
    expect(layout).toHaveLength(1);
    expect(layout[0]?.kind).toBe("activity");
  });

  it("renders two overlapping activities side by side when width allows", () => {
    const layout = planCalendarDayLayout(
      [
        { id: "a", startMs: 0, endMs: 90 },
        { id: "b", startMs: 15, endMs: 105 },
      ],
      200,
    );
    expect(layout.every((s) => s.kind === "activity")).toBe(true);
  });

  it("aggregates high-concurrency clusters when lanes would be too narrow", () => {
    const intervals = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`,
      startMs: 0,
      endMs: 90,
    }));
    const layout = planCalendarDayLayout(intervals, 120);
    expect(layout.some((s) => s.kind === "aggregate")).toBe(true);
    const aggregate = layout.find((s) => s.kind === "aggregate");
    if (aggregate?.kind === "aggregate") {
      expect(aggregate.itemIds).toHaveLength(8);
    }
  });

  it("does not shrink non-overlapping later activities", () => {
    const lanes = assignIntervalLanes([
      { id: "early", startMs: 0, endMs: 60 },
      { id: "late", startMs: 120, endMs: 180 },
    ]);
    expect(lanes.get("late")?.totalLanes).toBe(1);
  });

  it("builds deterministic overlap clusters", () => {
    const clusters = buildOverlapClusters([
      { id: "b", startMs: 0, endMs: 60 },
      { id: "a", startMs: 0, endMs: 60 },
      { id: "c", startMs: 120, endMs: 180 },
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.intervalIds).toEqual(["a", "b"]);
  });

  it("aggregation threshold responds to column width", () => {
    expect(shouldAggregateCluster(4, 400)).toBe(false);
    expect(shouldAggregateCluster(8, 120)).toBe(true);
    expect(shouldUseCompactActivityBlock(4, 200)).toBe(true);
    expect(shouldUseCompactActivityBlock(2, 200)).toBe(false);
  });

  it("measured wider column delays aggregation", () => {
    const narrow = planCalendarDayLayout(
      Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, startMs: 0, endMs: 60 })),
      100,
    );
    const wide = planCalendarDayLayout(
      Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, startMs: 0, endMs: 60 })),
      480,
    );
    const narrowAgg = narrow.some((s) => s.kind === "aggregate");
    const wideAgg = wide.some((s) => s.kind === "aggregate");
    expect(narrowAgg).toBe(true);
    expect(wideAgg).toBe(false);
  });

  it("keeps three overlapping activities separate when width allows", () => {
    const layout = planCalendarDayLayout(
      [
        { id: "a", startMs: 0, endMs: 60 },
        { id: "b", startMs: 0, endMs: 60 },
        { id: "c", startMs: 0, endMs: 60 },
      ],
      280,
    );
    expect(layout.filter((s) => s.kind === "activity")).toHaveLength(3);
  });

  it("Ganzer Tag threshold aggregates triple overlap when lanes fall below readable width", () => {
    const intervals = [
      { id: "a", startMs: 0, endMs: 60 },
      { id: "b", startMs: 0, endMs: 60 },
      { id: "c", startMs: 0, endMs: 60 },
    ];
    const withLegacy = planCalendarDayLayout(intervals, 200, {
      aggregateBelowPx: CALENDAR_AGGREGATE_BELOW_WIDTH_PX,
    });
    const withFullDay = planCalendarDayLayout(intervals, 200, {
      aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
    });
    expect(withLegacy.every((s) => s.kind === "activity")).toBe(true);
    expect(withFullDay.some((s) => s.kind === "aggregate")).toBe(true);
    const aggregate = withFullDay.find((s) => s.kind === "aggregate");
    if (aggregate?.kind === "aggregate") {
      expect(aggregate.itemIds).toEqual(["a", "b", "c"]);
    }
  });

  it("Ganzer Tag keeps later non-overlapping activity individual when busy cluster aggregates", () => {
    const layout = planCalendarDayLayout(
      [
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `busy-${i}`,
          startMs: 0,
          endMs: 90,
        })),
        { id: "solo", startMs: 120, endMs: 180 },
      ],
      120,
      { aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX },
    );
    expect(layout.some((s) => s.kind === "aggregate")).toBe(true);
    expect(layout.some((s) => s.kind === "activity" && s.itemId === "solo")).toBe(true);
  });

  it("wider Ganzer Tag viewport exposes more individual overlap detail", () => {
    const intervals = [
      { id: "a", startMs: 0, endMs: 60 },
      { id: "b", startMs: 0, endMs: 60 },
    ];
    const narrow = planCalendarDayLayout(intervals, 140, {
      aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
    });
    const wide = planCalendarDayLayout(intervals, 320, {
      aggregateBelowPx: CALENDAR_FULL_DAY_AGGREGATE_BELOW_WIDTH_PX,
    });
    expect(narrow.some((s) => s.kind === "aggregate")).toBe(true);
    expect(wide.every((s) => s.kind === "activity")).toBe(true);
  });
});
