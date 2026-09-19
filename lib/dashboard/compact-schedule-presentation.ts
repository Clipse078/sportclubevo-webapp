import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

export const HEUTE_IM_VEREIN_INITIAL_LIMIT = 6;

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
