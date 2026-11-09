"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BellRing, CalendarDays } from "lucide-react";
import {
  limitProgrammeFeedGroupsToPreview,
  DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
  type ProgrammeFeedGroup,
} from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { buildMeinProgrammKalenderOpenHref } from "@/lib/personal-agenda/mein-programm-url";
import { PersonalProgrammeFeed } from "./PersonalProgrammeFeed";
import { DashboardCockpitGrid } from "./DashboardCockpitGrid";
import { DashboardCockpitCard } from "./DashboardCockpitCard";
import { cn } from "@/lib/cn";

export type PersonalDashboardWorkspaceProps = {
  groups: ProgrammeFeedGroup[];
  /** Retained for command-center loader parity; calendar widget removed in DS2-05B-R2. */
  programmeItems?: PersonalProgrammeItem[];
  programmeSupported: boolean;
  timeLabelById: Record<string, string>;
  monthParam?: string | null;
  timeZone?: string;
  navigation?: {
    previousMonthHref: string;
    nextMonthHref: string;
    todayHref: string;
  };
  attentionSlot?: ReactNode;
  tasksSlot?: ReactNode;
  className?: string;
};

/**
 * SCE-DS2-05B-R2 — personal dashboard cockpit: full-width programme, attention + tasks below.
 */
export function PersonalDashboardWorkspace({
  groups,
  programmeSupported,
  timeLabelById,
  monthParam = null,
  attentionSlot,
  tasksSlot,
  className,
}: PersonalDashboardWorkspaceProps) {
  const tProgramme = useTranslations("PersonalDashboard.programme");
  const tCalendar = useTranslations("PersonalDashboard.calendar");
  const tAttention = useTranslations("PersonalDashboard.attention");
  const tTasks = useTranslations("PersonalDashboard.tasks");

  const previewGroups = useMemo(
    () =>
      limitProgrammeFeedGroupsToPreview(
        groups,
        DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
      ),
    [groups],
  );

  const calendarOpenHref = useMemo(
    () => buildMeinProgrammKalenderOpenHref(monthParam),
    [monthParam],
  );

  return (
    <div className={cn("min-w-0", className)} data-testid="personal-dashboard-workspace">
      <DashboardCockpitGrid>
        <DashboardCockpitCard
          title={tProgramme("title")}
          titleId="personal-programme-heading"
          icon={<CalendarDays className="h-4 w-4" />}
          iconAccent="primary"
          orderClassName="order-1 md:col-span-2 md:row-start-1"
          headerAction={
            programmeSupported ? (
              <Link
                href={calendarOpenHref}
                className="sce-link-primary text-[0.8125rem] font-medium"
                data-testid="personal-programme-open-calendar"
              >
                {tCalendar("openCalendar")} →
              </Link>
            ) : null
          }
          bodyClassName="overflow-y-auto"
        >
          <PersonalProgrammeFeed
            groups={previewGroups}
            supported={programmeSupported}
            timeLabelById={timeLabelById}
            embedded
          />
        </DashboardCockpitCard>

        {attentionSlot ? (
          <DashboardCockpitCard
            title={tAttention("sectionTitle")}
            titleId="personal-attention-heading"
            icon={<BellRing className="h-4 w-4" />}
            iconAccent="warning"
            orderClassName="order-2 md:row-start-2"
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
            orderClassName="order-3 md:row-start-2"
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
