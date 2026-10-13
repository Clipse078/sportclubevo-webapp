/**
 * SCE-CLUB-EVENT-AUDIENCE-01-R1 — deterministic club event recurrence engine.
 *
 * Pure calendar generation (no DB). Reuses zoned wall-clock resolution from
 * lib/training/recurrence.ts for DST-safe tenant-local times.
 */

import type { ClubEventMonthOrdinal, Weekday } from "@prisma/client";
import {
  dateKeyFromDate,
  toDateOnlyUtc,
  zonedTimeToUtc,
} from "@/lib/training/recurrence";
import { parseClubEventScheduleInput } from "@/lib/events/club-event-scheduling";
import type {
  ClubEventRecurrenceRule,
  GeneratedClubEventOccurrence,
} from "@/lib/events/club-event-recurrence-types";
import { MAX_CLUB_EVENT_SERIES_OCCURRENCES as MAX_OCC } from "@/lib/events/club-event-recurrence-types";

const JS_DAY_TO_WEEKDAY: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const WEEKDAY_TO_JS: Record<Weekday, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d };
}

function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function addMonthsToDateKey(dateKey: string, months: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return formatDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, d);
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function weekdayFromDateKey(dateKey: string): Weekday {
  const { y, m, d } = parseDateKey(dateKey);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return JS_DAY_TO_WEEKDAY[jsDay];
}

function listDatesInMonthMatchingWeekday(year: number, month: number, weekday: Weekday): string[] {
  const targetJs = WEEKDAY_TO_JS[weekday];
  const matches: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (jsDay === targetJs) {
      matches.push(formatDateKey(year, month, day));
    }
  }
  return matches;
}

function resolveOrdinalWeekdayDate(
  year: number,
  month: number,
  weekday: Weekday,
  ordinal: ClubEventMonthOrdinal,
): string | null {
  const matches = listDatesInMonthMatchingWeekday(year, month, weekday);
  if (matches.length === 0) return null;
  switch (ordinal) {
    case "FIRST":
      return matches[0] ?? null;
    case "SECOND":
      return matches[1] ?? null;
    case "THIRD":
      return matches[2] ?? null;
    case "FOURTH":
      return matches[3] ?? null;
    case "LAST":
      return matches[matches.length - 1] ?? null;
    default:
      return null;
  }
}

function resolveEndBoundary(rule: ClubEventRecurrenceRule): string | null {
  if (rule.endMode === "ON_DATE") {
    return rule.endDateKey;
  }
  return null;
}

function withinBounds(dateKey: string, startKey: string, endKey: string | null): boolean {
  if (compareDateKeys(dateKey, startKey) < 0) return false;
  if (endKey && compareDateKeys(dateKey, endKey) > 0) return false;
  return true;
}

function listWeeklyDateKeys(rule: ClubEventRecurrenceRule): string[] {
  if (!rule.weekday) return [];
  const endKey = resolveEndBoundary(rule);
  let cursor = rule.seriesStartDateKey;
  for (let i = 0; i < 366; i++) {
    if (weekdayFromDateKey(cursor) === rule.weekday) break;
    cursor = addDaysToDateKey(cursor, 1);
  }

  const keys: string[] = [];
  const stepDays = 7 * rule.intervalCount;
  while (keys.length < MAX_OCC) {
    if (!withinBounds(cursor, rule.seriesStartDateKey, endKey)) {
      if (endKey && compareDateKeys(cursor, endKey) > 0) break;
    } else {
      keys.push(cursor);
    }
    if (endKey && compareDateKeys(cursor, endKey) >= 0) break;
    cursor = addDaysToDateKey(cursor, stepDays);
  }

  return applyCountLimit(keys, rule);
}

function listMonthlyFixedDayDateKeys(rule: ClubEventRecurrenceRule): string[] {
  if (!rule.monthDay) return [];
  const endKey = resolveEndBoundary(rule);
  const keys: string[] = [];
  let cursor = `${rule.seriesStartDateKey.slice(0, 7)}-01`;

  for (let i = 0; i < 120; i++) {
    const { y, m } = parseDateKey(cursor);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = Math.min(Math.max(rule.monthDay, 1), daysInMonth);
    const dateKey = formatDateKey(y, m, day);

    if (withinBounds(dateKey, rule.seriesStartDateKey, endKey)) {
      keys.push(dateKey);
    }
    if (endKey && compareDateKeys(dateKey, endKey) >= 0) break;
    if (keys.length >= MAX_OCC) break;

    cursor = addMonthsToDateKey(cursor, rule.intervalCount);
  }

  return applyCountLimit(keys, rule);
}

