import type { TaskContextType, TaskPriority, TaskStatus, TaskVisibilityScope } from "@prisma/client";
import { TaskVisibilityScope as TaskVisibilityScopeEnum } from "@prisma/client";
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
      return `Jeden ${day}`;
    }
    return `Alle ${input.intervalCount} Wochen · ${day}`;
  }
  if (input.frequency === "MONTHLY") {
    const day = input.monthDay ?? "—";
    if (input.intervalCount <= 1) {
      return `Jeden Monat · am ${day}.`;
    }
    return `Alle ${input.intervalCount} Monate · am ${day}.`;
  }
  return "Wiederkehrend";
}

export function formatSeriesDeadlineRule(dueHour: number, dueMinute: number): string {
  const hh = String(dueHour).padStart(2, "0");
  const mm = String(dueMinute).padStart(2, "0");
  return `Fällig am Serientermin um ${hh}:${mm}`;
}

export function formatSubtaskDueOffsetDays(offset: number): string {
  if (offset === 0) return "Am Serientermin";
  if (offset < 0) {
    const days = Math.abs(offset);
    return days === 1 ? "1 Tag vorher" : `${days} Tage vorher`;
  }
  return offset === 1 ? "1 Tag danach" : `${offset} Tage danach`;
}

export const TASK_SERIES_STATUS_LABELS = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  ENDED: "Beendet",
} as const;

export const TASK_SERIES_EDIT_FUTURE_NOTICE =
  "Änderungen gelten für neu erzeugte Aufgaben. Bereits erstellte Aufgaben bleiben unverändert.";

export function formatAssigneeName(
  firstName: string,
  lastName: string,
  displayName?: string | null,
): string {
  const canonical = displayName?.trim();
  if (canonical) return canonical;
  return `${firstName} ${lastName}`.trim();
}

export const TASK_VISIBILITY_SCOPE_LABELS: Record<TaskVisibilityScope, string> = {
  CLUB: "Im Verein",
  ORG_UNIT: "Organisationseinheiten",
  ASSIGNEES_ONLY: "Nur Beteiligte",
};

export const TASK_VISIBILITY_SCOPE_DESCRIPTIONS: Record<TaskVisibilityScope, string> = {
  CLUB: "Für berechtigte Personen im Verein sichtbar.",
  ORG_UNIT:
    "Nur für Beteiligte und berechtigte Personen der ausgewählten Organisationseinheiten sichtbar.",
  ASSIGNEES_ONLY:
    "Nur für Ersteller, Verantwortliche und ausdrücklich ausgewählte Personen sichtbar.",
};

export function formatTaskVisibilityLabel(scope: TaskVisibilityScope): string {
  return TASK_VISIBILITY_SCOPE_LABELS[scope];
}

export function formatTaskOrgUnitListLabel(input: {
  orgUnitId: string | null;
  orgUnitLabel: string | null;
  visibilityScope: TaskVisibilityScope;
}): string {
  if (input.visibilityScope === TaskVisibilityScopeEnum.ASSIGNEES_ONLY) {
    return TASK_VISIBILITY_SCOPE_LABELS.ASSIGNEES_ONLY;
  }
  if (input.orgUnitLabel) {
    return input.orgUnitLabel;
  }
  if (input.visibilityScope === TaskVisibilityScopeEnum.CLUB) {
    return "Verein";
  }
  return "—";
}
