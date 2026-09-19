import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { HEUTE_IM_VEREIN_INITIAL_LIMIT } from "@/lib/dashboard/compact-schedule-presentation";
import { DashboardSection } from "./DashboardSection";
import { DashboardCompactScheduleList } from "./DashboardCompactScheduleList";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";

export type HeuteImVereinWidgetProps = {
  items: DashboardTodayTimelineItem[];
  dateLabel: string;
  emptyState?: React.ReactNode;
};

export function HeuteImVereinWidget({
  items,
  dateLabel,
  emptyState,
}: HeuteImVereinWidgetProps) {
  return (
    <div className="order-2 min-w-0 md:order-1">
    <DashboardSection
      title="Heute im Verein"
      description={dateLabel}
      icon={<CalendarDays className="h-4 w-4" />}
      iconAccent="info"
      variant="card"
      bodyClassName="px-4 py-2 sm:px-5 sm:py-2.5"
      actions={
        <Link href="/dashboard/planner" className="sce-link-primary text-[0.8125rem] font-medium">
          Alle Termine →
        </Link>
      }
    >
      <DashboardCompactScheduleList
        items={items}
        initialLimit={HEUTE_IM_VEREIN_INITIAL_LIMIT}
        emptyState={
          emptyState ?? (
            <DashboardEmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Heute ist nichts geplant"
              description="Vereinstermine erscheinen hier in kompakter Form."
            />
          )
        }
      />
    </DashboardSection>
    </div>
  );
}
