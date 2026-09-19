import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { DASHBOARD_TODAY_PREVIEW_LIMIT } from "@/lib/dashboard/compact-schedule-presentation";
import { DashboardSection } from "./DashboardSection";
import { DashboardCompactScheduleList } from "./DashboardCompactScheduleList";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";

export type HeuteImVereinWidgetProps = {
  items: DashboardTodayTimelineItem[];
  dateLabel: string;
  viewAllHref: string;
  emptyState?: React.ReactNode;
};

export function HeuteImVereinWidget({
  items,
  dateLabel,
  viewAllHref,
  emptyState,
}: HeuteImVereinWidgetProps) {
  return (
    <DashboardSection
      title="Heute im Verein"
      description={dateLabel}
      icon={<CalendarDays className="h-4 w-4" />}
      iconAccent="info"
      variant="card"
      bodyClassName="px-4 py-1.5 sm:px-5 sm:py-2"
      actions={
        <Link href={viewAllHref} className="sce-link-primary text-[0.8125rem] font-medium">
          Tagesplan →
        </Link>
      }
    >
      <DashboardCompactScheduleList
        items={items}
        initialLimit={DASHBOARD_TODAY_PREVIEW_LIMIT}
        viewAllHref={viewAllHref}
        emptyState={
          emptyState ?? (
            <DashboardEmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Heute ist nichts geplant"
              description="Vereinstermine erscheinen hier in kompakter Form."
              variant="compact"
            />
          )
        }
      />
    </DashboardSection>
  );
}
