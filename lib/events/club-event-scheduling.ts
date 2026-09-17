/**
 * SCE-EVENTS-01 — tenant-local scheduling semantics for Veranstaltungen (Event.type=OTHER).
 *
 * All-day events use exclusive endAt at the start of the calendar day after the
 * last inclusive day (iCal-style), never 00:00–23:59 wall times.
 */

import { zonedTimeToUtc } from "@/lib/training/recurrence";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

export class ClubEventScheduleError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ClubEventScheduleError";
  }
}

export type ParsedClubEventSchedule = {
  allDay: boolean;
  startAt: Date;
  endAt: Date | null;
};

export type ClubEventScheduleFormInput = {
  allDay: boolean;
  /** YYYY-MM-DD — start calendar date (all-day) or combined with startTime (timed). */
  startDate: string;
  /** YYYY-MM-DD — inclusive last day when allDay; ignored when single-day timed. */
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

function parseDateKey(raw: string, field: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!DATE_KEY_RE.test(trimmed)) {
    throw new ClubEventScheduleError("Ungültiges Datum.", field);
  }
  return trimmed;
}

function parseTime(raw: string | null | undefined, field: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!TIME_RE.test(trimmed)) {
    throw new ClubEventScheduleError("Ungültige Uhrzeit.", field);
  }
  return trimmed;
}

function addCalendarDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Midnight at the start of `dateKey` in `timeZone`. */
export function startOfTenantCalendarDay(dateKey: string, timeZone: string): Date {
  return zonedTimeToUtc(dateKey, "00:00", timeZone);
}

/** Exclusive end instant: midnight at the start of the day after `inclusiveEndDateKey`. */
export function exclusiveEndAfterInclusiveDay(
  inclusiveEndDateKey: string,
  timeZone: string,
): Date {
  const nextKey = addCalendarDays(inclusiveEndDateKey, 1);
  return startOfTenantCalendarDay(nextKey, timeZone);
}

export function inclusiveEndDateKeyFromExclusiveEnd(
  endAt: Date,
  timeZone: string,
): string {
  const endDayKey = zonedDateKeyFromInstant(endAt, timeZone);
  return addCalendarDays(endDayKey, -1);
}

export function zonedDateKeyFromInstant(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseClubEventScheduleInput(
  input: ClubEventScheduleFormInput,
  timeZone?: string | null,
): ParsedClubEventSchedule {
  const tz = resolveTenantEventTimezone(timeZone);
  const startDate = parseDateKey(input.startDate, "startDate");

  if (input.allDay) {
    const endDateRaw = input.endDate?.trim() || startDate;
    const endDate = parseDateKey(endDateRaw, "endDate");
    if (compareDateKeys(endDate, startDate) < 0) {
      throw new ClubEventScheduleError(
        "Enddatum darf nicht vor dem Startdatum liegen.",
        "endDate",
      );
    }
    const startAt = startOfTenantCalendarDay(startDate, tz);
    const endAt = exclusiveEndAfterInclusiveDay(endDate, tz);
    if (endAt.getTime() <= startAt.getTime()) {
      throw new ClubEventScheduleError("Ungültiger Zeitraum.", "endDate");
    }
    return { allDay: true, startAt, endAt };
  }

  const startTime = parseTime(input.startTime, "startTime");
  const startAt = zonedTimeToUtc(startDate, startTime, tz);

  let endAt: Date | null = null;
  if (input.endTime?.trim()) {
    const endTime = parseTime(input.endTime, "endTime");
    const endDateForTimed = input.endDate?.trim()
      ? parseDateKey(input.endDate, "endDate")
      : startDate;
    endAt = zonedTimeToUtc(endDateForTimed, endTime, tz);
    if (endAt.getTime() <= startAt.getTime()) {
      throw new ClubEventScheduleError(
        "Ende muss nach dem Beginn liegen.",
        "endTime",
      );
    }
  }

  return { allDay: false, startAt, endAt };
}

export function allDayInclusiveDayKeys(
  startAt: Date,
  endAt: Date,
  timeZone: string,
): string[] {
  const startKey = zonedDateKeyFromInstant(startAt, timeZone);
  const lastInclusive = inclusiveEndDateKeyFromExclusiveEnd(endAt, timeZone);
  const keys: string[] = [];
  let cursor = startKey;
  while (compareDateKeys(cursor, lastInclusive) <= 0) {
    keys.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return keys;
}

export function formatClubEventTimingLabel(
  input: {
    allDay: boolean;
    startAt: Date;
    endAt: Date | null;
  },
  locale: string,
  timeZone: string,
): string {
  if (input.allDay) {
    return "Ganztägig";
  }
  const fmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const start = fmt.format(input.startAt);
  if (!input.endAt) return start;
  return `${start}–${fmt.format(input.endAt)}`;
}

export function formatClubEventDateHeading(
  input: {
    allDay: boolean;
    startAt: Date;
    endAt: Date | null;
  },
  locale: string,
  timeZone: string,
): string {
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone,
  });
  const shortDayFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone,
  });

  if (!input.allDay) {
    return dayFmt.format(input.startAt);
  }

  const startKey = zonedDateKeyFromInstant(input.startAt, timeZone);
  if (!input.endAt) {
    return dayFmt.format(input.startAt);
  }
  const endInclusive = inclusiveEndDateKeyFromExclusiveEnd(input.endAt, timeZone);
  if (endInclusive === startKey) {
    return dayFmt.format(input.startAt);
  }

  const startShort = shortDayFmt.format(input.startAt);
  const endShort = shortDayFmt.format(
    startOfTenantCalendarDay(endInclusive, timeZone),
  );
  const yearFmt = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone });
  const year = yearFmt.format(input.startAt);
  return `${startShort}.–${endShort}. ${year}`;
}

