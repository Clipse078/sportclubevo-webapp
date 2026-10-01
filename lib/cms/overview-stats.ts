/**
 * lib/cms/overview-stats.ts
 *
 * Server-side data loader for the CMS hub overview dashboard.
 *
 * Returns real application state so the overview reflects live content.
 * Tenant-safe: all queries are scoped to tenantId.
 */

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export type CmsOverviewStats = {
  news: {
    total: number;
    published: number;
    draft: number;
    inReview: number;
    scheduled: number;
  };
  pages: {
    total: number;
    published: number;
    draft: number;
    inReview: number;
    scheduled: number;
  };
  media: {
    total: number;
  };
  publishing: {
    pendingReview: number;
    scheduledTotal: number;
  };
  approvedDataOnly: boolean;
  websiteEnabled: boolean;
};

type StatusCountRow = {
  kind: string;
  status: string;
  cnt: bigint;
};

type CmsMetaRow = {
  media_total: bigint;
  approved_data_only: boolean;
  website_enabled: boolean;
};

function countByStatus(
  groups: { status: string; cnt: bigint }[],
  status: string,
): number {
  const match = groups.find((g) => g.status === status)?.cnt;
  return match === undefined ? 0 : Number(match);
}

type CmsOverviewCombinedRow = StatusCountRow & Partial<CmsMetaRow>;

async function loadCmsOverviewStats(tenantId: string): Promise<CmsOverviewStats> {
  const rows = await prisma.$queryRaw<CmsOverviewCombinedRow[]>`
    WITH status_counts AS (
      SELECT 'news' AS kind, status::text AS status, COUNT(*)::bigint AS cnt
      FROM "NewsArticle"
      WHERE "tenantId" = ${tenantId}
      GROUP BY status
      UNION ALL
      SELECT 'page' AS kind, status::text AS status, COUNT(*)::bigint AS cnt
      FROM "WebsitePage"
      WHERE "tenantId" = ${tenantId}
      GROUP BY status
    ),
    meta AS (
      SELECT
        (SELECT COUNT(*)::bigint FROM "MediaAsset" WHERE "tenantId" = ${tenantId}) AS media_total,
        t."approvedDataOnly" AS approved_data_only,
        t."websiteEnabled" AS website_enabled
      FROM "Tenant" t
      WHERE t.id = ${tenantId}
      LIMIT 1
    )
    SELECT sc.kind, sc.status, sc.cnt, m.media_total, m.approved_data_only, m.website_enabled
    FROM status_counts sc
    CROSS JOIN meta m
  `;

  const newsStats = rows.filter((row) => row.kind === "news");
  const pageStats = rows.filter((row) => row.kind === "page");
  const meta = rows[0];

  const newsTotal = newsStats.reduce((sum, g) => sum + Number(g.cnt), 0);
  const pagesTotal = pageStats.reduce((sum, g) => sum + Number(g.cnt), 0);

  const newsInReview = countByStatus(newsStats, "IN_REVIEW");
  const pagesInReview = countByStatus(pageStats, "IN_REVIEW");
  const newsScheduled = countByStatus(newsStats, "SCHEDULED");
  const pagesScheduled = countByStatus(pageStats, "SCHEDULED");

  return {
    news: {
      total: newsTotal,
      published: countByStatus(newsStats, "PUBLISHED"),
      draft: countByStatus(newsStats, "DRAFT"),
      inReview: newsInReview,
      scheduled: newsScheduled,
    },
    pages: {
      total: pagesTotal,
      published: countByStatus(pageStats, "PUBLISHED"),
      draft: countByStatus(pageStats, "DRAFT"),
      inReview: pagesInReview,
      scheduled: pagesScheduled,
    },
    media: {
      total: meta?.media_total === undefined ? 0 : Number(meta.media_total),
    },
    publishing: {
      pendingReview: newsInReview + pagesInReview,
      scheduledTotal: newsScheduled + pagesScheduled,
    },
    approvedDataOnly: meta?.approved_data_only ?? false,
    websiteEnabled: meta?.website_enabled ?? true,
  };
}

/** Per-request deduplication for CMS hub overview reads within one navigation. */
export const getCmsOverviewStats = cache(loadCmsOverviewStats);
