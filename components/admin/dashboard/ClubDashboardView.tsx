import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Globe,
  Newspaper,
  ScrollText,
  Trophy,
  Users,
  BellRing,
  Zap,
  Volleyball,
} from "lucide-react";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getPersonalizedGreeting, resolveDashboardFirstName } from "@/lib/dashboard/greeting";
import { getPersonFirstNameByUserId } from "@/lib/people/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getCommandCenterData } from "@/lib/dashboard/command-center";
import { DEFAULT_HERO_TRANSFORM } from "@/lib/dashboard/dashboard-hero-position";
import { withTodayItemHrefs } from "@/lib/dashboard/today-schedule-href";
import { getDashboardQuickActionDefs } from "@/lib/dashboard/quick-actions";
import { formatIsoDay } from "@/lib/planner/date-utils";
import {
  DashboardHeroSection,
  DashboardMetricStrip,
  DashboardActivityFeed,
  DashboardActivityItem,
  DashboardSection,
  DashboardEmptyState,
  DashboardNewsSection,
  MeineAgendaWidget,
  PersonalAttention,
  PersonalTasksPreview,
  HeuteImVereinWidget,
  DashboardOperationalGrid,
  DashboardQuickActionStrip,
  PersonalQuickAccess,
} from "@/components/ui/dashboard";
import { resolvePersonalQuickAccess } from "@/lib/dashboard/quick-access/resolve-quick-access";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { QUICK_ACCESS_MAX_PINS } from "@/lib/dashboard/quick-access/constants";
import type { DashboardMetricAccent } from "@/components/ui/dashboard";
import { getCurrentSwissFootballSeason } from "@/lib/seasons/season-logic";
import { formatTodayDate } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getTranslations } from "next-intl/server";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `Vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
}

const KPI_ACCENT: Record<string, DashboardMetricAccent> = {
  "my-tasks": "default",
  "my-schedule": "primary",
  attention: "warning",
  registrations: "info",
};

const COCKPIT_QUICK_ACTION_KEYS = [
  "training",
  "match",
  "tournament",
  "veranstaltung",
] as const;

const COCKPIT_QUICK_ACTION_ICONS: Record<
  (typeof COCKPIT_QUICK_ACTION_KEYS)[number],
  ReactNode
> = {
  training: <CalendarDays className="h-3.5 w-3.5" />,
  match: <Volleyball className="h-3.5 w-3.5" />,
  tournament: <Trophy className="h-3.5 w-3.5" />,
  veranstaltung: <CalendarDays className="h-3.5 w-3.5" />,
};

const COCKPIT_QUICK_ACTION_LABELS: Record<
  (typeof COCKPIT_QUICK_ACTION_KEYS)[number],
  string
> = {
  training: "Training",
  match: "Spiel",
  tournament: "Turnier",
  veranstaltung: "Veranstaltung",
};

export default async function ClubDashboardView() {
  const tPersonal = await getTranslations("PersonalDashboard");
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

  const commandCenter = tenantId
    ? await getCommandCenterData({
        tenantId,
        actor,
        fmtCfg,
        userId: session?.user?.id ?? null,
      })
    : {
        kpis: [],
        kpiStrip: [],
        todayItems: [],
        attentionItems: [],
        personalAttention: {
          authorized: false,
          items: [],
          totalCount: 0,
          viewAllHref: null,
        },
        upcomingItems: [],
        activitySources: [],
        newsItems: [],
        personalAgendaItems: [],
        personalAgendaSupported: false,
        personalTasksAvailable: false,
        personalTaskCount: null,
        personalTaskPreview: [],
        heroBackgroundImageUrl: null,
        heroBackgroundTransform: DEFAULT_HERO_TRANSFORM,
      };

  const permissionKeys = (actor?.permissionKeys ??
    session?.user?.permissionKeys ??
    []) as PermissionKey[];

  const quickAccessBundle =
    tenantId && session?.user?.id
      ? await resolvePersonalQuickAccess({
          tenantId,
          userId: session.user.id,
          permissionKeys,
          locale: fmtCfg.locale,
        })
      : null;

  const quickAccessItems = quickAccessBundle
    ? quickAccessBundle.items
    : [];
  const quickAccessCustomizeCatalog = quickAccessBundle
    ? quickAccessBundle.catalog.map((entry) => ({
        key: entry.key,
        kind: entry.kind === "CREATE_ACTION" ? ("create" as const) : ("navigate" as const),
        label: getQuickAccessLabel(entry, fmtCfg.locale),
        href: entry.href,
      }))
    : [];

  const quickActionDefs = getDashboardQuickActionDefs(permissionKeys);
  const cockpitQuickActions = quickActionDefs
    .filter((action): action is typeof action & { key: (typeof COCKPIT_QUICK_ACTION_KEYS)[number] } =>
      (COCKPIT_QUICK_ACTION_KEYS as readonly string[]).includes(action.key),
    )
    .map((action) => ({
      href: action.href,
      label: COCKPIT_QUICK_ACTION_LABELS[action.key],
      icon: COCKPIT_QUICK_ACTION_ICONS[action.key],
    }));

  const activeSeason = ctx ? getCurrentSwissFootballSeason()?.label : undefined;
  const todayFormatted = formatTodayDate(fmtCfg);
  const todayIsoDay = formatIsoDay(new Date());
  const todayPlannerHref = `/dashboard/planner/day?day=${todayIsoDay}`;
  const greeting = getPersonalizedGreeting(firstName);
  const displayName = firstName?.trim() || "zusammen";
  const heroSubtitle = "Schön, dass du wieder da bist.";

  const activityTagMap: Record<
    (typeof commandCenter.activitySources)[number]["kind"],
    { tag: string; tagVariant: DashboardActivityItem["tagVariant"]; icon: ReactNode }
  > = {
    news: { tag: "News", tagVariant: "info", icon: <Newspaper className="h-3.5 w-3.5" /> },
    registration: {
      tag: "Anmeldung",
      tagVariant: "warning",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    event: {
      tag: "Planung",
      tagVariant: "success",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    meeting: {
      tag: "Meeting",
      tagVariant: "primary",
      icon: <ScrollText className="h-3.5 w-3.5" />,
    },
  };

  const activityItems: DashboardActivityItem[] = commandCenter.activitySources
    .slice(0, 4)
    .map((entry) => {
      const meta = activityTagMap[entry.kind];
      return {
        key: entry.key,
        icon: meta.icon,
        title: entry.title,
        subtitle: entry.subtitle,
        timestamp: timeAgo(entry.date),
        tag: meta.tag,
        tagVariant: meta.tagVariant,
      };
    });

  const kpiMetrics = commandCenter.kpiStrip.map((kpi) => ({
    key: kpi.key,
    label: kpi.label,
    value: kpi.value,
    description: kpi.context,
    accent: KPI_ACCENT[kpi.key] ?? "default",
  }));

  const todayWithHrefs = withTodayItemHrefs(commandCenter.todayItems);

  return (
    <div className="flex min-w-0 flex-col gap-3.5 lg:gap-4">
      <DashboardHeroSection
        initialBackgroundImageUrl={commandCenter.heroBackgroundImageUrl}
        initialBackgroundTransform={commandCenter.heroBackgroundTransform}
        greeting={greeting}
        highlightName={displayName}
        subtitle={heroSubtitle}
        clubName={ctx?.name ?? undefined}
        activeSeason={activeSeason}
        date={todayFormatted}
      />

      {kpiMetrics.length > 0 && (
        <DashboardMetricStrip
          metrics={kpiMetrics}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5"
        />
      )}

      {/* DASHBOARD-06: final placement directly under compact welcome */}
      {quickAccessItems.length > 0 ? (
        <PersonalQuickAccess
          initialItems={quickAccessItems}
          initialActiveKeys={quickAccessBundle?.activeKeys ?? []}
          customizeCatalog={quickAccessCustomizeCatalog}
          maxPins={QUICK_ACCESS_MAX_PINS}
        />
      ) : null}

      <DashboardOperationalGrid
        personalRow={
          <>
            <MeineAgendaWidget
              items={commandCenter.personalAgendaItems}
              supported={commandCenter.personalAgendaSupported}
            />
            {commandCenter.personalTasksAvailable ? (
              <PersonalTasksPreview previewItems={commandCenter.personalTaskPreview} />
            ) : null}
          </>
        }
        clubToday={
          <HeuteImVereinWidget
            items={todayWithHrefs}
            dateLabel={todayFormatted}
            viewAllHref={todayPlannerHref}
          />
        }
        clubAttention={
          commandCenter.personalAttention.authorized ? (
            <DashboardSection
              title={tPersonal("attention.sectionTitle")}
              icon={<BellRing className="h-4 w-4" />}
              iconAccent="warning"
              noPadding
              variant="card"
            >
              <div className="px-4 py-0.5 sm:px-5">
                <PersonalAttention
                  items={commandCenter.personalAttention.items}
                  totalCount={commandCenter.personalAttention.totalCount}
                  viewAllHref={commandCenter.personalAttention.viewAllHref}
                />
              </div>
            </DashboardSection>
          ) : null
        }
        tertiary={
          <>
            {cockpitQuickActions.length > 0 && (
              <DashboardSection
                title="Schnellaktionen"
                icon={<Zap className="h-4 w-4" />}
                iconAccent="primary"
                variant="card"
                density="compact"
                bodyClassName="px-4 py-1.5 sm:px-5 sm:py-1.5"
              >
                <DashboardQuickActionStrip actions={cockpitQuickActions} />
              </DashboardSection>
            )}

            {(commandCenter.newsItems.length > 0 || activityItems.length > 0) && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-start lg:gap-5">
                {commandCenter.newsItems.length > 0 && (
                  <DashboardSection
                    title="Aktuelle News"
                    icon={<Newspaper className="h-4 w-4" />}
                    iconAccent="primary"
                    variant="card"
                    bodyClassName="px-4 py-3 sm:px-5 sm:py-3"
                    footer={
                      <Link href="/dashboard/website/news" className="sce-link-primary text-[0.8125rem]">
                        Alle News anzeigen →
                      </Link>
                    }
                  >
                    <DashboardNewsSection
                      items={commandCenter.newsItems}
                      variant="compact"
                      maxItems={2}
                      embedded
                    />
                  </DashboardSection>
                )}

                <DashboardSection
                  title="Letzte Aktivitäten"
                  icon={<ScrollText className="h-4 w-4" />}
                  iconAccent="violet"
                  noPadding
                  variant="card"
                  footer={
                    activityItems.length > 0 ? (
                      <Link href="/dashboard/logs" className="sce-link-primary text-[0.8125rem]">
                        Alle Aktivitäten anzeigen →
                      </Link>
                    ) : undefined
                  }
                >
                  <div className="px-4 py-0.5 sm:px-5">
                    <DashboardActivityFeed
                      items={activityItems}
                      emptyState={
                        <DashboardEmptyState
                          icon={<Globe className="h-5 w-5" />}
                          title="Noch keine Aktivitäten"
                          description="Aktuelle News, Anmeldungen, Planungsänderungen und Meetings erscheinen hier."
                          variant="compact"
                        />
                      }
                    />
                  </div>
                </DashboardSection>
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
