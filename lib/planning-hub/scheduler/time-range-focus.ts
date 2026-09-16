import type { TimeInterval, VisibleTimeRange } from "./time-scale";
import {
  SCHEDULER_EMPTY_DAY_END_MINUTES,
  SCHEDULER_EMPTY_DAY_START_MINUTES,
  SCHEDULER_MIN_VISIBLE_MINUTES,
  SCHEDULER_TIME_PADDING_MINUTES,
  computeVisibleTimeRange,
} from "./time-scale";
import { zonedMinutesFromMidnight } from "./time-zone";

export type CalendarTimeRangeMode = "focused" | "full";

function snapDownToHalfHour(minutes: number): number {
  return Math.floor(minutes / 30) * 30;
}

function snapUpToHalfHour(minutes: number): number {
  return Math.ceil(minutes / 30) * 30;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * Derives a focused operational window from activity distribution (generic, multi-tenant).
 * Uses interquartile span of start/end times with padding; never excludes activities from full mode.
 */
export function computeFocusedOperationalTimeRange(
  intervals: readonly TimeInterval[],
  timeZone: string,
): VisibleTimeRange {
  if (intervals.length === 0) {
    return computeVisibleTimeRange([], timeZone);
  }

  const starts: number[] = [];
  const ends: number[] = [];
  for (const interval of intervals) {
    const start = zonedMinutesFromMidnight(interval.startAt, timeZone);
    const end = Math.max(start + 15, zonedMinutesFromMidnight(interval.endAt, timeZone));
    starts.push(start);
    ends.push(end);
  }
  starts.sort((a, b) => a - b);
  ends.sort((a, b) => a - b);

  const qStart = percentile(starts, 0.2);
  const qEnd = percentile(ends, 0.8);
  const globalMin = starts[0]!;
  const globalMax = ends[ends.length - 1]!;

  let startMinutes = snapDownToHalfHour(qStart - SCHEDULER_TIME_PADDING_MINUTES);
  let endMinutes = snapUpToHalfHour(qEnd + SCHEDULER_TIME_PADDING_MINUTES);

  startMinutes = Math.max(0, startMinutes);
  endMinutes = Math.min(24 * 60, endMinutes);

  if (endMinutes - startMinutes < SCHEDULER_MIN_VISIBLE_MINUTES) {
    const center = (globalMin + globalMax) / 2;
    startMinutes = Math.max(0, snapDownToHalfHour(center - SCHEDULER_MIN_VISIBLE_MINUTES / 2));
    endMinutes = Math.min(24 * 60, startMinutes + SCHEDULER_MIN_VISIBLE_MINUTES);
  }

  return {
    startMinutes,
    endMinutes,
    totalMinutes: endMinutes - startMinutes,
  };
}

export type CalendarTimeRangeResult = {
  range: VisibleTimeRange;
  fullRange: VisibleTimeRange;
  hasEarlierActivities: boolean;
  hasLaterActivities: boolean;
};

export function resolveCalendarTimeRange(
  intervals: readonly TimeInterval[],
  timeZone: string,
  mode: CalendarTimeRangeMode,
): CalendarTimeRangeResult {
  const fullRange = computeVisibleTimeRange(intervals, timeZone);
  if (mode === "full" || intervals.length === 0) {
    return {
      range: fullRange,
      fullRange,
      hasEarlierActivities: false,
      hasLaterActivities: false,
    };
  }

  const focused = computeFocusedOperationalTimeRange(intervals, timeZone);
  return {
    range: focused,
    fullRange,
    hasEarlierActivities: focused.startMinutes > fullRange.startMinutes,
    hasLaterActivities: focused.endMinutes < fullRange.endMinutes,
  };
}

export function emptyWeekFallbackRange(): VisibleTimeRange {
  const startMinutes = SCHEDULER_EMPTY_DAY_START_MINUTES;
  const endMinutes = SCHEDULER_EMPTY_DAY_END_MINUTES;
  return {
    startMinutes,
    endMinutes,
    totalMinutes: endMinutes - startMinutes,
  };
}
