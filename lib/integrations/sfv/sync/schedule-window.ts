/**
 * lib/integrations/sfv/sync/schedule-window.ts
 *
 * Utilities for computing and validating the SFV schedule synchronization
 * date window.
 *
 * The SFV /api/club/schedule endpoint supports DateFrom and DateUntil filters
 * but provides no incremental updatedSince filter. We use a rolling window
 * centered on the current date.
 *
 * All date boundaries are UTC. ISO 8601 date strings (YYYY-MM-DD) are used
 * for API parameters; Date objects are used internally.
 *
 * No side effects. No database access. All functions are pure.
 */

import {
  SCHEDULE_WINDOW_PAST_DAYS,
  SCHEDULE_WINDOW_FUTURE_DAYS,
  SCHEDULE_WINDOW_MAX_DAYS,
  SCHEDULE_WINDOW_MIN_DAYS,
} from "./schedule-types";

// ── Window computation ─────────────────────────────────────────────────────────

/**
 * Returns the default sync window boundaries anchored to the given reference
 * date (defaults to now).
 *
 * dateFrom = referenceDate − SCHEDULE_WINDOW_PAST_DAYS (UTC midnight)
 * dateTo   = referenceDate + SCHEDULE_WINDOW_FUTURE_DAYS (UTC midnight)
 *
 * Both boundaries are truncated to UTC midnight (time 00:00:00.000Z) so that
 * the full day is included regardless of the time of day the sync runs.
 */
export function computeDefaultWindow(referenceDate?: Date): {
  dateFrom: Date;
  dateTo: Date;
} {
  const ref = referenceDate ?? new Date();

  // Truncate to UTC midnight
  const today = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );

  const dateFrom = new Date(today);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - SCHEDULE_WINDOW_PAST_DAYS);

  const dateTo = new Date(today);
  dateTo.setUTCDate(dateTo.getUTCDate() + SCHEDULE_WINDOW_FUTURE_DAYS);

  return { dateFrom, dateTo };
}

/**
 * Validates that a date range is within safe boundaries.
 *
 * Returns an error message string when invalid, or null when valid.
 *
 * Rules:
 *   - dateFrom must be before dateTo.
 *   - Range must not exceed SCHEDULE_WINDOW_MAX_DAYS.
 *   - Range must be at least SCHEDULE_WINDOW_MIN_DAYS.
 */
export function validateWindow(dateFrom: Date, dateTo: Date): string | null {
  const fromMs = dateFrom.getTime();
  const toMs = dateTo.getTime();

  if (fromMs >= toMs) {
    return "dateFrom must be before dateTo.";
  }

  const rangeDays = (toMs - fromMs) / (1000 * 60 * 60 * 24);

  if (rangeDays > SCHEDULE_WINDOW_MAX_DAYS) {
    return `Date range exceeds maximum of ${SCHEDULE_WINDOW_MAX_DAYS} days.`;
  }

  if (rangeDays < SCHEDULE_WINDOW_MIN_DAYS) {
    return `Date range is below minimum of ${SCHEDULE_WINDOW_MIN_DAYS} day(s).`;
  }

  return null;
}

/**
 * Formats a Date as an ISO 8601 date-time string suitable for the SFV API.
 *
 * Format: YYYY-MM-DDTHH:mm:ss (UTC, no timezone suffix — SFV API convention).
 * Example: "2026-06-13T00:00:00"
 */
export function toSfvDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Formats a Date as a plain ISO 8601 date string (YYYY-MM-DD) for logging
 * and result output.
 */
export function toIsoDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a YYYY-MM-DD string as UTC midnight. Returns null when invalid.
 */
export function parseIsoDateOnlyUtc(value: string): Date | null {
  const trimmed = value.trim();
  if (!ISO_DATE_ONLY_PATTERN.test(trimmed)) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Validates caller-supplied ISO date bounds for a bounded schedule refresh.
 */
export function parseBoundedScheduleWindow(
  dateFromStr: string,
  dateToStr: string,
): { dateFrom: Date; dateTo: Date } | { error: string } {
  const dateFrom = parseIsoDateOnlyUtc(dateFromStr);
  const dateTo = parseIsoDateOnlyUtc(dateToStr);

  if (!dateFrom) {
    return { error: "dateFrom must be a valid ISO date (YYYY-MM-DD)." };
  }

  if (!dateTo) {
    return { error: "dateTo must be a valid ISO date (YYYY-MM-DD)." };
  }

  const windowError = validateWindow(dateFrom, dateTo);
  if (windowError) {
    return { error: windowError };
  }

  return { dateFrom, dateTo };
}

/** SFV DateUntil for an inclusive calendar end date (UTC end-of-day). */
export function toSfvDateUntilInclusive(dateToUtcMidnight: Date): string {
  const end = new Date(dateToUtcMidnight.getTime());
  end.setUTCHours(23, 59, 59, 0);
  return toSfvDateParam(end);
}
