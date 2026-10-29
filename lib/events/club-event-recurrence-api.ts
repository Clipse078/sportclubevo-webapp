import type {
  ClubEventMonthOrdinal,
  ClubEventMonthlyPatternKind,
  ClubEventRecurrenceEndMode,
  ClubEventRecurrenceFrequency,
  Weekday,
} from "@prisma/client";
import { ClubEventValidationError } from "@/lib/events/club-events-service";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";
import { MAX_CLUB_EVENT_SERIES_OCCURRENCES } from "@/lib/events/club-event-recurrence-types";

const WEEKDAYS = new Set<Weekday>([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const FREQUENCIES = new Set<ClubEventRecurrenceFrequency>(["WEEKLY", "MONTHLY"]);
const MONTHLY_KINDS = new Set<ClubEventMonthlyPatternKind>(["DAY_OF_MONTH", "ORDINAL_WEEKDAY"]);
const END_MODES = new Set<ClubEventRecurrenceEndMode>(["ON_DATE", "AFTER_COUNT"]);
const ORDINALS = new Set<ClubEventMonthOrdinal>(["FIRST", "SECOND", "THIRD", "FOURTH", "LAST"]);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ClubEventRecurrenceApiInput = {
  enabled: boolean;
  frequency?: ClubEventRecurrenceFrequency;
  intervalCount?: number;
  weekday?: Weekday;
  monthlyPatternKind?: ClubEventMonthlyPatternKind;
  monthDay?: number;
  monthOrdinal?: ClubEventMonthOrdinal;
  endMode?: ClubEventRecurrenceEndMode;
  endDate?: string;
  occurrenceCount?: number;
};

export function parseClubEventRecurrenceFromApiBody(
  raw: unknown,
  input: {
    allDay: boolean;
    startDate: string;
    startTime: string | null;
    endTime: string | null;
    timezone: string;
  },
): { enabled: false } | { enabled: true; rule: ClubEventRecurrenceRule } {
  if (raw === undefined || raw === null || raw === false) {
    return { enabled: false };
  }

  const body = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!body) {
    throw new ClubEventValidationError("Ungültige Wiederholung.", "recurrence");
  }

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  if (!enabled) {
    return { enabled: false };
  }

  if (!DATE_KEY_RE.test(input.startDate)) {
    throw new ClubEventValidationError("Startdatum ist ungültig.", "startDate");
  }

  const frequency = String(body.frequency ?? "WEEKLY").trim().toUpperCase() as ClubEventRecurrenceFrequency;
  if (!FREQUENCIES.has(frequency)) {
    throw new ClubEventValidationError("Ungültige Wiederholungsfrequenz.", "recurrence.frequency");
  }

  const intervalCount = body.intervalCount === undefined ? 1 : Number(body.intervalCount);
  if (!Number.isFinite(intervalCount) || intervalCount < 1) {
    throw new ClubEventValidationError("Intervall muss mindestens 1 sein.", "recurrence.intervalCount");
  }

  const endMode = String(body.endMode ?? "ON_DATE").trim().toUpperCase() as ClubEventRecurrenceEndMode;
  if (!END_MODES.has(endMode)) {
    throw new ClubEventValidationError("Ungültiges Serien-Ende.", "recurrence.endMode");
  }

  let endDateKey: string | null = null;
  let occurrenceCountLimit: number | null = null;

  if (endMode === "ON_DATE") {
    const endDate = String(body.endDate ?? "").trim();
    if (!DATE_KEY_RE.test(endDate)) {
      throw new ClubEventValidationError("Enddatum der Serie ist erforderlich.", "recurrence.endDate");
    }
    if (endDate < input.startDate) {
      throw new ClubEventValidationError(
        "Serien-Enddatum darf nicht vor dem Start liegen.",
        "recurrence.endDate",
      );
    }
    endDateKey = endDate;
  } else {
    const count = body.occurrenceCount === undefined ? NaN : Number(body.occurrenceCount);
    if (!Number.isFinite(count) || count < 1 || count > MAX_CLUB_EVENT_SERIES_OCCURRENCES) {
      throw new ClubEventValidationError(
        `Anzahl Termine muss zwischen 1 und ${MAX_CLUB_EVENT_SERIES_OCCURRENCES} liegen.`,
        "recurrence.occurrenceCount",
      );
    }
    occurrenceCountLimit = count;
  }

  let weekday: Weekday | null = null;
  let monthlyPatternKind: ClubEventMonthlyPatternKind | null = null;
  let monthDay: number | null = null;
  let monthOrdinal: ClubEventMonthOrdinal | null = null;

  if (frequency === "WEEKLY") {
    const wd = String(body.weekday ?? "").trim().toUpperCase() as Weekday;
    if (!WEEKDAYS.has(wd)) {
      throw new ClubEventValidationError("Wochentag ist erforderlich.", "recurrence.weekday");
    }
    weekday = wd;
  } else {
    monthlyPatternKind = String(body.monthlyPatternKind ?? "ORDINAL_WEEKDAY")
      .trim()
      .toUpperCase() as ClubEventMonthlyPatternKind;
    if (!MONTHLY_KINDS.has(monthlyPatternKind)) {
      throw new ClubEventValidationError("Ungültiges Monatsmuster.", "recurrence.monthlyPatternKind");
    }
    if (monthlyPatternKind === "DAY_OF_MONTH") {
      const day = body.monthDay === undefined ? NaN : Number(body.monthDay);
      if (!Number.isFinite(day) || day < 1 || day > 31) {
        throw new ClubEventValidationError("Tag im Monat ist ungültig.", "recurrence.monthDay");
      }
      monthDay = day;
    } else {
      const wd = String(body.weekday ?? "").trim().toUpperCase() as Weekday;
      if (!WEEKDAYS.has(wd)) {
        throw new ClubEventValidationError("Wochentag ist erforderlich.", "recurrence.weekday");
      }
      weekday = wd;
      const ord = String(body.monthOrdinal ?? "FIRST").trim().toUpperCase() as ClubEventMonthOrdinal;
      if (!ORDINALS.has(ord)) {
        throw new ClubEventValidationError("Wochenordnung ist ungültig.", "recurrence.monthOrdinal");
      }
      monthOrdinal = ord;
    }
  }

  if (!input.allDay) {
    const startTime = input.startTime?.trim();
    if (!startTime) {
      throw new ClubEventValidationError("Beginn ist erforderlich.", "startTime");
    }
  }

  const rule: ClubEventRecurrenceRule = {
    frequency,
    intervalCount,
    weekday,
    monthlyPatternKind,
    monthDay,
    monthOrdinal,
    allDay: input.allDay,
    startsAtTime: input.allDay ? null : input.startTime,
    endsAtTime: input.allDay ? null : input.endTime,
    timezone: input.timezone,
    seriesStartDateKey: input.startDate,
    endMode,
    endDateKey,
    occurrenceCountLimit,
  };

  return { enabled: true, rule };
}

export type {
  ClubEventRecurrenceEditorValues,
} from "@/lib/events/club-event-recurrence-editor-payload";
export {
  clubEventRecurrenceEditorToApiPayload,
  recurrenceValuesToApiPayload,
} from "@/lib/events/club-event-recurrence-editor-payload";
