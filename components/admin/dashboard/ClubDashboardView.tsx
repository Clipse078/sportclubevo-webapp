import type { ReactNode } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import {
  CalendarDays,
  Newspaper,
  ScrollText,
  Users,
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
  PersonalAttention,
  PersonalTasksPreview,
  PersonalQuickAccess,
  PersonalDashboardWorkspace,
  PersonalDashboardSecondary,
  PersonalDashboardCockpitGreeting,
} from "@/components/ui/dashboard";
import { getUserDashboardHeroState } from "@/lib/dashboard/dashboard-hero-image";
import type { HeroImageTransform } from "@/lib/dashboard/dashboard-hero-position";
import type { DashboardActivityItem } from "@/components/ui/dashboard";
import { formatSecondaryActivityPresentation } from "@/lib/dashboard/secondary-activity-presentation";
import { resolvePersonalQuickAccess } from "@/lib/dashboard/quick-access/resolve-quick-access";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { QUICK_ACCESS_MAX_PINS } from "@/lib/dashboard/quick-access/constants";
import { formatDate, formatTodayDate, formatTime } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getTranslations } from "next-intl/server";

type ClubDashboardViewProps = {
  calendarMonthParam?: string | null;
};

export default async function ClubDashboardView({
  calendarMonthParam = null,
}: ClubDashboardViewProps) {
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

  const todayFormatted = formatTodayDate(fmtCfg);
  const greeting = getPersonalizedGreeting(firstName);
  const displayName = firstName?.trim() || undefined;

  const heroState =
    session?.user?.id ? await getUserDashboardHeroState(session.user.id) : null;

  const heroTransform: HeroImageTransform | undefined = heroState
    ? {
        zoom: heroState.zoom,
        positionX: heroState.positionX,
        positionY: heroState.positionY,
      }
    : undefined;

  const contextLine = [todayFormatted, ctx?.name].filter(Boolean).join(" · ");

  const timeLabelById: Record<string, string> = {};
  if (personal) {
    for (const item of personal.programmeItems) {
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

  const attentionSlot =
    personal?.personalAttention.authorized ? (
      <PersonalAttention
        items={personal.personalAttention.items}
        totalCount={personal.personalAttention.totalCount}
        viewAllHref={personal.personalAttention.viewAllHref}
      />
    ) : null;

  const tasksSlot = personal?.personalTasksAvailable ? (
    <PersonalTasksPreview previewItems={personal.personalTaskPreview} embedded />
  ) : null;

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-2.5 lg:gap-3"
      data-testid="personal-command-center"
    >
      <PersonalDashboardCockpitGreeting
        greeting={greeting}
        highlightName={displayName}
        contextLine={contextLine}
        initialBackgroundImageUrl={heroState?.imageUrl ?? null}
        initialBackgroundTransform={heroTransform}
      />

      {personal ? (
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
      ) : null}

      {quickAccessBundle ? (
        <PersonalQuickAccess
          initialItems={quickAccessItems}
          initialActiveKeys={quickAccessBundle.activeKeys}
          customizeCatalog={quickAccessCustomizeCatalog}
          maxPins={QUICK_ACCESS_MAX_PINS}
        />
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
