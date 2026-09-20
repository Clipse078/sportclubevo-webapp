/**
 * Domain-neutral deadline reminder presets + validation (AUFGABEN-05).
 * Used by participation RSVP reminders; Task keeps task-specific normalization.
 */

import {
  addDaysToLocalDateIso,
  formatLocalDateIso,
  localDateTimeToUtc,
} from "@/lib/tasks/recurrence-dates";

export const DEADLINE_REMINDER_SAME_DAY_LOCAL_HOUR = 9;
export const DEADLINE_REMINDER_SAME_DAY_LOCAL_MINUTE = 0;

export const DEADLINE_REMINDER_PRESET_KEYS = [
  "SAME_DAY",
  "DAYS_1",
  "DAYS_2",
  "DAYS_3",
  "WEEK_1",
] as const;

export type DeadlineReminderPresetKey = (typeof DEADLINE_REMINDER_PRESET_KEYS)[number];

export class DeadlineReminderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeadlineReminderValidationError";
  }
}

export type DeadlineReminderScheduleInput = {
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  timeZone: string;
};

export type ResolvedDeadlineReminderSchedule = {
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
};

export function parseDeadlineReminderPresetKey(
  raw: unknown,
): DeadlineReminderPresetKey | null | "invalid" {
  if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim())) {
    return null;
  }
  if (typeof raw !== "string") return "invalid";
  const key = raw.trim();
  if (key === "NONE" || key === "KEINE") return null;
  if ((DEADLINE_REMINDER_PRESET_KEYS as readonly string[]).includes(key)) {
    return key as DeadlineReminderPresetKey;
  }
  if (key === "CUSTOM") return null;
  return "invalid";
}

function localDaysBeforeForPreset(preset: DeadlineReminderPresetKey): number {
  switch (preset) {
    case "SAME_DAY":
      return 0;
    case "DAYS_1":
      return 1;
    case "DAYS_2":
      return 2;
    case "DAYS_3":
      return 3;
    case "WEEK_1":
      return 7;
    default:
      return 0;
  }
}

