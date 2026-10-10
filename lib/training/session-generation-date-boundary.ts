/**
 * Calendar-date boundary for training session regeneration.
 *
 * Past occurrences keep their persisted schedule when a series template changes;
 * only today-and-future SCHEDULED rows sync derived schedule from the series.
 */

import { dateKeyFromDate } from "@/lib/training/recurrence";

/** YYYY-MM-DD for "today" in the given IANA timezone. */
export function calendarDateKeyTodayInTimezone(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * True when the session's stored calendar date (UTC-midnight key) is strictly
 * before today in the series timezone.
 */
export function isTrainingSessionDateBeforeTodayInTimezone(
  sessionDateUtcMidnight: Date,
  timezone: string,
  now: Date = new Date(),
): boolean {
  const sessionKey = dateKeyFromDate(sessionDateUtcMidnight);
  const todayKey = calendarDateKeyTodayInTimezone(timezone, now);
  return sessionKey < todayKey;
}
