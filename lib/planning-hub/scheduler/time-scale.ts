import { zonedMinutesFromMidnight } from "./time-zone";

export type TimeInterval = {
  startAt: Date;
  endAt: Date;
};

/** Minimum visible span when the week/day has activities (minutes). */
export const SCHEDULER_MIN_VISIBLE_MINUTES = 6 * 60;

/** Padding before earliest / after latest activity (minutes). */
export const SCHEDULER_TIME_PADDING_MINUTES = 20;

/** Fallback range when no activities exist (local minutes from midnight). */
export const SCHEDULER_EMPTY_DAY_START_MINUTES = 8 * 60;
export const SCHEDULER_EMPTY_DAY_END_MINUTES = 20 * 60;

/** Vertical calendar: pixels per minute. */
/** ~6–8h visible in a typical laptop viewport at default zoom. */
export const CALENDAR_PIXELS_PER_MINUTE = 0.95;

/** Horizontal resource scheduler: pixels per minute. */
export const RESOURCE_PIXELS_PER_MINUTE = 2.4;

export type VisibleTimeRange = {
  startMinutes: number;
  endMinutes: number;
  totalMinutes: number;
};

function snapDownToHalfHour(minutes: number): number {
  return Math.floor(minutes / 30) * 30;
}

function snapUpToHalfHour(minutes: number): number {
  return Math.ceil(minutes / 30) * 30;
}

/**
 * Derives a stable visible time window from activity intervals in local time.
 * Multi-tenant safe — driven only by actual activity times.
 */
export function computeVisibleTimeRange(
  intervals: readonly TimeInterval[],
  timeZone: string,
): VisibleTimeRange {
  if (intervals.length === 0) {
    const startMinutes = SCHEDULER_EMPTY_DAY_START_MINUTES;
    const endMinutes = SCHEDULER_EMPTY_DAY_END_MINUTES;
    return {
      startMinutes,
      endMinutes,
      totalMinutes: endMinutes - startMinutes,
    };
  }

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  for (const interval of intervals) {
    const start = zonedMinutesFromMidnight(interval.startAt, timeZone);
    const end = Math.max(start + 15, zonedMinutesFromMidnight(interval.endAt, timeZone));
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
  }

  let startMinutes = snapDownToHalfHour(minStart - SCHEDULER_TIME_PADDING_MINUTES);
  let endMinutes = snapUpToHalfHour(maxEnd + SCHEDULER_TIME_PADDING_MINUTES);

  startMinutes = Math.max(0, startMinutes);
  endMinutes = Math.min(24 * 60, endMinutes);

  if (endMinutes - startMinutes < SCHEDULER_MIN_VISIBLE_MINUTES) {
    const center = (minStart + maxEnd) / 2;
    startMinutes = Math.max(0, snapDownToHalfHour(center - SCHEDULER_MIN_VISIBLE_MINUTES / 2));
    endMinutes = Math.min(24 * 60, startMinutes + SCHEDULER_MIN_VISIBLE_MINUTES);
    if (endMinutes > 24 * 60) {
      endMinutes = 24 * 60;
      startMinutes = Math.max(0, endMinutes - SCHEDULER_MIN_VISIBLE_MINUTES);
    }
  }

  return {
    startMinutes,
    endMinutes,
    totalMinutes: endMinutes - startMinutes,
  };
}

export function minutesToCalendarTopPx(
  minutes: number,
  range: VisibleTimeRange,
  pixelsPerMinute = CALENDAR_PIXELS_PER_MINUTE,
): number {
  return (minutes - range.startMinutes) * pixelsPerMinute;
}

export function durationToCalendarHeightPx(
  startMinutes: number,
  endMinutes: number,
  range: VisibleTimeRange,
  pixelsPerMinute = CALENDAR_PIXELS_PER_MINUTE,
): number {
  const clampedStart = Math.max(startMinutes, range.startMinutes);
  const clampedEnd = Math.min(endMinutes, range.endMinutes);
  return Math.max(12, (clampedEnd - clampedStart) * pixelsPerMinute);
}

export function minutesToResourceLeftPx(
  minutes: number,
  range: VisibleTimeRange,
  pixelsPerMinute = RESOURCE_PIXELS_PER_MINUTE,
): number {
  return (minutes - range.startMinutes) * pixelsPerMinute;
}

export function durationToResourceWidthPx(
  startMinutes: number,
  endMinutes: number,
  range: VisibleTimeRange,
  pixelsPerMinute = RESOURCE_PIXELS_PER_MINUTE,
): number {
  const clampedStart = Math.max(startMinutes, range.startMinutes);
  const clampedEnd = Math.min(endMinutes, range.endMinutes);
  return Math.max(24, (clampedEnd - clampedStart) * pixelsPerMinute);
}
