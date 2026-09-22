/**
 * AUFGABEN-06G7 — Requirement reminder configuration (reuses canonical task reminder schedule).
 */

import {
  parseTaskReminderPresetKey,
  resolveTaskReminderSchedule,
  type ResolvedTaskReminderSchedule,
  type TaskReminderScheduleInput,
} from "@/lib/tasks/task-reminder-schedule";

export {
  parseTaskReminderPresetKey,
  resolveTaskReminderSchedule,
  type ResolvedTaskReminderSchedule,
};

export type RequirementReminderScheduleInput = TaskReminderScheduleInput & {
  /** When false, legacy due-soon window applies if no explicit reminder times are set. */
  remindersConfigured: boolean;
};

export type ResolvedRequirementReminderSchedule = ResolvedTaskReminderSchedule & {
  remindersConfigured: boolean;
};

export function resolveRequirementReminderSchedule(
  input: RequirementReminderScheduleInput,
): ResolvedRequirementReminderSchedule {
  const resolved = resolveTaskReminderSchedule({
    dueAt: input.dueAt,
    reminder1At: input.reminder1At,
    reminder2At: input.reminder2At,
    reminder1PresetKey: input.reminder1PresetKey,
    reminder2PresetKey: input.reminder2PresetKey,
    timeZone: input.timeZone,
  });
  return {
    ...resolved,
    remindersConfigured: input.remindersConfigured,
  };
}

export function requirementHasExplicitReminderSchedule(
  schedule: Pick<
    ResolvedRequirementReminderSchedule,
    "reminder1At" | "reminder2At" | "remindersConfigured"
  >,
): boolean {
  if (!schedule.remindersConfigured) return false;
  return schedule.reminder1At !== null || schedule.reminder2At !== null;
}
