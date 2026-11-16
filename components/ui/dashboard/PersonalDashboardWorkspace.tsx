"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  limitProgrammeFeedGroupsToPreview,
  DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
  type ProgrammeFeedGroup,
} from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { buildMeinProgrammKalenderOpenHref } from "@/lib/personal-agenda/mein-programm-url";
import { PersonalProgrammeFeed } from "./PersonalProgrammeFeed";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
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
  attentionViewAllHref?: string | null;
  tasksSlot?: ReactNode;
  className?: string;
};

/**
 * Personal dashboard — ClubDevelopmentOverview-aligned section layout (SCE Übersicht reference).
 * SCE-DS2-05B-R2 — embedded programme preview; month grid lives on Mein Kalender.
 */
export function PersonalDashboardWorkspace({
  groups,
  programmeSupported,
  timeLabelById,
  monthParam = null,
  attentionSlot,
  attentionViewAllHref = null,
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

  const programmeLinkLabel = programmeSupported ? tCalendar("openCalendar") : undefined;

  return (
    <div
      className={cn("min-w-0 space-y-6", className)}
      data-testid="personal-dashboard-workspace"
      data-sce-dashboard-layout="cd-reference"
    >
      {attentionSlot ? (
        <SceWorkspaceSectionShell
          title={tAttention("sectionTitle")}
          href={attentionViewAllHref ?? undefined}
          linkLabel={attentionViewAllHref ? tAttention("openInbox") : undefined}
          testId="personal-dashboard-attention-section"
        >
          {attentionSlot}
        </SceWorkspaceSectionShell>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SceWorkspaceSectionShell
          title={tProgramme("todayNextTitle")}
          href={programmeSupported ? calendarOpenHref : undefined}
          linkLabel={programmeLinkLabel}
          linkTestId="personal-programme-open-calendar"
          testId="personal-dashboard-programme-section"
        >
          <PersonalProgrammeFeed
            groups={previewGroups}
            supported={programmeSupported}
            timeLabelById={timeLabelById}
            embedded
          />
        </SceWorkspaceSectionShell>

        {tasksSlot ? (
          <SceWorkspaceSectionShell
            title={tTasks("title")}
            href="/dashboard/aufgaben?bereich=meine"
            linkLabel={tTasks("viewAll")}
            testId="personal-dashboard-tasks-section"
          >
            {tasksSlot}
          </SceWorkspaceSectionShell>
        ) : null}
      </div>
    </div>
  );
}