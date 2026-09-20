/**
 * AUFGABEN-05 — canonical task deadline reminder schedule (validation + calculation).
 */

import { TaskValidationError } from "./errors";
import {
  addDaysToLocalDateIso,
  formatLocalDateIso,
  localDateTimeToUtc,
} from "./recurrence-dates";

/** Same-day reminder fires at 09:00 tenant-local on the deadline calendar day (always before dueAt). */
export const TASK_REMINDER_SAME_DAY_LOCAL_HOUR = 9;
export const TASK_REMINDER_SAME_DAY_LOCAL_MINUTE = 0;

/** Legacy date-only dueAt convention from form parsing (`YYYY-MM-DDT12:00:00.000Z`). */
export function isLegacyDateOnlyDueAtIso(dueAtIso: string): boolean {
  return /T12:00:00\.000Z$/.test(dueAtIso);
}

export const TASK_REMINDER_PRESET_KEYS = [
  "SAME_DAY",
  "DAYS_1",
  "DAYS_2",
  "DAYS_3",
  "WEEK_1",
] as const;

export type TaskReminderPresetKey = (typeof TASK_REMINDER_PRESET_KEYS)[number];

export type TaskReminderScheduleInput = {
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  timeZone: string;
};

export type ResolvedTaskReminderSchedule = {
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
};

export function parseTaskReminderPresetKey(
  raw: unknown,
): TaskReminderPresetKey | null | "invalid" {
  if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim())) {
    return null;
  }
  if (typeof raw !== "string") return "invalid";
  const key = raw.trim();
  if (key === "NONE" || key === "KEINE") return null;
  if ((TASK_REMINDER_PRESET_KEYS as readonly string[]).includes(key)) {
    return key as TaskReminderPresetKey;
  }
  if (key === "CUSTOM") return null;
  return "invalid";
}

