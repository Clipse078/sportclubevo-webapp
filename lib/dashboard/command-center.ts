/**
 * SCE-DASHBOARD-V3-01 — Command Center data layer.
 *
 * Tenant-scoped, real-data-only queries and pure builders for the operational
 * dashboard. No mocked metrics, filler tasks, or sporting calculations.
 */

import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getDayWindow, formatIsoDay } from "@/lib/planner/date-utils";
import {
  getDashboardMeetingSummary,
  getOperativeStrategicCounts,
} from "@/lib/dashboard/strategic-summary";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  formatDate,
  formatTime,
  type TenantFormatConfig,
} from "@/lib/tenant-runtime/formatters";
import {
  collectProviderClubIdsFromEventPolicies,
  loadCanonicalClubLogoIndex,
} from "@/lib/club-directory/canonical-logo-resolution";
import { loadMatchEventPoliciesByEventId } from "@/lib/website/public-matches-identity";
import { SFV_PROVIDER } from "@/lib/integrations/sfv/season-bridge";
import { loadTournamentLogoResolutionContext } from "@/lib/tournaments/logo-resolution-context";
import {
  buildCommandCenterMatchPresentation,
  buildCommandCenterTournamentParticipants,
  resolveNewsHeroImageUrl,
  type CommandCenterMatchPresentation,
  type CommandCenterNewsItem,
  type CommandCenterTournamentParticipant,
  type CommandCenterUpcomingLogo,
} from "@/lib/dashboard/command-center-presentation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommandCenterKpi = {
  key: string;
  label: string;
  value: string;
  context?: string;
};

export type TodayScheduleItem = {
  key: string;
  sortAt: Date;
  timeLabel: string;
  endTimeLabel?: string;
  typeLabel: string;
  eventType?: EventType | "MEETING";
  title: string;
  subtitle?: string;
  meta?: string;
  competitionLabel?: string;
  matchPresentation?: CommandCenterMatchPresentation;
  tournamentParticipants?: CommandCenterTournamentParticipant[];
};

export type AttentionItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  urgent?: boolean;
};

export type UpcomingScheduleItem = {
  key: string;
  sortAt: Date;
  dayLabel: string;
  monthLabel: string;
  title: string;
  location?: string;
  timeLabel: string;
  eventType?: EventType | "MEETING";
  href?: string;
  logo?: CommandCenterUpcomingLogo;
};

export type ActivitySourceItem = {
  key: string;
  title: string;
  subtitle: string;
  date: Date;
  kind: "news" | "registration" | "event" | "meeting";
};

export type CommandCenterData = {
  kpis: CommandCenterKpi[];
  todayItems: TodayScheduleItem[];
  attentionItems: AttentionItem[];
  upcomingItems: UpcomingScheduleItem[];
  activitySources: ActivitySourceItem[];
  newsItems: CommandCenterNewsItem[];
  /** Ready for V3-03 personal dashboard background upload — null until persisted. */
  heroBackgroundImageUrl: string | null;
};

type StrategicActor = Pick<ActorContext, "tenantId" | "userId" | "permissionKeys">;

/** Prisma select for tournament logos/names — excludes infoboard-only dressing-room data. */
const COMMAND_CENTER_TOURNAMENT_PARTICIPANT_SELECT = {
  id: true,
  eventId: true,
  displayName: true,
  manualLabel: true,
  displayOrder: true,
  team: {
    select: {
      name: true,
      shortName: true,
      alternativeName: true,
      infoboardDisplayName: true,
      infoboardTournamentDisplayName: true,
    },
  },
  externalClub: {
    select: {
      name: true,
      shortName: true,
      alternativeName: true,
      logoUrl: true,
      providerMappings: {
        where: { provider: SFV_PROVIDER },
        select: { providerClubId: true },
      },
    },
  },
  externalTeam: {
    select: {
      name: true,
      shortName: true,
      alternativeName: true,
      logoUrl: true,
      providerMappings: {
        where: { provider: SFV_PROVIDER },
        select: { providerClubId: true },
      },
      externalClub: {
        select: {
          name: true,
          shortName: true,
          alternativeName: true,
          logoUrl: true,
        },
      },
    },
  },
};

// ── Labels ────────────────────────────────────────────────────────────────────

