import { describe, expect, it } from "vitest";
import {
  CALENDAR_MIN_ACTIVITY_WIDTH_PX,
  planCalendarDayLayout,
  shouldAggregateCluster,
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
    expect(shouldAggregateCluster(4, 400, CALENDAR_MIN_ACTIVITY_WIDTH_PX)).toBe(false);
    expect(shouldAggregateCluster(8, 120, CALENDAR_MIN_ACTIVITY_WIDTH_PX)).toBe(true);
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
});
