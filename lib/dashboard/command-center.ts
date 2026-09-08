/**
 * lib/dashboard/command-center.ts — SCE-DASHBOARD-V2-01B
 *
 * Pure helpers for the premium command-center dashboard.
 * Extracted for focused unit tests (data integrity, no fake content).
 */

export type DashboardTaskCounts = {
  newsInReviewCount: number;
  openRegistrationCount: number;
  scheduledNewsCount: number;
};

export type DashboardTaskItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  accent: "warning" | "info" | "success";
};

/** Known fake fallback task titles that must never appear in production. */
export const FORBIDDEN_FALLBACK_TASK_TITLES = [
  "Homepage überprüfen",
  "Saisonplanung aktualisieren",
] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
};

/**
 * Maps stored Event.type values to presentation labels.
 * Does not infer sporting meaning beyond the stored type.
 */
export function formatEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? "Event";
}

/**
 * Builds actionable dashboard tasks from real counts only.
 * Returns an empty array when there is nothing to do — never fabricates filler.
 */
export function buildDashboardTasks(
  counts: DashboardTaskCounts,
): DashboardTaskItem[] {
  const tasks: DashboardTaskItem[] = [];

  if (counts.newsInReviewCount > 0) {
    tasks.push({
      key: "news-review",
      title: "Newsartikel prüfen",
      subtitle: `${counts.newsInReviewCount} warten auf Freigabe`,
      href: "/dashboard/website/news",
      accent: "warning",
    });
  }

  if (counts.openRegistrationCount > 0) {
    tasks.push({
      key: "registrations",
      title: "Anmeldungen prüfen",
      subtitle: `${counts.openRegistrationCount} offen`,
      href: "/dashboard/registrations",
      accent: "warning",
    });
  }

  if (counts.scheduledNewsCount > 0) {
    tasks.push({
      key: "scheduled-news",
      title: "Geplante Veröffentlichungen",
      subtitle: `${counts.scheduledNewsCount} vorbereitet`,
      href: "/dashboard/website/editorial",
      accent: "info",
    });
  }

  return tasks;
}

/**
 * Tenant-scoped where clause for Event queries.
 * Returns an empty object when tenantId is null (no broadening).
 */
export function tenantEventWhere(
  tenantId: string | null,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  if (!tenantId) return extra;
  return { tenantId, ...extra };
}

export type DashboardUpcomingItem = {
  key: string;
  day: string;
  month: string;
  title: string;
  location: string | null;
  time: string;
};

const FALLBACK_UPCOMING_MONTHS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

/** Normalizes tenant locale values that would crash bare Intl usage ("" / whitespace). */
export function resolveDashboardLocale(locale?: string | null): string {
  const trimmed = locale?.trim();
  return trimmed || "de-CH";
}

export function toDashboardDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Short month label for upcoming panels — null-safe and locale-hardened. */
export function formatUpcomingMonth(
  date: Date | string,
  locale?: string | null,
): string {
  const resolved = resolveDashboardLocale(locale);

  try {
    return new Intl.DateTimeFormat(resolved, { month: "short" }).format(
      toDashboardDate(date),
    );
  } catch {
    const monthIndex = toDashboardDate(date).getMonth();
    return FALLBACK_UPCOMING_MONTHS[monthIndex] ?? "";
  }
}

/** Builds serializable upcoming rows from real tenant events and meetings only. */
export function buildUpcomingDashboardItems(
  events: Array<{
    id: string;
    title: string;
    startAt: Date | string;
    location: string | null;
  }>,
  meetings: Array<{
    id: string;
    title: string;
    meetingDate: Date | string;
    location: string | null;
  }>,
  formatTimeFn: (date: Date | string) => string,
  locale?: string | null,
  limit = 4,
): DashboardUpcomingItem[] {
  return [
    ...events.map((ev) => ({
      sortAt: toDashboardDate(ev.startAt),
      item: {
        key: `ev-${ev.id}`,
        day: String(toDashboardDate(ev.startAt).getDate()),
        month: formatUpcomingMonth(ev.startAt, locale),
        title: ev.title,
        location: ev.location,
        time: formatTimeFn(ev.startAt),
      },
    })),
    ...meetings.map((meeting) => ({
      sortAt: toDashboardDate(meeting.meetingDate),
      item: {
        key: `mt-${meeting.id}`,
        day: String(toDashboardDate(meeting.meetingDate).getDate()),
        month: formatUpcomingMonth(meeting.meetingDate, locale),
        title: meeting.title,
        location: meeting.location,
        time: formatTimeFn(meeting.meetingDate),
      },
    })),
  ]
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .slice(0, limit)
    .map((entry) => entry.item);
}