function getEventTypeLabel(type: EventType): string {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TOURNAMENT":
      return "Turnier";
    case "VACATION_PERIOD":
      return "Ferien";
    case "OTHER":
      return "Veranstaltung";
    default:
      return type;
  }
}

function hasAnyPermission(
  actor: StrategicActor | null,
  permissionKeys: readonly PermissionKey[],
): boolean {
  if (!actor?.permissionKeys?.length) return false;
  return actor.permissionKeys.some((key) =>
    (permissionKeys as readonly string[]).includes(key),
  );
}

function tenantEventWhere(tenantId: string) {
  return {
    tenantId,
    OR: [{ teamId: null }, { team: { tenantId } }],
  };
}

function formatDressingRooms(home?: string | null, away?: string | null): string | undefined {
  const parts = [home, away].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}

function buildLocationMeta(args: {
  location?: string | null;
  pitchCode?: string | null;
  homeDressingRoomCode?: string | null;
  awayDressingRoomCode?: string | null;
}): string | undefined {
  const segments = [
    args.location?.trim(),
    args.pitchCode ? `Feld ${args.pitchCode}` : undefined,
    formatDressingRooms(args.homeDressingRoomCode, args.awayDressingRoomCode),
  ].filter(Boolean);

  return segments.length > 0 ? segments.join(" · ") : undefined;
}

// ── Pure builders (testable) ──────────────────────────────────────────────────

export function buildCommandCenterKpis(input: {
  teamCount: number;
  activePersonCount: number;
  todayEventCount: number;
  openRegistrationCount: number;
  canSeeRegistrations: boolean;
}): CommandCenterKpi[] {
  const kpis: CommandCenterKpi[] = [
    {
      key: "teams",
      label: "Teams",
      value: String(input.teamCount),
    },
    {
      key: "people",
      label: "Aktive Personen",
      value: String(input.activePersonCount),
    },
    {
      key: "today-events",
      label: "Termine heute",
      value: String(input.todayEventCount),
    },
  ];

  if (input.canSeeRegistrations) {
    kpis.push({
      key: "registrations",
      label: "Offene Anmeldungen",
      value: String(input.openRegistrationCount),
    });
  }

  return kpis.slice(0, 4);
}

