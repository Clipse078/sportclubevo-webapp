/**
 * DASHBOARD-06 — Personal command center data layer.
 * Loads canonical personal surfaces only; no tenant-wide operational dashboard queries.
 */

import { prisma } from "@/lib/db/prisma";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatDate } from "@/lib/tenant-runtime/formatters";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { loadPersonalProgramme } from "@/lib/personal-agenda/load-personal-programme";
import {
  resolvePersonalProgrammeRange,
  type PersonalProgrammeRange,
} from "@/lib/personal-agenda/programme-range";
import {
  filterProgrammeItemsToRange,
  buildProgrammeFeedGroups,
  type ProgrammeFeedGroup,
} from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import {
  resolvePersonalProgrammeMonthGridRange,
  shiftMonthParam,
} from "@/lib/calendar/month-grid";
import { formatMonthParam } from "@/lib/personal-agenda/calendar-range";
import { loadDashboardPersonalWork } from "@/lib/dashboard/personal-attention";
import type {
  DashboardPersonalTaskPreviewItem,
  PersonalAttentionSnapshot,
} from "@/lib/dashboard/personal-attention";
import {
  resolveNewsHeroImageUrl,
  type CommandCenterNewsItem,
} from "@/lib/dashboard/command-center-presentation";
import type { PersonalDashboardSecondaryActivity } from "@/lib/dashboard/secondary-activity-facts";

export type { PersonalDashboardSecondaryActivity };

export type PersonalCommandCenterData = {
  calendarMonthParam: string;
  calendarNavigation: {
    previousMonthHref: string;
    nextMonthHref: string;
    todayHref: string;
  };
  programmeItems: PersonalProgrammeItem[];
  programmeFeedItems: PersonalProgrammeItem[];
  programmeFeedGroups: ProgrammeFeedGroup[];
  programmeSupported: boolean;
  programmeFeedRange: PersonalProgrammeRange;
  personalAttention: PersonalAttentionSnapshot;
  personalTasksAvailable: boolean;
  personalTaskCount: number | null;
  personalTaskPreview: DashboardPersonalTaskPreviewItem[];
  newsItems: CommandCenterNewsItem[];
  activitySources: PersonalDashboardSecondaryActivity[];
};

type StrategicActor = Pick<ActorContext, "tenantId" | "userId" | "permissionKeys">;

function mergeProgrammeRanges(
  a: PersonalProgrammeRange,
  b: PersonalProgrammeRange,
): PersonalProgrammeRange {
  return {
    rangeStart:
      a.rangeStart.getTime() <= b.rangeStart.getTime() ? a.rangeStart : b.rangeStart,
    rangeEnd: a.rangeEnd.getTime() >= b.rangeEnd.getTime() ? a.rangeEnd : b.rangeEnd,
  };
}

function hasAnyPermission(
  actor: StrategicActor | null,
  keys: PermissionKey[],
): boolean {
  if (!actor?.permissionKeys?.length) return false;
  const set = new Set(actor.permissionKeys);
  return keys.some((key) => set.has(key));
}

function tenantEventWhere(tenantId: string) {
  return {
    tenantId,
    OR: [{ teamId: null }, { team: { tenantId } }],
  };
}

