import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CalendarRange,
  FileText,
  Globe,
  Monitor,
  Newspaper,
  ScrollText,
  UserPlus,
  Users,
  BellRing,
  Zap,
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
import {
  DashboardHeroSection,
  DashboardKpiGrid,
  DashboardQuickActions,
  DashboardActivityFeed,
  DashboardActivityItem,
  DashboardSection,
  DashboardGrid,
  DashboardEmptyState,
  DashboardTodaySchedule,
  DashboardAttentionList,
  DashboardUpcomingList,
  DashboardNewsSection,
} from "@/components/ui/dashboard";
import type { DashboardKpiAccent } from "@/components/ui/dashboard";
import type { QuickActionAccent } from "@/components/ui/dashboard/DashboardQuickActions";
import { getCurrentSwissFootballSeason } from "@/lib/seasons/season-logic";
import { formatTodayDate } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";

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

const KPI_ACCENT: Record<string, DashboardKpiAccent> = {
  teams: "primary",
  people: "info",
  "today-events": "success",
  registrations: "violet",
};

const QUICK_ACTION_ACCENT: Record<string, QuickActionAccent> = {
  news: "primary",
  training: "info",
  "planner-week": "violet",
  person: "success",
  infoboard: "primary",
  registrations: "violet",
  events: "info",
  "people-access": "default",
};

const QUICK_ACTION_ICONS = {
  news: <Newspaper className="h-5 w-5" />,
  training: <CalendarDays className="h-5 w-5" />,
  "planner-week": <CalendarRange className="h-5 w-5" />,
  person: <UserPlus className="h-5 w-5" />,
  infoboard: <Monitor className="h-5 w-5" />,
  registrations: <Users className="h-5 w-5" />,
  events: <CalendarDays className="h-5 w-5" />,
  "people-access": <Users className="h-5 w-5" />,
} as const;

export default async function DashboardPage() {
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
        todayItems: [],
        attentionItems: [],
        upcomingItems: [],
        activitySources: [],
        newsItems: [],
        heroBackgroundImageUrl: null,
        heroBackgroundTransform: DEFAULT_HERO_TRANSFORM,
      };

  const permissionKeys = (actor?.permissionKeys ??
    session?.user?.permissionKeys ??
    []) as PermissionKey[];

  const quickActionDefs = getDashboardQuickActionDefs(permissionKeys);
  const quickActions = quickActionDefs.map((action) => ({
    href: action.href,
    icon: QUICK_ACTION_ICONS[action.key as keyof typeof QUICK_ACTION_ICONS] ?? (
      <FileText className="h-5 w-5" />
    ),
    title: action.title,
    subtitle: action.subtitle,
    accent: QUICK_ACTION_ACCENT[action.key] ?? "primary",
  }));

  const activeSeason = ctx ? getCurrentSwissFootballSeason()?.label : undefined;
  const todayFormatted = formatTodayDate(fmtCfg);
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

  const activityItems: DashboardActivityItem[] = commandCenter.activitySources.map(
    (entry) => {
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
    },
  );

  const kpiItems = commandCenter.kpis.map((kpi) => ({
    key: kpi.key,
    label: kpi.label,
    value: kpi.value,
    description: kpi.context,
    accent: KPI_ACCENT[kpi.key] ?? "default",
    icon:
      kpi.key === "teams" ? (
        <Users className="h-6 w-6" />
      ) : kpi.key === "people" ? (
        <UserPlus className="h-6 w-6" />
      ) : kpi.key === "today-events" ? (
        <CalendarDays className="h-6 w-6" />
      ) : (
        <Newspaper className="h-6 w-6" />
      ),
  }));

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <DashboardHeroSection
        initialBackgroundImageUrl={commandCenter.heroBackgroundImageUrl}
        initialBackgroundTransform={commandCenter.heroBackgroundTransform}
        greeting={greeting}
        highlightName={displayName}
        subtitle={heroSubtitle}
        clubName={ctx?.name ?? undefined}
        activeSeason={activeSeason}
        date={todayFormatted}
        kpiGrid={
          kpiItems.length > 0 ? (
            <DashboardKpiGrid items={kpiItems} variant="hero" />
          ) : undefined
        }
      />

      <DashboardGrid
        sidebar={
          <>
            <DashboardSection
              title="Benötigt Aufmerksamkeit"
              icon={<BellRing className="h-4 w-4" />}
              iconAccent="info"
              noPadding
              variant="card"
            >
              <div className="px-4 py-0.5 sm:px-5">
                <DashboardAttentionList items={commandCenter.attentionItems} />
              </div>
            </DashboardSection>

            <DashboardSection
              title="Nächste Termine"
              icon={<CalendarDays className="h-4 w-4" />}
              iconAccent="info"
              noPadding
              variant="card"
              footer={
                <Link href="/dashboard/planner" className="sce-link-primary text-[0.8125rem]">
                  Zum Kalender →
                </Link>
              }
            >
              <div className="px-4 py-0.5 sm:px-5">
                <DashboardUpcomingList items={commandCenter.upcomingItems} />
              </div>
            </DashboardSection>
          </>
        }
      >
        <DashboardSection
          title="Heute im Verein"
          description={todayFormatted}
          icon={<CalendarDays className="h-4 w-4" />}
          iconAccent="info"
          variant="card"
          bodyClassName="px-4 py-3 sm:px-5 sm:py-4"
          actions={
            <Link href="/dashboard/planner" className="sce-link-primary text-[0.8125rem] font-medium">
              Alle Termine →
            </Link>
          }
        >
          <DashboardTodaySchedule
            items={withTodayItemHrefs(commandCenter.todayItems)}
            emptyState={
              <DashboardEmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Heute ist nichts geplant"
                description="Trainings, Spiele, Turniere und Meetings erscheinen hier chronologisch."
                action={
                  quickActions.some((action) => action.href.includes("/events")) ? (
                    <Link href="/dashboard/events" className="sce-link-primary text-sm">
                      Events öffnen
                    </Link>
                  ) : undefined
                }
              />
            }
          />
        </DashboardSection>

        {quickActions.length > 0 && (
          <DashboardSection
            title="Schnellaktionen"
            icon={<Zap className="h-4 w-4" />}
            iconAccent="primary"
            variant="card"
            bodyClassName="px-3.5 py-3 sm:px-4 sm:py-3.5"
          >
            <DashboardQuickActions actions={quickActions} />
          </DashboardSection>
        )}

        {(commandCenter.newsItems.length > 0 || activityItems.length > 0) && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-5">
            {commandCenter.newsItems.length > 0 && (
              <DashboardSection
                title="Aktuelle News"
                icon={<Newspaper className="h-4 w-4" />}
                iconAccent="primary"
                variant="card"
                bodyClassName="px-4 py-3 sm:px-5 sm:py-3.5"
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
                    />
                  }
                />
              </div>
            </DashboardSection>
          </div>
        )}
      </DashboardGrid>
    </div>
  );
}
