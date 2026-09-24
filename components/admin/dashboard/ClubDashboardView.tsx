import type { ReactNode } from "react";
import {
  CalendarDays,
  Newspaper,
  ScrollText,
  Users,
  BellRing,
} from "lucide-react";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getPersonalizedGreeting, resolveDashboardFirstName } from "@/lib/dashboard/greeting";
import { getPersonFirstNameByUserId } from "@/lib/people/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getPersonalCommandCenterData,
  type PersonalDashboardSecondaryActivity,
} from "@/lib/dashboard/personal-command-center";
import {
  DashboardCompactWelcome,
  DashboardSection,
  PersonalAttention,
  PersonalTasksPreview,
  PersonalQuickAccess,
  PersonalDashboardWorkspace,
  PersonalDashboardSecondary,
} from "@/components/ui/dashboard";
import type { DashboardActivityItem } from "@/components/ui/dashboard";
import { resolvePersonalQuickAccess } from "@/lib/dashboard/quick-access/resolve-quick-access";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { QUICK_ACCESS_MAX_PINS } from "@/lib/dashboard/quick-access/constants";
import { getCurrentSwissFootballSeason } from "@/lib/seasons/season-logic";
import { formatDate, formatTodayDate, formatTime } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getTranslations } from "next-intl/server";

type ClubDashboardViewProps = {
  calendarMonthParam?: string | null;
};

export default async function ClubDashboardView({
  calendarMonthParam = null,
}: ClubDashboardViewProps) {
  const tPersonal = await getTranslations("PersonalDashboard");
  const tSecondary = await getTranslations("PersonalDashboard.secondary");
  const session = await auth();
  const ctx = await getActiveTenant();
  const tenantId = ctx?.id;

  const actor =
    session?.user && tenantId
      ? await getActorContext(session.user, tenantId)
      : null;

  const linkedPersonFirstName = session?.user?.id
    ? await getPersonFirstNameByUserId(session.user.id)
    : null;

  const firstName = resolveDashboardFirstName({
    linkedPersonFirstName,
    sessionFirstName: session?.user?.firstName,
    tenantName: ctx?.name,
  });

  const fmtCfg = {
    locale: ctx?.locale ?? "de-CH",
    timezone: ctx?.timezone ?? undefined,
  };

  const permissionKeys = (actor?.permissionKeys ??
    session?.user?.permissionKeys ??
    []) as PermissionKey[];

  const personal =
    tenantId
      ? await getPersonalCommandCenterData({
          tenantId,
          actor,
          fmtCfg,
          userId: session?.user?.id ?? null,
          calendarMonthParam,
          permissionKeys,
        })
      : null;

  const quickAccessBundle =
    tenantId && session?.user?.id
      ? await resolvePersonalQuickAccess({
          tenantId,
          userId: session.user.id,
          permissionKeys,
          locale: fmtCfg.locale,
        })
      : null;

  const quickAccessItems = quickAccessBundle ? quickAccessBundle.items : [];
  const quickAccessCustomizeCatalog = quickAccessBundle
    ? quickAccessBundle.catalog.map((entry) => ({
        key: entry.key,
        kind: entry.kind === "CREATE_ACTION" ? ("create" as const) : ("navigate" as const),
        label: getQuickAccessLabel(entry, fmtCfg.locale),
        href: entry.href,
      }))
    : [];

  const activeSeason = ctx ? getCurrentSwissFootballSeason()?.label : undefined;
  const todayFormatted = formatTodayDate(fmtCfg);
  const greeting = getPersonalizedGreeting(firstName);
  const displayName = firstName?.trim() || undefined;

  const contextChips = [ctx?.name, activeSeason ? `Saison ${activeSeason}` : null, todayFormatted].filter(
    Boolean,
  ) as string[];

  const timeLabelById: Record<string, string> = {};
  if (personal) {
    for (const item of personal.programmeFeedItems) {
      timeLabelById[item.id] = item.allDay ? "" : formatTime(item.startsAt, fmtCfg);
    }
  }

  const activityTagMap: Record<
    PersonalDashboardSecondaryActivity["kind"],
    { tag: string; tagVariant: DashboardActivityItem["tagVariant"]; icon: ReactNode }
  > = {
    news: {
      tag: tSecondary("tagNews"),
      tagVariant: "info",
      icon: <Newspaper className="h-3.5 w-3.5" />,
    },
    registration: {
      tag: tSecondary("tagRegistration"),
      tagVariant: "warning",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    event: {
      tag: tSecondary("tagPlanning"),
      tagVariant: "success",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    meeting: {
      tag: tSecondary("tagMeeting"),
      tagVariant: "primary",
      icon: <ScrollText className="h-3.5 w-3.5" />,
    },
  };

  const activityItems: DashboardActivityItem[] =
    personal?.activitySources.map((entry) => {
      const meta = activityTagMap[entry.kind];
      return {
        key: entry.key,
        icon: meta.icon,
        title: entry.title,
        subtitle: entry.subtitle,
        timestamp: formatDate(entry.date, fmtCfg),
        tag: meta.tag,
        tagVariant: meta.tagVariant,
      };
    }) ?? [];

  return (
    <div
      className="flex min-w-0 flex-col gap-3 lg:gap-3.5"
      data-testid="personal-command-center"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <DashboardCompactWelcome greeting={greeting} highlightName={displayName} />
          <p className="text-[0.8125rem] text-[var(--text-2)]">{tPersonal("welcome.subtitle")}</p>
        </div>
        {contextChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {contextChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--text-2)]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {quickAccessBundle ? (
        <PersonalQuickAccess
          initialItems={quickAccessItems}
          initialActiveKeys={quickAccessBundle.activeKeys}
          customizeCatalog={quickAccessCustomizeCatalog}
          maxPins={QUICK_ACCESS_MAX_PINS}
        />
      ) : null}

      {personal ? (
        <PersonalDashboardWorkspace
          groups={personal.programmeFeedGroups}
          programmeItems={personal.programmeItems}
          programmeSupported={personal.programmeSupported}
          timeLabelById={timeLabelById}
          monthParam={personal.calendarMonthParam}
          timeZone={fmtCfg.timezone ?? "Europe/Zurich"}
          navigation={personal.calendarNavigation}
        />
      ) : null}

      {personal?.personalAttention.authorized ? (
        <DashboardSection
          title={tPersonal("attention.sectionTitle")}
          icon={<BellRing className="h-4 w-4" />}
          iconAccent="warning"
          variant="flat"
          noPadding
          bodyClassName="pt-0"
        >
          <PersonalAttention
            items={personal.personalAttention.items}
            totalCount={personal.personalAttention.totalCount}
            viewAllHref={personal.personalAttention.viewAllHref}
          />
        </DashboardSection>
      ) : null}

      {personal?.personalTasksAvailable ? (
        <PersonalTasksPreview previewItems={personal.personalTaskPreview} />
      ) : null}

      {personal ? (
        <PersonalDashboardSecondary
          newsItems={personal.newsItems}
          activityItems={activityItems}
        />
      ) : null}
    </div>
  );
}
