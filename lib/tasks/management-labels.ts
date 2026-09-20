import type { TaskContextType, TaskPriority, TaskStatus } from "@prisma/client";
import type { TaskSeriesWeekday, TaskRecurrenceFrequency } from "@prisma/client";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Niedrig",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

export const TASK_CONTEXT_LABELS: Record<TaskContextType, string> = {
  MATCH: "Spiel",
  TRAINING: "Training",
  TOURNAMENT: "Turnier",
  CLUB_EVENT: "Veranstaltung",
  MEETING: "Meeting",
  REGISTRATION: "Anmeldung",
  TEAM: "Team",
  PERSON: "Person",
  DOCUMENT: "Dokument",
};

const WEEKDAY_LABELS: Record<TaskSeriesWeekday, string> = {
  MONDAY: "Montag",
  TUESDAY: "Dienstag",
  WEDNESDAY: "Mittwoch",
  THURSDAY: "Donnerstag",
  FRIDAY: "Freitag",
  SATURDAY: "Samstag",
  SUNDAY: "Sonntag",
};

export function formatTaskSeriesRecurrenceLabel(input: {
  frequency: TaskRecurrenceFrequency;
  intervalCount: number;
  weekday: TaskSeriesWeekday | null;
  monthDay: number | null;
}): string {
  if (input.frequency === "WEEKLY") {
    const day = input.weekday ? WEEKDAY_LABELS[input.weekday] : "—";
    if (input.intervalCount <= 1) {
      return `Wöchentlich · ${day}`;
    }
    return `Alle ${input.intervalCount} Wochen · ${day}`;
  }
  if (input.frequency === "MONTHLY") {
    const day = input.monthDay ?? "—";
    if (input.intervalCount <= 1) {
      return `Monatlich · Tag ${day}`;
    }
    return `Alle ${input.intervalCount} Monate · Tag ${day}`;
  }
  return "Wiederkehrend";
}

export function formatAssigneeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