export function clubEventScheduleFormFromPersisted(
  event: { allDay: boolean; startAt: Date; endAt: Date | null },
  timeZone: string,
): ClubEventScheduleFormInput {
  const tz = resolveTenantEventTimezone(timeZone);
  const startDate = zonedDateKeyFromInstant(event.startAt, tz);
  if (event.allDay) {
    const endDate = event.endAt
      ? inclusiveEndDateKeyFromExclusiveEnd(event.endAt, tz)
      : startDate;
    return { allDay: true, startDate, endDate };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(event.startAt);
  const startValues = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const startHour = startValues.hour === "24" ? "00" : startValues.hour;
  const startTime = `${startHour}:${startValues.minute}`;

  let endTime: string | null = null;
  let endDate: string | null = null;
  if (event.endAt) {
    const endParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(event.endAt);
    const endValues = Object.fromEntries(endParts.map((p) => [p.type, p.value]));
    const endHour = endValues.hour === "24" ? "00" : endValues.hour;
    endTime = `${endHour}:${endValues.minute}`;
    endDate = zonedDateKeyFromInstant(event.endAt, tz);
  }

  return {
    allDay: false,
    startDate,
    endDate,
    startTime,
    endTime,
  };
}

export function formatClubEventListDateColumn(
  input: {
    allDay: boolean;
    startAt: Date;
    endAt: Date | null;
    /** When listing under a specific day bucket, pass that day key for multi-day rows. */
    contextDayKey?: string;
  },
  locale: string,
  timeZone: string,
): string {
  const shortDayFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone,
  });

  if (!input.allDay) {
    return shortDayFmt.format(input.startAt);
  }

  const startKey = zonedDateKeyFromInstant(input.startAt, timeZone);
  const endInclusive = input.endAt
    ? inclusiveEndDateKeyFromExclusiveEnd(input.endAt, timeZone)
    : startKey;

  if (endInclusive === startKey) {
    return shortDayFmt.format(input.startAt);
  }

  const startShort = shortDayFmt.format(input.startAt);
  const endShort = shortDayFmt.format(
    startOfTenantCalendarDay(endInclusive, timeZone),
  );
  return `${startShort}.–${endShort}.`;
}
