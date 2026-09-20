import { TaskStatus } from "@prisma/client";

export type DeadlinePresentationKind =
  | "NONE"
  | "OVERDUE"
  | "TODAY"
  | "TOMORROW"
  | "SOON"
  | "FUTURE";

export type DeadlinePresentation = {
  kind: DeadlinePresentationKind;
  label: string;
  /** For screen readers / non-color cues */
  emphasis: "calm" | "attention" | "urgent";
};

const ACTIVE_STATUSES = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] as const;

export function isActiveTaskStatus(status: TaskStatus): boolean {
  return (ACTIVE_STATUSES as readonly TaskStatus[]).includes(status);
}

export function startOfLocalDay(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

export function addDaysUtc(isoDayStart: Date, days: number): Date {
  const next = new Date(isoDayStart);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function formatDueDateLabel(dueAt: Date, locale: string, timeZone: string): string {
  return dueAt.toLocaleDateString(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function presentTaskDeadline(input: {
  dueAt: string | null;
  status: TaskStatus;
  now?: Date;
  locale?: string;
  timeZone?: string;
}): DeadlinePresentation {
  const { dueAt, status, now = new Date(), locale = "de-CH", timeZone = "Europe/Zurich" } = input;

  if (!dueAt || !isActiveTaskStatus(status)) {
    return { kind: "NONE", label: "", emphasis: "calm" };
  }

  const due = new Date(dueAt);
  const todayStart = startOfLocalDay(now, timeZone);
  const tomorrowStart = addDaysUtc(todayStart, 1);
  const dayAfterTomorrow = addDaysUtc(todayStart, 2);

  const label = formatDueDateLabel(due, locale, timeZone);

  if (due < todayStart) {
    return { kind: "OVERDUE", label, emphasis: "urgent" };
  }
  if (due < tomorrowStart) {
    return { kind: "TODAY", label: "Heute", emphasis: "attention" };
  }
  if (due < dayAfterTomorrow) {
    return { kind: "TOMORROW", label: "Morgen", emphasis: "attention" };
  }

  const soonLimit = addDaysUtc(todayStart, 7);
  if (due < soonLimit) {
    return { kind: "SOON", label, emphasis: "calm" };
  }

  return { kind: "FUTURE", label, emphasis: "calm" };
}

/** Management horizon for the «Demnächst» perspective (inclusive upper bound). */
export const TASK_UPCOMING_HORIZON_DAYS = 14;

export function getUpcomingHorizonEnd(now: Date, timeZone: string): Date {
  const start = startOfLocalDay(now, timeZone);
  return addDaysUtc(start, TASK_UPCOMING_HORIZON_DAYS + 1);
}

export function startOfWeekMonday(now: Date, timeZone: string): Date {
  const dayStart = startOfLocalDay(now, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  return addDaysUtc(dayStart, -offset);
}

export function endOfWeekSunday(now: Date, timeZone: string): Date {
  const weekStart = startOfWeekMonday(now, timeZone);
  return addDaysUtc(weekStart, 7);
}
