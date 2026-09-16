import { assignIntervalLanes, type IntervalLaneLayout, type TimedInterval } from "./interval-lanes";
import { buildOverlapClusters } from "./overlap-clusters";

/** Comfortable minimum width for full activity detail. */
export const CALENDAR_MIN_ACTIVITY_WIDTH_PX = 76;

/** Below this lane width, overlap cluster aggregates instead of compact strips. */
export const CALENDAR_AGGREGATE_BELOW_WIDTH_PX = 44;

/** 02D daypart viewport — slightly higher thresholds so identities show more often. */
export const CALENDAR_DAYPART_AGGREGATE_BELOW_WIDTH_PX = 38;
export const CALENDAR_DAYPART_MIN_ACTIVITY_WIDTH_PX = 68;

export type CalendarDayLayoutItem =
  | {
      kind: "activity";
      itemId: string;
      layout: IntervalLaneLayout;
    }
  | {
      kind: "aggregate";
      clusterId: string;
      itemIds: string[];
      startMs: number;
      endMs: number;
    };

export function estimateDayColumnWidthPx(
  dayMinWidthPx: number,
  gridContainerWidthPx?: number,
): number {
  if (gridContainerWidthPx && gridContainerWidthPx > 0) {
    const timeGutter = 52;
    const dayArea = Math.max(dayMinWidthPx, (gridContainerWidthPx - timeGutter) / 7);
    return dayArea;
  }
  return dayMinWidthPx;
}

export function clusterMaxConcurrency(
  clusterItemIds: readonly string[],
  lanes: ReadonlyMap<string, IntervalLaneLayout>,
): number {
  let max = 1;
  for (const id of clusterItemIds) {
    max = Math.max(max, lanes.get(id)?.totalLanes ?? 1);
  }
  return max;
}

export function laneWidthPx(maxConcurrency: number, columnWidthPx: number): number {
  if (maxConcurrency <= 1) return columnWidthPx;
  return columnWidthPx / maxConcurrency;
}

export function shouldAggregateCluster(
  maxConcurrency: number,
  columnWidthPx: number,
  aggregateBelowPx = CALENDAR_AGGREGATE_BELOW_WIDTH_PX,
): boolean {
  if (maxConcurrency <= 1) return false;
  return laneWidthPx(maxConcurrency, columnWidthPx) < aggregateBelowPx;
}

export function shouldUseCompactActivityBlock(
  maxConcurrency: number,
  columnWidthPx: number,
): boolean {
  if (maxConcurrency <= 1) return false;
  const w = laneWidthPx(maxConcurrency, columnWidthPx);
  return w >= CALENDAR_AGGREGATE_BELOW_WIDTH_PX && w < CALENDAR_MIN_ACTIVITY_WIDTH_PX;
}

/**
 * Plans per-day calendar segments: individual lanes or one aggregate per
 * high-concurrency overlap cluster. Visual only — canonical items unchanged.
 */
export type CalendarDayLayoutOptions = {
  aggregateBelowPx?: number;
};

export function planCalendarDayLayout(
  intervals: readonly TimedInterval[],
  columnWidthPx: number,
  options?: CalendarDayLayoutOptions,
): CalendarDayLayoutItem[] {
  const aggregateBelowPx = options?.aggregateBelowPx ?? CALENDAR_AGGREGATE_BELOW_WIDTH_PX;
  if (intervals.length === 0) return [];

  const lanes = assignIntervalLanes(intervals);
  const clusters = buildOverlapClusters(intervals);
  const aggregatedIds = new Set<string>();
  const segments: CalendarDayLayoutItem[] = [];

  for (const cluster of clusters) {
    const maxConcurrency = clusterMaxConcurrency(cluster.intervalIds, lanes);
    if (shouldAggregateCluster(maxConcurrency, columnWidthPx, aggregateBelowPx)) {
      const clusterIntervals = cluster.intervalIds
        .map((id) => intervals.find((i) => i.id === id))
        .filter((i): i is TimedInterval => Boolean(i));
      const startMs = Math.min(...clusterIntervals.map((i) => i.startMs));
      const endMs = Math.max(...clusterIntervals.map((i) => i.endMs));
      for (const id of cluster.intervalIds) aggregatedIds.add(id);
      segments.push({
        kind: "aggregate",
        clusterId: cluster.id,
        itemIds: cluster.intervalIds,
        startMs,
        endMs,
      });
    }
  }

  const sorted = [...intervals].sort(
    (a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id),
  );
  for (const interval of sorted) {
    if (aggregatedIds.has(interval.id)) continue;
    segments.push({
      kind: "activity",
      itemId: interval.id,
      layout: lanes.get(interval.id) ?? { lane: 0, totalLanes: 1 },
    });
  }

  segments.sort((a, b) => {
    const aStart =
      a.kind === "activity"
        ? intervals.find((i) => i.id === a.itemId)?.startMs ?? 0
        : a.startMs;
    const bStart =
      b.kind === "activity"
        ? intervals.find((i) => i.id === b.itemId)?.startMs ?? 0
        : b.startMs;
    return aStart - bStart;
  });

  return segments;
}
