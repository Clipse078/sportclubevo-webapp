/** Default scheduler snap interval (minutes). Configurable for future tenant refinement. */
export const SCHEDULER_SNAP_MINUTES = 15;

export const SCHEDULER_MIN_DURATION_MINUTES = 15;

/** Snap minutes-from-midnight to the nearest interval (ties round up from half). */
export function snapMinutesFromMidnight(minutes: number, intervalMinutes = SCHEDULER_SNAP_MINUTES): number {
  const clamped = Math.max(0, Math.min(24 * 60 - intervalMinutes, minutes));
  return Math.round(clamped / intervalMinutes) * intervalMinutes;
}

/** Convert a pixel delta along a time axis into snapped minute delta. */
export function snapPixelDeltaToMinutes(
  deltaPx: number,
  pixelsPerMinute: number,
  intervalMinutes = SCHEDULER_SNAP_MINUTES,
): number {
  const rawMinutes = deltaPx / pixelsPerMinute;
  return Math.round(rawMinutes / intervalMinutes) * intervalMinutes;
}

export function preserveDurationOnMove(
  originalStart: Date,
  originalEnd: Date,
  proposedStartMinutes: number,
  timeZone: string,
  referenceDay: Date,
): { startAt: Date; endAt: Date } {
  const durationMs = originalEnd.getTime() - originalStart.getTime();
  const startAt = minutesOnReferenceDayToDate(proposedStartMinutes, referenceDay, timeZone);
  const endAt = new Date(startAt.getTime() + durationMs);
  return { startAt, endAt };
}

export function resizeEndPreservingStart(
  originalStart: Date,
  proposedEndMinutes: number,
  timeZone: string,
  referenceDay: Date,
  minDurationMinutes = SCHEDULER_MIN_DURATION_MINUTES,
): { startAt: Date; endAt: Date } | null {
  const startAt = originalStart;
  const endAt = minutesOnReferenceDayToDate(proposedEndMinutes, referenceDay, timeZone);
  const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (durationMinutes < minDurationMinutes) return null;
  if (endAt.getTime() <= startAt.getTime()) return null;
  return { startAt, endAt };
}

export function resizeStartPreservingEnd(
  originalEnd: Date,
  proposedStartMinutes: number,
  timeZone: string,
  referenceDay: Date,
  minDurationMinutes = SCHEDULER_MIN_DURATION_MINUTES,
): { startAt: Date; endAt: Date } | null {
  const endAt = originalEnd;
  const startAt = minutesOnReferenceDayToDate(proposedStartMinutes, referenceDay, timeZone);
  const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (durationMinutes < minDurationMinutes) return null;
  if (endAt.getTime() <= startAt.getTime()) return null;
  return { startAt, endAt };
}

/** Build a Date at `minutesFromMidnight` on the same calendar day as `referenceDay` in `timeZone`. */
export function minutesOnReferenceDayToDate(
  minutesFromMidnight: number,
  referenceDay: Date,
  timeZone: string,
): Date {
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDay);
  const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const mm = String(minutesFromMidnight % 60).padStart(2, "0");
  const naiveUtcGuess = new Date(`${dayKey}T${hh}:${mm}:00.000Z`);
  const zonedFormat = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const shownAsIfUtc = zonedFormat.format(naiveUtcGuess);
  const [shownHour, shownMinute] = shownAsIfUtc.replace(/^24:/, "00:").split(":").map(Number);
  const targetMinutes = Number(hh) * 60 + Number(mm);
  const shownMinutes = shownHour * 60 + shownMinute;
  const diffMinutes = targetMinutes - shownMinutes;
  return new Date(naiveUtcGuess.getTime() + diffMinutes * 60_000);
}
