import type { TodayScheduleItem } from "@/lib/dashboard/command-center";
import type { DashboardTodayTimelineItem } from "@/components/ui/dashboard/DashboardTodayTimeline";

/**
 * Resolve planner navigation for a today-schedule item on the server.
 * Client dashboard components must receive only serializable href strings.
 */
export function resolveTodayItemHref(item: TodayScheduleItem): string | undefined {
  if (item.key.startsWith("event-")) {
    return `/dashboard/planner/edit/${item.key.slice("event-".length)}`;
  }
  return undefined;
}

export function withTodayItemHrefs(items: TodayScheduleItem[]): DashboardTodayTimelineItem[] {
  return items.map((item) => ({
    ...item,
    href: resolveTodayItemHref(item),
  }));
}
