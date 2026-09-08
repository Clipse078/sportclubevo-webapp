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
