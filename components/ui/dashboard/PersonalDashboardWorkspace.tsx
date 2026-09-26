"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BellRing, CalendarDays, ListChecks } from "lucide-react";
import PersonalProgrammeMonthCalendar from "@/components/ui/calendar/PersonalProgrammeMonthCalendar";
import {
  limitProgrammeFeedGroupsToPreview,
  DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
  type ProgrammeFeedGroup,
} from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { buildPersonalKalenderHref } from "@/lib/personal-agenda/kalender-url";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { PersonalProgrammeFeed } from "./PersonalProgrammeFeed";
import { DashboardCockpitGrid } from "./DashboardCockpitGrid";
import { DashboardCockpitCard } from "./DashboardCockpitCard";
import { cn } from "@/lib/cn";

export type PersonalDashboardWorkspaceProps = {
  groups: ProgrammeFeedGroup[];
  programmeItems: PersonalProgrammeItem[];
  programmeSupported: boolean;
  timeLabelById: Record<string, string>;
  monthParam: string;
  timeZone: string;
  navigation: {
    previousMonthHref: string;
    nextMonthHref: string;
    todayHref: string;
  };
  attentionSlot?: ReactNode;
  tasksSlot?: ReactNode;
  className?: string;
};

/**
 * Personal dashboard cockpit — balanced 2×2 grid (programme, calendar, attention, tasks).
 */
export function PersonalDashboardWorkspace({
  groups,
  programmeItems,
  programmeSupported,
  timeLabelById,
  monthParam,
  timeZone,
  navigation,
  attentionSlot,
  tasksSlot,
  className,
}: PersonalDashboardWorkspaceProps) {
  const tProgramme = useTranslations("PersonalDashboard.programme");
  const tCalendar = useTranslations("PersonalDashboard.calendar");
  const tAttention = useTranslations("PersonalDashboard.attention");
  const tTasks = useTranslations("PersonalDashboard.tasks");

  const todayKey = useMemo(
    () => matchDayKeyInTimezone(new Date(), timeZone),
    [timeZone],
  );
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const feedRef = useRef<HTMLDivElement>(null);

  const previewGroups = useMemo(
    () =>
      limitProgrammeFeedGroupsToPreview(
        groups,
        DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
      ),
    [groups],
  );

  const programmeViewAllHref = useMemo(
    () =>
      buildPersonalKalenderHref(
        "/dashboard/kalender",
        { month: monthParam, quelle: "termine" },
        { month: monthParam, quelle: "alle" },
      ),
    [monthParam],
  );

  const calendarOpenHref = useMemo(
    () => `/dashboard/kalender?monat=${encodeURIComponent(monthParam)}`,
    [monthParam],
  );

  const handleSelectedDayChange = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
  }, []);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-day-key="${selectedDayKey}"]`);
    target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [selectedDayKey]);

  return (
    <div className={cn("min-w-0", className)} data-testid="personal-dashboard-workspace">
    <DashboardCockpitGrid>
      <DashboardCockpitCard
        title={tProgramme("title")}
        titleId="personal-programme-heading"
        icon={<CalendarDays className="h-4 w-4" />}
        iconAccent="primary"
        orderClassName="order-1 md:row-start-1"
        headerAction={
          programmeSupported ? (
            <Link
              href={programmeViewAllHref}
              className="sce-link-primary text-[0.8125rem] font-medium"
              data-testid="personal-programme-view-all"
            >
              {tProgramme("viewAll")} →
            </Link>
          ) : null
        }
        bodyClassName="overflow-y-auto"
      >
        <div ref={feedRef} className="min-h-0">
          <PersonalProgrammeFeed
            groups={previewGroups}
            supported={programmeSupported}
            highlightedDayKey={selectedDayKey}
            timeLabelById={timeLabelById}
            embedded
          />
        </div>
      </DashboardCockpitCard>

      <DashboardCockpitCard
        title={tCalendar("title")}
        titleId="personal-calendar-heading"
        icon={<CalendarDays className="h-4 w-4" />}
        iconAccent="info"
        orderClassName="order-2 md:row-start-1"
        headerAction={
          <Link
            href={calendarOpenHref}
            className="sce-link-primary text-[0.8125rem] font-medium"
            data-testid="personal-calendar-open"
          >
            {tCalendar("openCalendar")} →
          </Link>
        }
        bodyClassName="overflow-y-auto"
      >
        <PersonalProgrammeMonthCalendar
          monthParam={monthParam}
          timeZone={timeZone}
          items={programmeItems}
          selectedDayKey={selectedDayKey}
          onSelectedDayChange={handleSelectedDayChange}
          navigation={navigation}
          todayDayKey={todayKey}
          headingLevel="h3"
          showSelectedDayPanel
          timeLabelById={timeLabelById}
          density="cockpit"
        />
      </DashboardCockpitCard>

      {attentionSlot ? (
        <DashboardCockpitCard
          title={tAttention("sectionTitle")}
          titleId="personal-attention-heading"
          icon={<BellRing className="h-4 w-4" />}
          iconAccent="warning"
          orderClassName="order-3 md:row-start-2"
          bodyClassName="overflow-y-auto"
        >
          {attentionSlot}
        </DashboardCockpitCard>
      ) : null}

      {tasksSlot ? (
        <DashboardCockpitCard
          title={tTasks("title")}
          titleId="personal-tasks-heading"
          icon={<ProductDomainSceIcon name="tasks" size={16} />}
          iconAccent="info"
          orderClassName="order-4 md:row-start-2"
          headerAction={
            <Link
              href="/dashboard/aufgaben?bereich=meine"
              className="sce-link-primary text-[0.8125rem] font-medium"
              data-testid="personal-tasks-view-all"
            >
              {tTasks("viewAll")} →
            </Link>
          }
          bodyClassName="overflow-y-auto"
        >
          {tasksSlot}
        </DashboardCockpitCard>
      ) : null}
    </DashboardCockpitGrid>
    </div>
  );
}