export function buildAttentionItems(input: {
  newsInReviewCount: number;
  openRegistrationCount: number;
  scheduledNewsCount: number;
  overdueActionCount: number;
  canSeeNews: boolean;
  canSeeRegistrations: boolean;
  canSeeMeetings: boolean;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (input.canSeeNews && input.newsInReviewCount > 0) {
    items.push({
      key: "news-review",
      title: `News prüfen (${input.newsInReviewCount})`,
      subtitle:
        input.newsInReviewCount === 1
          ? "1 Artikel wartet auf Freigabe"
          : `${input.newsInReviewCount} Artikel warten auf Freigabe`,
      href: "/dashboard/website/news",
      urgent: true,
    });
  }

  if (input.canSeeRegistrations && input.openRegistrationCount > 0) {
    items.push({
      key: "registrations",
      title: `Anmeldungen bearbeiten (${input.openRegistrationCount})`,
      subtitle: "Neue oder offene Anmeldungen prüfen",
      href: "/dashboard/registrations",
      urgent: true,
    });
  }

  if (input.canSeeNews && input.scheduledNewsCount > 0) {
    items.push({
      key: "scheduled-news",
      title: `Geplante Veröffentlichungen (${input.scheduledNewsCount})`,
      subtitle: "Geplante Newsartikel freigeben oder prüfen",
      href: "/dashboard/website/publishing",
    });
  }

  if (input.canSeeMeetings && input.overdueActionCount > 0) {
    items.push({
      key: "overdue-actions",
      title: `Überfällige Massnahmen (${input.overdueActionCount})`,
      subtitle: "Offene Meeting-Massnahmen mit abgelaufenem Fälligkeitsdatum",
      href: "/vereinsleitung/meetings",
      urgent: true,
    });
  }

  return items;
}

// ── Data fetch ────────────────────────────────────────────────────────────────

export async function getCommandCenterData(args: {
  tenantId: string;
  actor: StrategicActor | null;
  fmtCfg: TenantFormatConfig;
  now?: Date;
}): Promise<CommandCenterData> {
  const now = args.now ?? new Date();
  const day = getDayWindow(formatIsoDay(now));
  const tomorrowStart = new Date(day.end.getTime() + 1);

  const tWhere = { tenantId: args.tenantId };
  const eventWhere = tenantEventWhere(args.tenantId);

  const canSeeNews = hasAnyPermission(args.actor, [
    PERMISSIONS.NEWS_MANAGE,
    PERMISSIONS.WEBSITE_MANAGE,
  ]);
  const canSeeRegistrations = hasAnyPermission(args.actor, [
    PERMISSIONS.REGISTRATIONS_VIEW,
    PERMISSIONS.REGISTRATIONS_EDIT,
  ]);
  const canSeeMeetings = hasAnyPermission(args.actor, [
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
  ]);

  const newsWhere = canSeeNews ? tWhere : { tenantId: "__none__" };

  const publishedNewsWhere = {
    tenantId: args.tenantId,
    status: "PUBLISHED" as const,
    publishedAt: { not: null, lte: now },
  };

  const [
    tenant,
    teamCount,
    activePersonCount,
    todayEventCount,
    openRegistrationCount,
    newsInReviewCount,
    scheduledNewsCount,
    todayEvents,
    upcomingEvents,
    recentNews,
    recentRegistrations,
    recentEvents,
    meetingSummary,
    operativeCounts,
    todayMeetings,
    upcomingMeetings,
    dashboardNewsArticles,
  ] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: args.tenantId },
      select: { name: true, logoUrl: true },
    }),
    prisma.team.count({ where: tWhere }),
    prisma.person.count({ where: { ...tWhere, isActive: true } }),
    prisma.event.count({
      where: {
        ...eventWhere,
        startAt: { gte: day.start, lte: day.end },
      },
    }),
    canSeeRegistrations
      ? prisma.registration.count({
          where: { ...tWhere, status: { in: ["NEW", "REVIEWING"] } },
        })
      : Promise.resolve(0),
    canSeeNews
      ? prisma.newsArticle.count({ where: { ...newsWhere, status: "IN_REVIEW" } })
      : Promise.resolve(0),
    canSeeNews
      ? prisma.newsArticle.count({ where: { ...newsWhere, status: "SCHEDULED" } })
      : Promise.resolve(0),

    prisma.event.findMany({
      where: {
        ...eventWhere,
        startAt: { gte: day.start, lte: day.end },
      },
      orderBy: [{ startAt: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        type: true,
        startAt: true,
        endAt: true,
        location: true,
        pitchCode: true,
        homeDressingRoomCode: true,
        awayDressingRoomCode: true,
        opponentName: true,
        team: { select: { id: true, name: true } },
      },
    }),

    prisma.event.findMany({
      where: {
        ...eventWhere,
        startAt: { gte: tomorrowStart },
      },
      orderBy: [{ startAt: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true,
        type: true,
        opponentName: true,
        team: { select: { name: true } },
      },
    }),

    canSeeNews
      ? prisma.newsArticle.findMany({
          where: newsWhere,
          orderBy: { updatedAt: "desc" },
          take: 2,
          select: {
            id: true,
            title: true,
            updatedAt: true,
            authorName: true,
          },
        })
      : Promise.resolve([]),

    canSeeRegistrations
      ? prisma.registration.findMany({
          where: tWhere,
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            type: true,
          },
        })
      : Promise.resolve([]),

    prisma.event.findMany({
      where: {
        ...eventWhere,
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: { id: true, title: true, updatedAt: true, type: true },
    }),

    getDashboardMeetingSummary(args.actor, now),
    getOperativeStrategicCounts(args.actor ?? { tenantId: args.tenantId, userId: "", permissionKeys: [] }, now),

    canSeeMeetings
      ? prisma.meeting.findMany({
          where: {
            tenantId: args.tenantId,
            meetingDate: { gte: day.start, lte: day.end },
            status: "PLANNED",
          },
          orderBy: { meetingDate: "asc" },
          select: {
            id: true,
            title: true,
            meetingDate: true,
            location: true,
          },
        })
      : Promise.resolve([]),

    canSeeMeetings
      ? prisma.meeting.findMany({
          where: {
            tenantId: args.tenantId,
            meetingDate: { gte: tomorrowStart },
            status: "PLANNED",
          },
          orderBy: { meetingDate: "asc" },
          take: 4,
          select: {
            id: true,
            title: true,
            meetingDate: true,
            location: true,
          },
        })
      : Promise.resolve([]),
    prisma.newsArticle.findMany({
      where: publishedNewsWhere,
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        heroMedia: {
          select: { url: true, altText: true },
        },
      },
    }),
  ]);

  const tenantClubName = tenant?.name ?? "Verein";
  const tenantLogoUrl = tenant?.logoUrl ?? null;

  const matchAndTournamentEventIds = [
    ...todayEvents
      .filter((event) => event.type === "MATCH" || event.type === "TOURNAMENT")
      .map((event) => event.id),
    ...upcomingEvents
      .filter((event) => event.type === "MATCH")
      .map((event) => event.id),
  ];

  const tournamentEventIds = todayEvents
    .filter((event) => event.type === "TOURNAMENT")
    .map((event) => event.id);

  const [eventPolicyByEventId, tournamentParticipantsByEventId, tournamentLogoContext] =
    await Promise.all([
      loadMatchEventPoliciesByEventId(args.tenantId, matchAndTournamentEventIds),
      tournamentEventIds.length > 0
        ? prisma.tournamentParticipant
            .findMany({
              where: {
                tenantId: args.tenantId,
                eventId: { in: tournamentEventIds },
              },
              select: COMMAND_CENTER_TOURNAMENT_PARTICIPANT_SELECT,
              orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            })
            .then((rows) => {
              const byEventId = new Map<string, typeof rows>();
              for (const row of rows) {
                const bucket = byEventId.get(row.eventId);
                if (bucket) bucket.push(row);
                else byEventId.set(row.eventId, [row]);
              }
              return byEventId;
            })
        : Promise.resolve(new Map<string, never[]>()),
      loadTournamentLogoResolutionContext(args.tenantId),
    ]);

  const canonicalLogoByProviderClubId = await loadCanonicalClubLogoIndex(
    args.tenantId,
    collectProviderClubIdsFromEventPolicies([...eventPolicyByEventId.values()]),
  );

  const todayItems: TodayScheduleItem[] = [
    ...todayEvents.map((event) => {
      const policy = eventPolicyByEventId.get(event.id);
      const ownTeamDisplayName = event.team?.name ?? null;
      const subtitle = ownTeamDisplayName ?? event.opponentName ?? undefined;

      const matchPresentation =
        event.type === "MATCH"
          ? buildCommandCenterMatchPresentation({
              policy,
              opponentName: event.opponentName,
              ownTeamDisplayName,
              tenantClubName,
              tenantLogoUrl,
              canonicalLogoByProviderClubId,
            }) ?? undefined
          : undefined;

      const tournamentParticipants =
        event.type === "TOURNAMENT"
          ? buildCommandCenterTournamentParticipants(
              tournamentParticipantsByEventId.get(event.id) ?? [],
              tenantLogoUrl,
              tournamentLogoContext,
            )
          : undefined;

      return {
        key: `event-${event.id}`,
        sortAt: event.startAt,
        timeLabel: formatTime(event.startAt, args.fmtCfg),
        endTimeLabel: event.endAt ? formatTime(event.endAt, args.fmtCfg) : undefined,
        typeLabel: getEventTypeLabel(event.type),
        eventType: event.type,
        title: event.title,
        subtitle: matchPresentation ? undefined : subtitle,
        meta: buildLocationMeta(event),
        competitionLabel: policy?.competitionLabel?.trim() || undefined,
        matchPresentation,
        tournamentParticipants:
          tournamentParticipants && tournamentParticipants.length > 0
            ? tournamentParticipants
            : undefined,
      };
    }),
    ...todayMeetings.map((meeting) => ({
      key: `meeting-${meeting.id}`,
      sortAt: meeting.meetingDate,
      timeLabel: formatTime(meeting.meetingDate, args.fmtCfg),
      typeLabel: "Meeting",
      eventType: "MEETING" as const,
      title: meeting.title,
      meta: meeting.location ?? undefined,
    })),
  ].sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());

  const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  const upcomingItems: UpcomingScheduleItem[] = [
    ...upcomingEvents.map((event) => {
      const policy = eventPolicyByEventId.get(event.id);
      const matchPresentation =
        event.type === "MATCH"
          ? buildCommandCenterMatchPresentation({
              policy,
              opponentName: event.opponentName,
              ownTeamDisplayName: event.team?.name ?? null,
              tenantClubName,
              tenantLogoUrl,
              canonicalLogoByProviderClubId,
            })
          : null;

      const opponentLogo =
        matchPresentation &&
        (matchPresentation.home.logoUrl
          ? { logoUrl: matchPresentation.home.logoUrl, displayName: matchPresentation.home.displayName }
          : matchPresentation.away.logoUrl
            ? { logoUrl: matchPresentation.away.logoUrl, displayName: matchPresentation.away.displayName }
            : null);

      return {
        key: `event-${event.id}`,
        sortAt: event.startAt,
        dayLabel: String(event.startAt.getUTCDate()),
        monthLabel: monthLabels[event.startAt.getUTCMonth()] ?? "",
        title: event.title,
        location: event.location ?? undefined,
        timeLabel: formatTime(event.startAt, args.fmtCfg),
        eventType: event.type,
        href: `/dashboard/planner/edit/${event.id}`,
        logo: opponentLogo ?? undefined,
      };
    }),
    ...upcomingMeetings.map((meeting) => ({
      key: `meeting-${meeting.id}`,
      sortAt: meeting.meetingDate,
      dayLabel: String(meeting.meetingDate.getUTCDate()),
      monthLabel: monthLabels[meeting.meetingDate.getUTCMonth()] ?? "",
      title: meeting.title,
      location: meeting.location ?? undefined,
      timeLabel: formatTime(meeting.meetingDate, args.fmtCfg),
      eventType: "MEETING" as const,
    })),
  ]
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .slice(0, 5);

  const newsItems: CommandCenterNewsItem[] = dashboardNewsArticles.map((article) => ({
    key: `news-${article.id}`,
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    heroImageUrl: resolveNewsHeroImageUrl({
      heroMediaUrl: article.heroMedia?.url,
      imageUrl: article.imageUrl,
    }),
    heroImageAlt: article.heroMedia?.altText ?? article.title,
    publishedAtLabel: article.publishedAt
      ? formatDate(article.publishedAt, args.fmtCfg)
      : "",
    href: `/dashboard/website/news/${article.id}/edit`,
  }));

  const activitySources: ActivitySourceItem[] = [
    ...recentNews.map((item) => ({
      key: `news-${item.id}`,
      title: item.title,
      subtitle: item.authorName ? `von ${item.authorName}` : "Newsartikel",
      date: item.updatedAt,
      kind: "news" as const,
    })),
    ...recentRegistrations.map((item) => ({
      key: `reg-${item.id}`,
      title: `Neue Anmeldung: ${item.firstName} ${item.lastName}`,
      subtitle: item.type === "PROBETRAINING" ? "Probetraining" : "Spieleranmeldung",
      date: item.createdAt,
      kind: "registration" as const,
    })),
    ...recentEvents.map((item) => ({
      key: `event-${item.id}`,
      title: `${item.title} aktualisiert`,
      subtitle: getEventTypeLabel(item.type),
      date: item.updatedAt,
      kind: "event" as const,
    })),
    ...meetingSummary.recentMeetings.map((item) => ({
      key: `meeting-${item.id}`,
      title: `Meeting "${item.title}" erstellt`,
      subtitle: "Neues Meeting geplant",
      date: item.createdAt,
      kind: "meeting" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return {
    kpis: buildCommandCenterKpis({
      teamCount,
      activePersonCount,
      todayEventCount,
      openRegistrationCount,
      canSeeRegistrations,
    }),
    todayItems,
    attentionItems: buildAttentionItems({
      newsInReviewCount,
      openRegistrationCount,
      scheduledNewsCount,
      overdueActionCount: operativeCounts.overdueActionCount,
      canSeeNews,
      canSeeRegistrations,
      canSeeMeetings,
    }),
    upcomingItems,
    activitySources,
    newsItems,
    heroBackgroundImageUrl: null,
  };
}