function getDueLocalParts(dueAt: Date, timeZone: string): {
  localDateIso: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dueAt);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const localDateIso = `${year}-${month}-${day}`;
  return {
    localDateIso,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function calculateDeadlineReminderAtFromPreset(input: {
  dueAt: Date;
  presetKey: DeadlineReminderPresetKey;
  timeZone: string;
}): Date {
  const { dueAt, presetKey, timeZone } = input;
  const daysBefore = localDaysBeforeForPreset(presetKey);
  const { localDateIso, hour, minute } = getDueLocalParts(dueAt, timeZone);
  const reminderLocalDate = addDaysToLocalDateIso(localDateIso, -daysBefore);

  if (presetKey === "SAME_DAY") {
    return localDateTimeToUtc(
      reminderLocalDate,
      DEADLINE_REMINDER_SAME_DAY_LOCAL_HOUR,
      DEADLINE_REMINDER_SAME_DAY_LOCAL_MINUTE,
      timeZone,
    );
  }

  return localDateTimeToUtc(reminderLocalDate, hour, minute, timeZone);
}

function assertReminderBeforeDue(reminderAt: Date, dueAt: Date, label: string): void {
  if (reminderAt.getTime() >= dueAt.getTime()) {
    throw new DeadlineReminderValidationError(`${label} must be before the deadline`);
  }
}

function assertReminderOrder(r1: Date, r2: Date): void {
  if (r1.getTime() >= r2.getTime()) {
    throw new DeadlineReminderValidationError("Reminder 1 must be earlier than Reminder 2");
  }
}

type ReminderValidationErrorCtor = new (message: string) => Error;

export function resolveDeadlineReminderSchedule(
  input: DeadlineReminderScheduleInput,
  errorClass: ReminderValidationErrorCtor = DeadlineReminderValidationError,
): ResolvedDeadlineReminderSchedule {
  const wrap = (message: string) => {
    throw new errorClass(message);
  };

  const { dueAt, timeZone } = input;

  if (!dueAt) {
    if (
      input.reminder1At ||
      input.reminder2At ||
      input.reminder1PresetKey ||
      input.reminder2PresetKey
    ) {
      wrap("Reminders require a deadline");
    }
    return {
      dueAt: null,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
    };
  }

  let reminder1At: Date | null = null;
  let reminder2At: Date | null = null;
  let reminder1PresetKey = input.reminder1PresetKey;
  let reminder2PresetKey = input.reminder2PresetKey;

  if (reminder1PresetKey) {
    if (!(DEADLINE_REMINDER_PRESET_KEYS as readonly string[]).includes(reminder1PresetKey)) {
      wrap("Invalid Reminder 1 preset");
    }
    reminder1At = calculateDeadlineReminderAtFromPreset({
      dueAt,
      presetKey: reminder1PresetKey as DeadlineReminderPresetKey,
      timeZone,
    });
    assertReminderBeforeDue(reminder1At, dueAt, "Reminder 1");
  } else if (input.reminder1At) {
    reminder1At = input.reminder1At;
    reminder1PresetKey = null;
    assertReminderBeforeDue(reminder1At, dueAt, "Reminder 1");
  } else {
    reminder1PresetKey = null;
  }

  if (reminder2PresetKey) {
    if (!(DEADLINE_REMINDER_PRESET_KEYS as readonly string[]).includes(reminder2PresetKey)) {
      wrap("Invalid Reminder 2 preset");
    }
    reminder2At = calculateDeadlineReminderAtFromPreset({
      dueAt,
      presetKey: reminder2PresetKey as DeadlineReminderPresetKey,
      timeZone,
    });
    assertReminderBeforeDue(reminder2At, dueAt, "Reminder 2");
  } else if (input.reminder2At) {
    reminder2At = input.reminder2At;
    reminder2PresetKey = null;
    assertReminderBeforeDue(reminder2At, dueAt, "Reminder 2");
  } else {
    reminder2PresetKey = null;
  }

  if (reminder1At && reminder2At) {
    assertReminderOrder(reminder1At, reminder2At);
  }

  return {
    dueAt,
    reminder1At,
    reminder2At,
    reminder1PresetKey,
    reminder2PresetKey,
  };
}

export function recomputeDeadlineRemindersForDueChange(
  input: DeadlineReminderScheduleInput,
  errorClass: ReminderValidationErrorCtor = DeadlineReminderValidationError,
): ResolvedDeadlineReminderSchedule {
  if (!input.dueAt) {
    return {
      dueAt: null,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
    };
  }

  return resolveDeadlineReminderSchedule(
    {
      dueAt: input.dueAt,
      reminder1At: input.reminder1PresetKey ? null : input.reminder1At,
      reminder2At: input.reminder2PresetKey ? null : input.reminder2At,
      reminder1PresetKey: input.reminder1PresetKey,
      reminder2PresetKey: input.reminder2PresetKey,
      timeZone: input.timeZone,
    },
    errorClass,
  );
}

export function parseExplicitDueAtFromForm(input: {
  dateRaw: string | null | undefined;
  timeRaw: string | null | undefined;
  timeZone: string;
}): Date | null | "invalid" {
  if (!input.dateRaw || !input.dateRaw.trim()) return null;
  const date = input.dateRaw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "invalid";

  const time = typeof input.timeRaw === "string" ? input.timeRaw.trim() : "";
  if (!time) return "invalid";

  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return "invalid";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "invalid";

  const utc = localDateTimeToUtc(date, hour, minute, input.timeZone);
  return Number.isNaN(utc.getTime()) ? "invalid" : utc;
}

export function formatLocalDateTimeLabel(
  at: Date,
  locale: string,
  timeZone: string,
): string {
  const date = at.toLocaleDateString(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = at.toLocaleTimeString(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}, ${time}`;
}

export function formatDueDateInputValue(dueAtIso: string | null, timeZone: string): string {
  if (!dueAtIso) return "";
  return formatLocalDateIso(new Date(dueAtIso), timeZone);
}

export function formatDueTimeInputValue(dueAtIso: string | null, timeZone: string): string {
  if (!dueAtIso) return "";
  const due = new Date(dueAtIso);
  return due.toLocaleTimeString("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
