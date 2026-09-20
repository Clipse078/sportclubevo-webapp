/**
 * AUFGABEN-05-NOTIFY-DEADLINE — RSVP deadline + reminder schedule for participation requests.
 */

import {
  formatLocalDateIso,
  localDateTimeToUtc,
  addDaysToLocalDateIso,
} from "@/lib/tasks/recurrence-dates";
import { ParticipationValidationError } from "./errors";
import {
  DeadlineReminderValidationError,
  parseDeadlineReminderPresetKey,
  parseExplicitDueAtFromForm,
  recomputeDeadlineRemindersForDueChange,
  resolveDeadlineReminderSchedule,
  type ResolvedDeadlineReminderSchedule,
} from "@/lib/reminders/deadline-reminder-schedule";

function mapReminderValidationError(error: unknown): never {
  if (error instanceof DeadlineReminderValidationError) {
    throw new ParticipationValidationError(error.message);
  }
  throw error;
}

export type ParticipationResponseDeadlineSchedule = ResolvedDeadlineReminderSchedule;

export type ParticipationResponseDeadlineInput = {
  participationResponseDueAt?: Date | null;
  participationReminder1At?: Date | null;
  participationReminder2At?: Date | null;
  participationReminder1PresetKey?: string | null;
  participationReminder2PresetKey?: string | null;
  timeZone: string;
  eventStartAt: Date;
};

export function assertParticipationResponseDueBeforeEventStart(
  participationResponseDueAt: Date | null,
  eventStartAt: Date,
): void {
  if (!participationResponseDueAt) return;
  if (participationResponseDueAt.getTime() >= eventStartAt.getTime()) {
    throw new ParticipationValidationError(
      "Die Antwortfrist muss vor dem Event- bzw. Trainingsbeginn liegen.",
    );
  }
}

export function resolveParticipationResponseDeadlineSchedule(
  input: ParticipationResponseDeadlineInput,
): ParticipationResponseDeadlineSchedule {
  const dueAt = input.participationResponseDueAt ?? null;

  let schedule: ResolvedDeadlineReminderSchedule;
  try {
    schedule = resolveDeadlineReminderSchedule(
      {
        dueAt,
        reminder1At: input.participationReminder1At ?? null,
        reminder2At: input.participationReminder2At ?? null,
        reminder1PresetKey: input.participationReminder1PresetKey ?? null,
        reminder2PresetKey: input.participationReminder2PresetKey ?? null,
        timeZone: input.timeZone,
      },
      ParticipationValidationError,
    );
  } catch (error) {
    mapReminderValidationError(error);
  }

  assertParticipationResponseDueBeforeEventStart(schedule.dueAt, input.eventStartAt);
  return schedule;
}

export function recomputeParticipationRemindersAfterDueChange(
  input: ParticipationResponseDeadlineInput,
): ParticipationResponseDeadlineSchedule {
  const dueAt = input.participationResponseDueAt ?? null;
  let schedule: ResolvedDeadlineReminderSchedule;
  try {
    schedule = recomputeDeadlineRemindersForDueChange(
      {
        dueAt,
        reminder1At: input.participationReminder1At ?? null,
        reminder2At: input.participationReminder2At ?? null,
        reminder1PresetKey: input.participationReminder1PresetKey ?? null,
        reminder2PresetKey: input.participationReminder2PresetKey ?? null,
        timeZone: input.timeZone,
      },
      ParticipationValidationError,
    );
  } catch (error) {
    mapReminderValidationError(error);
  }
  assertParticipationResponseDueBeforeEventStart(schedule.dueAt, input.eventStartAt);
  return schedule;
}

export function parseParticipationResponseDueFromForm(input: {
  dateRaw: string | null | undefined;
  timeRaw: string | null | undefined;
  timeZone: string;
}): Date | null | "invalid" {
  if (!input.dateRaw?.trim()) return null;
  return parseExplicitDueAtFromForm(input);
}

export function parseParticipationReminderPresetFromForm(raw: unknown): string | null | "invalid" {
  return parseDeadlineReminderPresetKey(raw);
}

export function parseParticipationCustomReminderFromForm(input: {
  dateRaw: string | null | undefined;
  timeRaw: string | null | undefined;
  timeZone: string;
}): Date | null | "invalid" {
  if (!input.dateRaw?.trim()) return null;
  return parseExplicitDueAtFromForm({
    dateRaw: input.dateRaw,
    timeRaw: input.timeRaw ?? "09:00",
    timeZone: input.timeZone,
  });
}

/** Series default: N calendar days before session local date at fixed local time. */
export function computeParticipationResponseDueFromSeriesPolicy(input: {
  sessionStartAt: Date;
  timeZone: string;
  daysBefore: number;
  localTime: string;
}): Date {
  const localDateIso = formatLocalDateIso(input.sessionStartAt, input.timeZone);
  const dueLocalDate = addDaysToLocalDateIso(localDateIso, -input.daysBefore);
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.localTime.trim());
  if (!match) {
    throw new ParticipationValidationError("Ungültige Antwortfrist-Uhrzeit in der Trainingsserie.");
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return localDateTimeToUtc(dueLocalDate, hour, minute, input.timeZone);
}

export function buildParticipationScheduleSnapshotFromSeries(input: {
  sessionStartAt: Date;
  timeZone: string;
  participationResponseDueDaysBefore: number | null;
  participationResponseDueLocalTime: string | null;
  participationReminder1PresetKey: string | null;
  participationReminder2PresetKey: string | null;
}): ParticipationResponseDeadlineSchedule {
  if (
    input.participationResponseDueDaysBefore == null ||
    !input.participationResponseDueLocalTime?.trim()
  ) {
    return {
      dueAt: null,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
    };
  }

  if (input.participationResponseDueDaysBefore < 0) {
    throw new ParticipationValidationError("Antwortfrist-Offset der Serie ist ungültig.");
  }

  const dueAt = computeParticipationResponseDueFromSeriesPolicy({
    sessionStartAt: input.sessionStartAt,
    timeZone: input.timeZone,
    daysBefore: input.participationResponseDueDaysBefore,
    localTime: input.participationResponseDueLocalTime,
  });

  try {
    return resolveParticipationResponseDeadlineSchedule({
      participationResponseDueAt: dueAt,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: input.participationReminder1PresetKey,
      participationReminder2PresetKey: input.participationReminder2PresetKey,
      timeZone: input.timeZone,
      eventStartAt: input.sessionStartAt,
    });
  } catch (error) {
    mapReminderValidationError(error);
  }
}
