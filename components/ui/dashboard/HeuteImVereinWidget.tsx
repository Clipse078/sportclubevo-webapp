import Link from "next/link";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
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
      icon={<SceIcon name="events" size={20} />}
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
              icon={<SceIcon name="events" size={20} />}
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