function listMonthlyOrdinalWeekdayDateKeys(rule: ClubEventRecurrenceRule): string[] {
  if (!rule.weekday || !rule.monthOrdinal) return [];
  const endKey = resolveEndBoundary(rule);
  const keys: string[] = [];
  let cursor = rule.seriesStartDateKey.slice(0, 7);

  for (let i = 0; i < 120; i++) {
    const [yStr, mStr] = cursor.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const dateKey = resolveOrdinalWeekdayDate(y, m, rule.weekday, rule.monthOrdinal);
    if (dateKey && withinBounds(dateKey, rule.seriesStartDateKey, endKey)) {
      keys.push(dateKey);
    }
    if (endKey && dateKey && compareDateKeys(dateKey, endKey) >= 0) break;
    if (keys.length >= MAX_OCC) break;
    cursor = addMonthsToDateKey(`${y}-${String(m).padStart(2, "0")}-01`, rule.intervalCount).slice(0, 7);
  }

  return applyCountLimit(keys, rule);
}

function applyCountLimit(keys: string[], rule: ClubEventRecurrenceRule): string[] {
  const unique = [...new Set(keys)].sort(compareDateKeys);
  if (rule.endMode === "AFTER_COUNT" && rule.occurrenceCountLimit != null) {
    return unique.slice(0, Math.min(rule.occurrenceCountLimit, MAX_OCC));
  }
  return unique.slice(0, MAX_OCC);
}

export function listClubEventRecurrenceDateKeys(rule: ClubEventRecurrenceRule): string[] {
  if (rule.intervalCount < 1) {
    throw new RangeError("Intervall muss mindestens 1 sein.");
  }

  let keys: string[];
  if (rule.frequency === "WEEKLY") {
    keys = listWeeklyDateKeys(rule);
  } else if (rule.monthlyPatternKind === "DAY_OF_MONTH") {
    keys = listMonthlyFixedDayDateKeys(rule);
  } else {
    keys = listMonthlyOrdinalWeekdayDateKeys(rule);
  }

  const deduped = [...new Set(keys)].sort(compareDateKeys);
  if (deduped.length > MAX_OCC) {
    throw new RangeError(`Zu viele Termine (max. ${MAX_OCC}). Bitte den Zeitraum verkürzen.`);
  }
  if (deduped.length === 0) {
    throw new RangeError("Es konnte kein Termin aus der Wiederholung abgeleitet werden.");
  }
  return deduped;
}

export function materializeClubEventOccurrence(
  dateKey: string,
  rule: Pick<
    ClubEventRecurrenceRule,
    "allDay" | "startsAtTime" | "endsAtTime" | "timezone" | "seriesStartDateKey"
  >,
): GeneratedClubEventOccurrence {
  if (rule.allDay) {
    const parsed = parseClubEventScheduleInput(
      {
        allDay: true,
        startDate: dateKey,
        endDate: dateKey,
        startTime: "00:00",
        endTime: "00:00",
      },
      rule.timezone,
    );
    return {
      dateKey,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      allDay: true,
    };
  }

  const startTime = rule.startsAtTime ?? "18:00";
  const endTime = rule.endsAtTime ?? startTime;
  const parsed = parseClubEventScheduleInput(
    {
      allDay: false,
      startDate: dateKey,
      endDate: dateKey,
      startTime,
      endTime,
    },
    rule.timezone,
  );

  return {
    dateKey,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    allDay: false,
  };
}

export function generateClubEventOccurrences(rule: ClubEventRecurrenceRule): GeneratedClubEventOccurrence[] {
  const dateKeys = listClubEventRecurrenceDateKeys(rule);
  return dateKeys.map((dateKey) => materializeClubEventOccurrence(dateKey, rule));
}

export { zonedTimeToUtc };
