import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

/** Dashboard preview cap for "Heute im Verein" (DASHBOARD-UX-01). */
export const DASHBOARD_TODAY_PREVIEW_LIMIT = 5;

/** @deprecated Use DASHBOARD_TODAY_PREVIEW_LIMIT */
export const HEUTE_IM_VEREIN_INITIAL_LIMIT = DASHBOARD_TODAY_PREVIEW_LIMIT;

export function buildCompactSchedulePrimaryLine(item: TodayScheduleItem): string {
  if (item.eventType === "MATCH" && item.matchPresentation) {
    const home = item.matchPresentation.home.displayName;
    const away = item.matchPresentation.away.displayName;
    return `${home} – ${away}`;
  }

  if (item.subtitle?.trim()) {
    return `${item.title} · ${item.subtitle.trim()}`;
  }

  return item.title;
}
