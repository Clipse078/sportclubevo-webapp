import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "./time-zone";
import { minutesOnReferenceDayToDate, preserveDurationOnMove } from "./time-snap";

export function referenceDayFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

/** Snap horizontal drag in calendar columns to whole-day delta within the visible week. */
export function calendarDayDeltaFromPixelDrag(
  deltaPx: number,
  dayColumnWidthPx: number,
): number {
  if (dayColumnWidthPx <= 0) return 0;
  return Math.round(deltaPx / dayColumnWidthPx);
}

export function resolveCalendarTargetDayKey(
  originalStart: Date,
  dayDelta: number,
  weekDayKeys: readonly string[],
  timeZone: string,
): string | null {
  const origKey = dayKeyInTimeZone(originalStart, timeZone);
  const idx = weekDayKeys.indexOf(origKey);
  if (idx < 0) return null;
  const targetIdx = Math.max(0, Math.min(weekDayKeys.length - 1, idx + dayDelta));
  return weekDayKeys[targetIdx] ?? null;
}

export function moveCalendarActivityPreservingDuration(
  originalStart: Date,
  originalEnd: Date,
  proposedStartMinutes: number,
  targetDayKey: string,
  timeZone: string,
): { startAt: Date; endAt: Date } {
  const referenceDay = referenceDayFromDayKey(targetDayKey);
  return preserveDurationOnMove(
    originalStart,
    originalEnd,
    proposedStartMinutes,
    timeZone,
    referenceDay,
  );
}

export function calendarMoveWithDayAndTimeDelta(
  originalStart: Date,
  originalEnd: Date,
  dayDelta: number,
  minuteDelta: number,
  weekDayKeys: readonly string[],
  timeZone: string,
): { startAt: Date; endAt: Date } | null {
  const targetDayKey = resolveCalendarTargetDayKey(originalStart, dayDelta, weekDayKeys, timeZone);
  if (!targetDayKey) return null;
  const originalStartMin = zonedMinutesFromMidnight(originalStart, timeZone);
  const proposedStartMin = originalStartMin + minuteDelta;
  return moveCalendarActivityPreservingDuration(
    originalStart,
    originalEnd,
    proposedStartMin,
    targetDayKey,
    timeZone,
  );
}