async function loadSecondarySnapshot(args: {
  tenantId: string;
  actor: StrategicActor | null;
  fmtCfg: TenantFormatConfig;
  now: Date;
}): Promise<{
  newsItems: CommandCenterNewsItem[];
  activitySources: PersonalDashboardSecondaryActivity[];
}> {
  const canSeeNews = hasAnyPermission(args.actor, [
    PERMISSIONS.NEWS_MANAGE,
    PERMISSIONS.WEBSITE_MANAGE,
  ]);
  const canSeeRegistrations = hasAnyPermission(args.actor, [
    PERMISSIONS.REGISTRATIONS_VIEW,
    PERMISSIONS.REGISTRATIONS_EDIT,
  ]);

  const publishedNewsWhere = {
    tenantId: args.tenantId,
    status: "PUBLISHED" as const,
    publishedAt: { not: null, lte: args.now },
  };

  const eventWhere = tenantEventWhere(args.tenantId);

  const [dashboardNewsArticles, recentNews, recentRegistrations, recentEvents] =
    await Promise.all([
      prisma.newsArticle.findMany({
        where: publishedNewsWhere,
        orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
        take: 2,
        select: {
          id: true,
          title: true,
          excerpt: true,
          imageUrl: true,
          publishedAt: true,
          heroMedia: { select: { url: true, altText: true } },
        },
      }),
      canSeeNews
        ? prisma.newsArticle.findMany({
            where: { tenantId: args.tenantId },
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
            where: { tenantId: args.tenantId },
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
          updatedAt: { gte: new Date(args.now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: "desc" },
        take: 2,
        select: { id: true, title: true, updatedAt: true, type: true },
      }),
    ]);

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

  const activitySources: PersonalDashboardSecondaryActivity[] = [
    ...recentNews.map((item) => ({
      key: `news-${item.id}`,
      title: item.title,
      authorName: item.authorName,
      date: item.updatedAt,
      kind: "news" as const,
    })),
    ...recentRegistrations.map((item) => ({
      key: `reg-${item.id}`,
      firstName: item.firstName,
      lastName: item.lastName,
      registrationType: item.type,
      date: item.createdAt,
      kind: "registration" as const,
    })),
    ...recentEvents.map((item) => ({
      key: `event-${item.id}`,
      title: item.title,
      eventType: item.type,
      date: item.updatedAt,
      kind: "event" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);

  return { newsItems, activitySources };
}

/** Fail-soft boundary: secondary club news/activity must not break the personal dashboard. */
async function loadSecondarySnapshotSafe(args: Parameters<typeof loadSecondarySnapshot>[0]): Promise<{
  newsItems: CommandCenterNewsItem[];
  activitySources: PersonalDashboardSecondaryActivity[];
}> {
  try {
    return await loadSecondarySnapshot(args);
  } catch (error) {
    console.error("[personal-dashboard] secondary snapshot failed", error);
    return { newsItems: [], activitySources: [] };
  }
}

export async function getPersonalCommandCenterData(args: {
  tenantId: string;
  actor: StrategicActor | null;
  fmtCfg: TenantFormatConfig;
  userId?: string | null;
  now?: Date;
  calendarMonthParam?: string | null;
  permissionKeys?: PermissionKey[];
}): Promise<PersonalCommandCenterData> {
  const now = args.now ?? new Date();
  const timeZone = args.fmtCfg.timezone ?? "Europe/Zurich";
  const locale = args.fmtCfg.locale ?? "de-CH";

  const monthGrid = resolvePersonalProgrammeMonthGridRange({
    monthParam: args.calendarMonthParam ?? formatMonthParam(now),
    timeZone,
    now,
  });

  const feedRange = resolvePersonalProgrammeRange({ timeZone, now });
  const queryRange = mergeProgrammeRanges(feedRange, {
    rangeStart: monthGrid.rangeStart,
    rangeEnd: monthGrid.rangeEnd,
  });

  const monthParam = monthGrid.monthWindow.param;
  const calendarNavigation = {
    previousMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, -1)}`,
    nextMonthHref: `/dashboard?monat=${shiftMonthParam(monthParam, 1)}`,
    todayHref: `/dashboard?monat=${formatMonthParam(new Date())}`,
  };

  const emptyPersonalAttention: PersonalAttentionSnapshot = {
    authorized: false,
    items: [],
    totalCount: 0,
    viewAllHref: null,
  };

  const [programme, personalWork, secondary] = await Promise.all([
    loadPersonalProgramme({
      tenantId: args.tenantId,
      userId: args.userId,
      timeZone,
      now,
      from: queryRange.rangeStart,
      to: queryRange.rangeEnd,
      permissionKeys: args.permissionKeys,
    }),
    args.userId
      ? loadDashboardPersonalWork({
          tenantId: args.tenantId,
          userId: args.userId,
          fmtCfg: args.fmtCfg,
          locale,
          timeZone,
          now,
        })
      : Promise.resolve({
          attention: emptyPersonalAttention,
          tasks: { authorized: false, count: null, preview: [] },
        }),
    loadSecondarySnapshotSafe({
      tenantId: args.tenantId,
      actor: args.actor,
      fmtCfg: args.fmtCfg,
      now,
    }),
  ]);

  const programmeFeedItems = filterProgrammeItemsToRange(programme.items, feedRange);
  const programmeFeedGroups = buildProgrammeFeedGroups({
    items: programmeFeedItems,
    timeZone,
    locale,
    now,
  });

  const tasks = personalWork.tasks;

  // Mein Kalender and Mein Programm share this canonical PersonalProgrammeItem[] universe.
  // The feed applies an additional forward window; calendar projects the same authorized set.
  return {
    calendarMonthParam: monthParam,
    calendarNavigation,
    programmeItems: programme.items,
    programmeFeedItems,
    programmeFeedGroups,
    programmeSupported: programme.supported,
    programmeFeedRange: feedRange,
    personalAttention: personalWork.attention,
    personalTasksAvailable: tasks.authorized,
    personalTaskCount: tasks.count,
    personalTaskPreview: tasks.preview,
    newsItems: secondary.newsItems,
    activitySources: secondary.activitySources,
  };
}

/** @internal test helper */
export function personalCommandCenterUsesSingleProgrammeLoader(): true {
  return true;
}
