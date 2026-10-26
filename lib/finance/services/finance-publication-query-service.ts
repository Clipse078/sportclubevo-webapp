/**
 * FIN-06B — publication inspection reads (persisted snapshot only).
 */

import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { requireFinanceView } from "@/lib/finance/finance-authorization";
import {
  canPublishFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { financePublishingRestrictedState } from "@/lib/finance/publishing/finance-publishing-restricted-state";
import {
  loadFinancePublicationVersionSnapshot,
  type FinancePublicationVersionReadResult,
} from "@/lib/finance/services/finance-publication-service";
import { FINANCE_PUBLICATION_HISTORY_PAGE_SIZE } from "@/lib/finance/publishing/finance-publication-history-contract";

export type FinancePublicationVersionHistoryEntry = {
  versionNumber: number;
  lifecycleStatus: string;
  publishedAt: string | null;
};

export type FinancePublicationSummaryReadModel = {
  availability: "AVAILABLE" | "RESTRICTED" | "EMPTY";
  canPublish: boolean;
  publications: readonly {
    publicationId: string;
    financeYearId: string;
    title: string;
    currentVersionNumber: number | null;
    /** Total versions for the FY publication (history loads pages separately). */
    versionCount: number;
    /** Deprecated on page load — use {@link loadFinancePublicationVersionHistoryPage}. */
    versions: readonly FinancePublicationVersionHistoryEntry[];
  }[];
};

export type FinancePublicationVersionHistoryPage = {
  versions: readonly FinancePublicationVersionHistoryEntry[];
  hasOlder: boolean;
  nextCursorVersionNumber: number | null;
};

export async function loadFinancePublicationSummaryForYear(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<FinancePublicationSummaryReadModel> {
  requireFinanceView(ctx);

  if (!canViewFinancePublicationHistory(ctx)) {
    return {
      availability: "RESTRICTED",
      canPublish: false,
      publications: [],
    };
  }

  const rows = await prisma.financePublication.findMany({
    where: { tenantId: ctx.tenantId, financeYearId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { versionNumber: true, lifecycleStatus: true },
      },
      _count: { select: { versions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    availability: rows.length === 0 ? "EMPTY" : "AVAILABLE",
    canPublish: canPublishFinancialReports(ctx),
    publications: rows.map((row) => {
      const currentPublished = row.versions.find((v) => v.lifecycleStatus === "PUBLISHED");
      return {
        publicationId: row.id,
        financeYearId: row.financeYearId,
        title: row.title,
        currentVersionNumber:
          currentPublished?.versionNumber ?? row.versions[0]?.versionNumber ?? null,
        versionCount: row._count.versions,
        versions: [],
      };
    }),
  };
}

export async function loadFinancePublicationVersionHistoryPage(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
  input: {
    publicationId: string;
    cursorVersionNumber?: number | null;
    limit?: number;
  },
): Promise<FinancePublicationVersionHistoryPage> {
  requireFinanceView(ctx);

  if (!canViewFinancePublicationHistory(ctx)) {
    return { versions: [], hasOlder: false, nextCursorVersionNumber: null };
  }

  const limit = input.limit ?? FINANCE_PUBLICATION_HISTORY_PAGE_SIZE;

  const publication = await prisma.financePublication.findFirst({
    where: { id: input.publicationId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!publication) {
    return { versions: [], hasOlder: false, nextCursorVersionNumber: null };
  }

  const versionNumberFilter =
    input.cursorVersionNumber != null
      ? { versionNumber: { lt: input.cursorVersionNumber } }
      : {};

  const rows = await prisma.financePublicationVersion.findMany({
    where: {
      publicationId: input.publicationId,
      tenantId: ctx.tenantId,
      ...versionNumberFilter,
    },
    orderBy: { versionNumber: "desc" },
    take: limit + 1,
    select: {
      versionNumber: true,
      lifecycleStatus: true,
      publishedAt: true,
    },
  });

  const hasOlder = rows.length > limit;
  const pageRows = hasOlder ? rows.slice(0, limit) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  return {
    versions: pageRows.map((v) => ({
      versionNumber: v.versionNumber,
      lifecycleStatus: v.lifecycleStatus,
      publishedAt: v.publishedAt?.toISOString() ?? null,
    })),
    hasOlder,
    nextCursorVersionNumber: hasOlder && lastRow ? lastRow.versionNumber : null,
  };
}

export async function loadFinancePublicationVersionForTenant(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
  input: { publicationId: string; versionNumber: number },
): Promise<FinancePublicationVersionReadResult> {
  return loadFinancePublicationVersionSnapshot(prisma, ctx, input);
}

export function financePublicationRestrictedSurface() {
  return financePublishingRestrictedState("PUBLICATION");
}
