import type { ReactNode } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ReportSceIcon } from "@/components/icons/domain-sce-icon-components";
import { CalendarDays } from "lucide-react";
import {
  getPersonalCommandCenterData,
  type PersonalDashboardSecondaryActivity,
} from "@/lib/dashboard/personal-command-center";
import {
  PersonalAttention,
  PersonalTasksPreview,
  PersonalQuickAccess,
  PersonalDashboardWorkspace,
  PersonalDashboardSecondary,
} from "@/components/ui/dashboard";
import type { DashboardActivityItem } from "@/components/ui/dashboard";
import { formatSecondaryActivityPresentation } from "@/lib/dashboard/secondary-activity-presentation";
import { resolvePersonalQuickAccess } from "@/lib/dashboard/quick-access/resolve-quick-access";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { QUICK_ACCESS_MAX_PINS } from "@/lib/dashboard/quick-access/constants";
import { formatDate, formatTime } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { getTranslations } from "next-intl/server";
import {
  finishSceHotfixLogin01DashboardTrace,
  logSceHotfixLogin01Milestone,
  runWithSceHotfixLogin01Trace,
} from "@/lib/incident/sce-hotfix-login-01-trace";
import { SceHotfixLogin01DashboardClientMarks } from "@/components/admin/dashboard/SceHotfixLogin01DashboardClientMarks";

type StrategicActor = Pick<ActorContext, "tenantId" | "userId" | "permissionKeys">;

export type ClubDashboardCommandCenterAsyncProps = {
  tenantId: string;
  userId: string;
  actor: StrategicActor | null;
  fmtCfg: { locale: string; timezone?: string };
  permissionKeys: PermissionKey[];
  calendarMonthParam?: string | null;
};

export default async function ClubDashboardCommandCenterAsync({
  tenantId,
  userId,
  actor,
  fmtCfg,
  permissionKeys,
  calendarMonthParam = null,
}: ClubDashboardCommandCenterAsyncProps) {
  const tSecondary = await runWithSceHotfixLogin01Trace("command-center-i18n", () =>
    getTranslations("PersonalDashboard.secondary"),
  );

  const [personal, quickAccessBundle] = await Promise.all([
    runWithSceHotfixLogin01Trace("command-center-data", () =>
      getPersonalCommandCenterData({
        tenantId,
        actor,
        fmtCfg,
        userId,
        calendarMonthParam,
        permissionKeys,
      }),
    ),
    runWithSceHotfixLogin01Trace("quick-access", () =>
      resolvePersonalQuickAccess({
        tenantId,
        userId,
        permissionKeys,
        locale: fmtCfg.locale,
      }),
    ),
  ]);

  logSceHotfixLogin01Milestone("T5_FIRST_USEFUL");
  logSceHotfixLogin01Milestone("T10_INITIAL_CONTENT");

  const timeLabelById: Record<string, string> = {};
  for (const item of personal.programmeItems) {
    timeLabelById[item.id] = item.allDay ? "" : formatTime(item.startsAt, fmtCfg);
  }

  const activityTagMap: Record<
    PersonalDashboardSecondaryActivity["kind"],
    { tag: string; tagVariant: DashboardActivityItem["tagVariant"]; icon: ReactNode }
  > = {
    news: {
      tag: tSecondary("tagNews"),
      tagVariant: "info",
      icon: <ProductDomainSceIcon name="news" size={12} />,
    },
    registration: {
      tag: tSecondary("tagRegistration"),
      tagVariant: "warning",
      icon: <ProductDomainSceIcon name="people" size={12} />,
    },
    event: {
      tag: tSecondary("tagPlanning"),
      tagVariant: "success",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    meeting: {
      tag: tSecondary("tagMeeting"),
      tagVariant: "primary",
      icon: <ReportSceIcon className="h-3.5 w-3.5" />,
    },
  };

  const activityItems: DashboardActivityItem[] = personal.activitySources.map((entry) => {
    const meta = activityTagMap[entry.kind];
    const presentation = formatSecondaryActivityPresentation(entry, (key, values) =>
      tSecondary(key, values ?? {}),
    );
    return {
      key: entry.key,
      icon: meta.icon,
      title: presentation.title,
      subtitle: presentation.subtitle,
      timestamp: formatDate(entry.date, fmtCfg),
      tag: meta.tag,
      tagVariant: meta.tagVariant,
    };
  });

  const attentionSlot = personal.personalAttention.authorized ? (
    <PersonalAttention
      items={personal.personalAttention.items}
      totalCount={personal.personalAttention.totalCount}
      viewAllHref={personal.personalAttention.viewAllHref}
      operationalSourcesDegraded={personal.personalAttention.operationalSourcesDegraded}
    />
  ) : null;

  const tasksSlot = personal.personalTasksAvailable ? (
    <PersonalTasksPreview previewItems={personal.personalTaskPreview} embedded />
  ) : null;

  finishSceHotfixLogin01DashboardTrace();

  return (
    <>
      <SceHotfixLogin01DashboardClientMarks />
      <PersonalDashboardWorkspace
        groups={personal.programmeFeedGroups}
        programmeItems={personal.programmeItems}
        programmeSupported={personal.programmeSupported}
        timeLabelById={timeLabelById}
        monthParam={personal.calendarMonthParam}
        timeZone={fmtCfg.timezone ?? "Europe/Zurich"}
        navigation={personal.calendarNavigation}
        attentionSlot={attentionSlot}
        tasksSlot={tasksSlot}
      />

      <PersonalQuickAccess
        initialItems={quickAccessBundle.items}
        initialActiveKeys={quickAccessBundle.activeKeys}
        customizeCatalog={quickAccessBundle.catalog.map((entry) => ({
          key: entry.key,
          kind: entry.kind === "CREATE_ACTION" ? ("create" as const) : ("navigate" as const),
          label: getQuickAccessLabel(entry, fmtCfg.locale),
          href: entry.href,
        }))}
        maxPins={QUICK_ACCESS_MAX_PINS}
      />

      <PersonalDashboardSecondary
        newsItems={personal.newsItems}
        activityItems={activityItems}
      />
    </>
  );
}

/** @internal structural test hook */
export function clubDashboardCommandCenterUsesDeferredLoader(): true {
  return true;
}
