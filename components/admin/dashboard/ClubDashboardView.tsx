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
  DashboardSection,
  PersonalAttention,
  PersonalTasksPreview,
  PersonalQuickAccess,
  PersonalDashboardWorkspace,
  PersonalDashboardSecondary,
  PersonalIdentityHeader,
} from "@/components/ui/dashboard";
import { getUserDashboardHeroState } from "@/lib/dashboard/dashboard-hero-image";
import type { DashboardActivityItem } from "@/components/ui/dashboard";
import { formatSecondaryActivityPresentation } from "@/lib/dashboard/secondary-activity-presentation";
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

  const heroState =
    session?.user?.id ? await getUserDashboardHeroState(session.user.id) : null;
  const identityBackgroundUrl = heroState?.imageUrl ?? null;
  const tenantCrestUrl = ctx?.logoUrl ?? null;

  const contextLine = [ctx?.name, activeSeason ? `Saison ${activeSeason}` : null, todayFormatted]
    .filter(Boolean)
    .join(" · ");

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
    }) ?? [];

  const showActionLayer =
    personal?.personalAttention.authorized || personal?.personalTasksAvailable;

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[1520px] flex-col gap-3 lg:gap-3.5"
      data-testid="personal-command-center"
    >
      <PersonalIdentityHeader
        greeting={greeting}
        highlightName={displayName}
        subtitle={tPersonal("welcome.subtitle")}
        contextLine={contextLine}
        backgroundImageUrl={identityBackgroundUrl}
        tenantCrestUrl={tenantCrestUrl}
      />

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

      {showActionLayer ? (
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start md:gap-4"
          data-testid="personal-action-layer"
        >
          {personal?.personalAttention.authorized ? (
            <DashboardSection
              title={tPersonal("attention.sectionTitle")}
              icon={<BellRing className="h-4 w-4" />}
              iconAccent="warning"
              variant="flat"
              density="compact"
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
        </div>
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
