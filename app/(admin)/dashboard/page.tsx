import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  FileText,
  Globe,
  Monitor,
  Newspaper,
  ScrollText,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import { getPersonalizedGreeting, resolveDashboardFirstName } from "@/lib/dashboard/greeting";
import {
  buildDashboardTasks,
  formatEventTypeLabel,
  tenantEventWhere,
} from "@/lib/dashboard/command-center";
import { getPersonFirstNameByUserId } from "@/lib/people/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getDashboardMeetingSummary } from "@/lib/dashboard/strategic-summary";
import {
  DashboardHero,
  DashboardKpiCard,
  DashboardQuickActions,
  DashboardActivityFeed,
  DashboardActivityItem,
  DashboardSection,
  DashboardEmptyState,
  DashboardCommandCenter,
  DashboardTodayEvents,
  DashboardTodayEventsLinkAction,
  DashboardTaskList,
  DashboardUpcomingList,
} from "@/components/ui/dashboard";
import { getCurrentSwissFootballSeason } from "@/lib/seasons/season-logic";

// ── Activity helpers ──────────────────────────────────────────────────────────

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

function formatUpcomingMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function getDashboardData(
  tenantId: string | null,
  actor: Parameters<typeof getDashboardMeetingSummary>[0],
) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() + daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const tWhere = tenantId ? { tenantId } : {};
  const weekEventWhere = tenantEventWhere(tenantId, {
    startAt: { gte: weekStart, lt: weekEnd },
  });
  const todayEventWhere = tenantEventWhere(tenantId, {
    startAt: { gte: todayStart, lt: todayEnd },
  });
  const upcomingEventWhere = tenantEventWhere(tenantId, {
    startAt: { gte: todayStart },
  });
  const recentEventWhere = tenantEventWhere(tenantId, {
    updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });

  const [
    openRegistrationCount,
    newsInReviewCount,
    scheduledNewsCount,
    weekEventsCount,
    todayEventsCount,
    todayEvents,
    recentNews,
    recentRegistrations,
    recentEvents,
    meetingSummary,
    upcomingEvents,
  ] = await Promise.all([
    prisma.registration.count({ where: { ...tWhere, status: { in: ["NEW", "REVIEWING"] } } }),
    prisma.newsArticle.count({ where: { ...tWhere, status: "IN_REVIEW" } }),
    prisma.newsArticle.count({ where: { ...tWhere, status: "SCHEDULED" } }),
    prisma.event.count({ where: weekEventWhere }),
    prisma.event.count({ where: todayEventWhere }),
    prisma.event.findMany({
      where: todayEventWhere,
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true, location: true, type: true },
    }),

    prisma.newsArticle.findMany({
      where: tWhere,
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: { id: true, title: true, updatedAt: true, status: true, authorName: true },
    }),
    prisma.registration.findMany({
      where: tWhere,
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, firstName: true, lastName: true, createdAt: true, type: true },
    }),
    prisma.event.findMany({
      where: recentEventWhere,
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: { id: true, title: true, updatedAt: true, type: true },
    }),
    getDashboardMeetingSummary(actor, today),

    prisma.event.findMany({
      where: upcomingEventWhere,
      orderBy: { startAt: "asc" },
      take: 4,
      select: { id: true, title: true, startAt: true, location: true, type: true },
    }),
  ]);

  return {
    openRegistrationCount,
    newsInReviewCount,
    scheduledNewsCount,
    weekEventsCount,
    todayEventsCount,
    todayEvents,
    recentNews,
    recentRegistrations,
    recentEvents,
    recentMeetings: meetingSummary.recentMeetings,
    upcomingMeetings: meetingSummary.upcomingMeetings,
    upcomingEvents,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const ctx = await getActiveTenant();
  const actor =
    session?.user && ctx
      ? await getActorContext(session.user, ctx.id)
      : null;

  const linkedPersonFirstName = session?.user?.id
    ? await getPersonFirstNameByUserId(session.user.id)
    : null;
  const firstName = resolveDashboardFirstName({
    linkedPersonFirstName,
    sessionFirstName: session?.user?.firstName,
    tenantName: ctx?.name,
  });

  const dash = await getDashboardData(ctx?.id ?? null, actor);

  const fmtCfg = { locale: ctx?.locale ?? "de-CH", timezone: ctx?.timezone ?? undefined };

  const activeSeason = ctx ? getCurrentSwissFootballSeason()?.label : undefined;

  const todayFormatted = new Intl.DateTimeFormat(fmtCfg.locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // ── Activity feed ────────────────────────────────────────────────────────

  type ActivityEntry = {
    key: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    date: Date;
    tag: string;
    tagVariant: DashboardActivityItem["tagVariant"];
  };

  const rawActivities: ActivityEntry[] = [
    ...dash.recentNews.map((n) => ({
      key: `news-${n.id}`,
      icon: <Newspaper className="h-4 w-4" />,
      title: n.title,
      subtitle: n.authorName ? `von ${n.authorName}` : "Newsartikel",
      date: n.updatedAt,
      tag: "News",
      tagVariant: "info" as const,
    })),
    ...dash.recentRegistrations.map((r) => ({
      key: `reg-${r.id}`,
      icon: <Users className="h-4 w-4" />,
      title: `Neue Anmeldung von ${r.firstName} ${r.lastName}`,
      subtitle: r.type === "PROBETRAINING" ? "Probetraining" : "Spieleranmeldung",
      date: r.createdAt,
      tag: "Anmeldung",
      tagVariant: "warning" as const,
    })),
    ...dash.recentEvents.map((e) => ({
      key: `event-${e.id}`,
      icon: <CalendarDays className="h-4 w-4" />,
      title: `${e.title} wurde aktualisiert`,
      subtitle: formatEventTypeLabel(e.type),
      date: e.updatedAt,
      tag: "Planung",
      tagVariant: "success" as const,
    })),
    ...dash.recentMeetings.map((m) => ({
      key: `meeting-${m.id}`,
      icon: <ScrollText className="h-4 w-4" />,
      title: `Meeting "${m.title}" erstellt`,
      subtitle: "Neues Meeting geplant",
      date: m.createdAt,
      tag: "Meeting",
      tagVariant: "primary" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const activityItems: DashboardActivityItem[] = rawActivities.map((a) => ({
    key: a.key,
    icon: a.icon,
    title: a.title,
    subtitle: a.subtitle,
    timestamp: timeAgo(a.date),
    tag: a.tag,
    tagVariant: a.tagVariant,
  }));

  // ── Tasks panel ──────────────────────────────────────────────────────────

  const tasks = buildDashboardTasks({
    newsInReviewCount: dash.newsInReviewCount,
    openRegistrationCount: dash.openRegistrationCount,
    scheduledNewsCount: dash.scheduledNewsCount,
  });

  // ── Today's events ───────────────────────────────────────────────────────

  const todayEventItems = dash.todayEvents.map((ev) => ({
    key: `today-${ev.id}`,
    time: formatTime(ev.startAt, fmtCfg),
    typeLabel: formatEventTypeLabel(ev.type),
    title: ev.title,
    location: ev.location,
  }));

  const todayCountLabel =
    dash.todayEventsCount > 0
      ? `${dash.todayEventsCount} Termin${dash.todayEventsCount === 1 ? "" : "e"}`
      : undefined;

  // ── Upcoming events (merge sport events + meetings) ───────────────────────

  type UpcomingEntry = {
    key: string;
    date: Date;
    day: string;
    month: string;
    title: string;
    location: string | null;
    time: string;
  };

  const upcomingEntries: UpcomingEntry[] = [
    ...dash.upcomingEvents.map((ev) => ({
      key: `ev-${ev.id}`,
      date: ev.startAt,
      day: String(ev.startAt.getDate()),
      month: formatUpcomingMonth(ev.startAt, fmtCfg.locale),
      title: ev.title,
      location: ev.location,
      time: formatTime(ev.startAt, fmtCfg),
    })),
    ...dash.upcomingMeetings.map((m) => ({
      key: `mt-${m.id}`,
      date: m.meetingDate,
      day: String(m.meetingDate.getDate()),
      month: formatUpcomingMonth(m.meetingDate, fmtCfg.locale),
      title: m.title,
      location: m.location,
      time: formatTime(m.meetingDate, fmtCfg),
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  const greeting = getPersonalizedGreeting(firstName);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHero
        greeting={greeting}
        clubName={ctx?.name ?? undefined}
        activeSeason={activeSeason}
        date={todayFormatted}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          title="Offene Anmeldungen"
          value={String(dash.openRegistrationCount)}
          description={dash.openRegistrationCount > 0 ? "Zu bearbeiten" : undefined}
          accent="warning"
          icon={<Users className="h-4 w-4" />}
        />
        <DashboardKpiCard
          title="News in Prüfung"
          value={String(dash.newsInReviewCount)}
          description={dash.newsInReviewCount > 0 ? "Zu bearbeiten" : undefined}
          accent="info"
          icon={<Newspaper className="h-4 w-4" />}
        />
        <DashboardKpiCard
          title="Geplante Veröffentlichungen"
          value={String(dash.scheduledNewsCount)}
          description={dash.scheduledNewsCount > 0 ? "Zu bearbeiten" : undefined}
          accent="success"
          icon={<Monitor className="h-4 w-4" />}
        />
        <DashboardKpiCard
          title="Events diese Woche"
          value={String(dash.weekEventsCount)}
          description={
            dash.todayEventsCount > 0 ? `${dash.todayEventsCount} heute` : undefined
          }
          accent="primary"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <DashboardCommandCenter
        today={
          <DashboardSection
            title="Heute im Verein"
            meta={todayCountLabel}
            variant="card"
            noPadding
            bodyClassName="px-5"
            footer={
              <Link href="/dashboard/planner" className="sce-link-primary text-[0.8125rem]">
                Zur Planung →
              </Link>
            }
          >
            <DashboardTodayEvents
              events={todayEventItems}
              emptyStateAction={
                <DashboardTodayEventsLinkAction
                  href="/dashboard/planner"
                  label="Zur Planung"
                />
              }
            />
          </DashboardSection>
        }
        tasks={
          <DashboardSection
            title="Meine Aufgaben"
            variant="card"
            noPadding
            bodyClassName="px-5"
            footer={
              tasks.length > 0 ? (
                <Link href="/dashboard/registrations" className="sce-link-primary text-[0.8125rem]">
                  Alle Aufgaben anzeigen →
                </Link>
              ) : undefined
            }
          >
            <DashboardTaskList tasks={tasks} />
          </DashboardSection>
        }
        quickActions={
          <DashboardSection title="Schnellaktionen" variant="card" bodyClassName="px-4 py-4">
            <DashboardQuickActions
              actions={[
                {
                  href: "/dashboard/website/news/new",
                  icon: <Newspaper className="h-4 w-4" />,
                  title: "Neue News",
                  subtitle: "Artikel erstellen",
                },
                {
                  href: "/dashboard/website/pages/new",
                  icon: <FileText className="h-4 w-4" />,
                  title: "Neue Seite",
                  subtitle: "Webseite erstellen",
                },
                {
                  href: "/dashboard/website/publishing",
                  icon: <Monitor className="h-4 w-4" />,
                  title: "Homepage",
                  subtitle: "Vorschau öffnen",
                },
                {
                  href: "/dashboard/planner",
                  icon: <CalendarRange className="h-4 w-4" />,
                  title: "Wochenplanung",
                  subtitle: "Zur Planung",
                },
              ]}
            />
          </DashboardSection>
        }
        upcoming={
          <DashboardSection
            title="Nächste Termine"
            variant="card"
            noPadding
            bodyClassName="px-5"
            footer={
              <Link href="/dashboard/planner" className="sce-link-primary text-[0.8125rem]">
                Alle Termine anzeigen →
              </Link>
            }
          >
            <DashboardUpcomingList
              items={upcomingEntries}
              emptyIcon={<CalendarDays className="h-6 w-6" />}
            />
          </DashboardSection>
        }
        activity={
          <DashboardSection
            title="Aktuelle Aktivitäten"
            variant="card"
            noPadding
            bodyClassName="px-5"
            footer={
              <Link href="/dashboard/logs" className="sce-link-primary text-[0.8125rem]">
                Alle Aktivitäten anzeigen →
              </Link>
            }
          >
            <DashboardActivityFeed
              items={activityItems}
              emptyState={
                <DashboardEmptyState
                  icon={<Globe className="h-7 w-7" />}
                  title="Noch keine Aktivitäten"
                  description="Aktivitäten erscheinen hier sobald Inhalte erstellt werden."
                />
              }
            />
          </DashboardSection>
        }
      />
    </div>
  );
}