function localDaysBeforeForPreset(preset: TaskReminderPresetKey): number {
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

export function calculateReminderAtFromPreset(input: {
  dueAt: Date;
  presetKey: TaskReminderPresetKey;
  timeZone: string;
}): Date {
  const { dueAt, presetKey, timeZone } = input;
  const daysBefore = localDaysBeforeForPreset(presetKey);
  const { localDateIso, hour, minute } = getDueLocalParts(dueAt, timeZone);
  const reminderLocalDate = addDaysToLocalDateIso(localDateIso, -daysBefore);

  if (presetKey === "SAME_DAY") {
    return localDateTimeToUtc(
      reminderLocalDate,
      TASK_REMINDER_SAME_DAY_LOCAL_HOUR,
      TASK_REMINDER_SAME_DAY_LOCAL_MINUTE,
      timeZone,
    );
  }

  return localDateTimeToUtc(reminderLocalDate, hour, minute, timeZone);
}

function assertReminderBeforeDue(reminderAt: Date, dueAt: Date, label: string): void {
  if (reminderAt.getTime() >= dueAt.getTime()) {
    throw new TaskValidationError(`${label} must be before the deadline`);
  }
}

function assertReminderOrder(r1: Date, r2: Date): void {
  if (r1.getTime() >= r2.getTime()) {
    throw new TaskValidationError("Reminder 1 must be earlier than Reminder 2");
  }
}

export function taskHasExplicitReminders(schedule: {
  reminder1At: Date | null;
  reminder2At: Date | null;
}): boolean {
  return Boolean(schedule.reminder1At || schedule.reminder2At);
}

export function resolveTaskReminderSchedule(
  input: TaskReminderScheduleInput,
): ResolvedTaskReminderSchedule {
  const { dueAt, timeZone } = input;

  if (!dueAt) {
    if (input.reminder1At || input.reminder2At || input.reminder1PresetKey || input.reminder2PresetKey) {
      throw new TaskValidationError("Reminders require a deadline");
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
    if (!(TASK_REMINDER_PRESET_KEYS as readonly string[]).includes(reminder1PresetKey)) {
      throw new TaskValidationError("Invalid Reminder 1 preset");
    }
    reminder1At = calculateReminderAtFromPreset({
      dueAt,
      presetKey: reminder1PresetKey as TaskReminderPresetKey,
      timeZone,
    });
  } else if (input.reminder1At) {
    reminder1At = input.reminder1At;
    reminder1PresetKey = null;
    assertReminderBeforeDue(reminder1At, dueAt, "Reminder 1");
  } else {
    reminder1PresetKey = null;
  }

  if (reminder2PresetKey) {
    if (!(TASK_REMINDER_PRESET_KEYS as readonly string[]).includes(reminder2PresetKey)) {
      throw new TaskValidationError("Invalid Reminder 2 preset");
    }
    reminder2At = calculateReminderAtFromPreset({
      dueAt,
      presetKey: reminder2PresetKey as TaskReminderPresetKey,
      timeZone,
    });
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

/** Recompute preset-based reminder timestamps after a deadline change. */
export function recomputeRemindersForDueChange(input: {
  dueAt: Date | null;
  reminder1At: Date | null;
  reminder2At: Date | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  timeZone: string;
}): ResolvedTaskReminderSchedule {
  if (!input.dueAt) {
    return {
      dueAt: null,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
    };
  }

  return resolveTaskReminderSchedule({
    dueAt: input.dueAt,
    reminder1At: input.reminder1PresetKey ? null : input.reminder1At,
    reminder2At: input.reminder2PresetKey ? null : input.reminder2At,
    reminder1PresetKey: input.reminder1PresetKey,
    reminder2PresetKey: input.reminder2PresetKey,
    timeZone: input.timeZone,
  });
}

export function countConfiguredReminders(schedule: {
  reminder1At: string | null;
  reminder2At: string | null;
}): number {
  return (schedule.reminder1At ? 1 : 0) + (schedule.reminder2At ? 1 : 0);
}

export function formatLocalDateTimeLabel(
  at: Date,
  locale: string,
  timeZone: string,
  options?: { includeTime?: boolean },
): string {
  const includeTime = options?.includeTime ?? true;
  const date = at.toLocaleDateString(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!includeTime) return date;
  const time = at.toLocaleTimeString(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}, ${time}`;
}

export function formatTaskDeadlineLabel(
  dueAt: Date,
  locale: string,
  timeZone: string,
): string {
  const iso = dueAt.toISOString();
  const includeTime = !isLegacyDateOnlyDueAtIso(iso);
  return formatLocalDateTimeLabel(dueAt, locale, timeZone, { includeTime });
}

/** Parse tenant-local deadline from form date + optional time (HH:mm). */
export function parseTaskDueAtFromForm(input: {
  dateRaw: string | null | undefined;
  timeRaw?: string | null | undefined;
  timeZone: string;
}): Date | null | "invalid" {
  if (!input.dateRaw || !input.dateRaw.trim()) return null;
  const date = input.dateRaw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "invalid";

  const time = typeof input.timeRaw === "string" ? input.timeRaw.trim() : "";
  if (!time) {
    const legacy = new Date(`${date}T12:00:00.000Z`);
    return Number.isNaN(legacy.getTime()) ? "invalid" : legacy;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return "invalid";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "invalid";

  const utc = localDateTimeToUtc(date, hour, minute, input.timeZone);
  return Number.isNaN(utc.getTime()) ? "invalid" : utc;
}

export function parseCustomReminderAtFromForm(input: {
  dateRaw: string | null | undefined;
  timeRaw: string | null | undefined;
  timeZone: string;
}): Date | null | "invalid" {
  if (!input.dateRaw?.trim()) return null;
  return parseTaskDueAtFromForm({
    dateRaw: input.dateRaw,
    timeRaw: input.timeRaw ?? "09:00",
    timeZone: input.timeZone,
  });
}

export function formatDueTimeInputValue(dueAtIso: string | null, timeZone: string): string {
  if (!dueAtIso || isLegacyDateOnlyDueAtIso(dueAtIso)) return "";
  const due = new Date(dueAtIso);
  return due.toLocaleTimeString("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDueDateInputValue(dueAtIso: string | null, timeZone: string): string {
  if (!dueAtIso) return "";
  return formatLocalDateIso(new Date(dueAtIso), timeZone);
}
