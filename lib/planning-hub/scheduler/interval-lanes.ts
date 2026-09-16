export type TimedInterval = {
  id: string;
  startMs: number;
  endMs: number;
};

export type IntervalLaneLayout = {
  lane: number;
  /** Lanes required in this interval's overlap cluster (for width %). */
  totalLanes: number;
};

export function intervalsOverlap(a: TimedInterval, b: TimedInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

function compareTimedIntervals(a: TimedInterval, b: TimedInterval): number {
  if (a.startMs !== b.startMs) return a.startMs - b.startMs;
  if (a.endMs !== b.endMs) return a.endMs - b.endMs;
  return a.id.localeCompare(b.id);
}

/**
 * Deterministic lane assignment for temporally overlapping intervals.
 * Temporal overlap alone does not imply resource conflict — layout only.
 */
export function assignIntervalLanes(intervals: readonly TimedInterval[]): Map<string, IntervalLaneLayout> {
  const result = new Map<string, IntervalLaneLayout>();
  if (intervals.length === 0) return result;

  const sorted = [...intervals].sort(compareTimedIntervals);
  const laneEndMs: number[] = [];
  const laneById = new Map<string, number>();

  for (const interval of sorted) {
    let lane = 0;
    while (lane < laneEndMs.length && laneEndMs[lane] > interval.startMs) {
      lane += 1;
    }
    if (lane === laneEndMs.length) {
      laneEndMs.push(interval.endMs);
    } else {
      laneEndMs[lane] = interval.endMs;
    }
    laneById.set(interval.id, lane);
  }

  for (const interval of sorted) {
    const overlapping = sorted.filter((other) => intervalsOverlap(interval, other));
    const maxLane = overlapping.reduce(
      (max, other) => Math.max(max, laneById.get(other.id) ?? 0),
      0,
    );
    result.set(interval.id, { lane: laneById.get(interval.id) ?? 0, totalLanes: maxLane + 1 });
  }

  return result;
}

export function laneHorizontalStyle(layout: IntervalLaneLayout): {
  leftPercent: number;
  widthPercent: number;
} {
  const widthPercent = 100 / layout.totalLanes;
  const leftPercent = layout.lane * widthPercent;
  return { leftPercent, widthPercent };
}
