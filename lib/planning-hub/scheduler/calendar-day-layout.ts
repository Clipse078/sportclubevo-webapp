import { assignIntervalLanes, type IntervalLaneLayout, type TimedInterval } from "./interval-lanes";
import { buildOverlapClusters } from "./overlap-clusters";

/** Minimum pixel width for a readable activity column (not tenant-specific). */
export const CALENDAR_MIN_ACTIVITY_WIDTH_PX = 76;

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

export function shouldAggregateCluster(
  maxConcurrency: number,
  columnWidthPx: number,
  minWidthPx = CALENDAR_MIN_ACTIVITY_WIDTH_PX,
): boolean {
  if (maxConcurrency <= 1) return false;
  const laneWidth = columnWidthPx / maxConcurrency;
  return laneWidth < minWidthPx;
}

/**
 * Plans per-day calendar segments: individual lanes or one aggregate per
 * high-concurrency overlap cluster. Visual only — canonical items unchanged.
 */
export function planCalendarDayLayout(
  intervals: readonly TimedInterval[],
  columnWidthPx: number,
): CalendarDayLayoutItem[] {
  if (intervals.length === 0) return [];

  const lanes = assignIntervalLanes(intervals);
  const clusters = buildOverlapClusters(intervals);
  const aggregatedIds = new Set<string>();
  const segments: CalendarDayLayoutItem[] = [];

  for (const cluster of clusters) {
    const maxConcurrency = clusterMaxConcurrency(cluster.intervalIds, lanes);
    if (shouldAggregateCluster(maxConcurrency, columnWidthPx)) {
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
