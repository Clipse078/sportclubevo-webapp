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

export type FinancePublicationSummaryReadModel = {
  availability: "AVAILABLE" | "RESTRICTED" | "EMPTY";
  canPublish: boolean;
  publications: readonly {
    publicationId: string;
    financeYearId: string;
    title: string;
    currentVersionNumber: number | null;
    versions: readonly {
      versionNumber: number;
      lifecycleStatus: string;
      publishedAt: string | null;
    }[];
  }[];
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
      versions: { orderBy: { versionNumber: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    availability: rows.length === 0 ? "EMPTY" : "AVAILABLE",
    canPublish: canPublishFinancialReports(ctx),
    publications: rows.map((row) => ({
      publicationId: row.id,
      financeYearId: row.financeYearId,
      title: row.title,
      currentVersionNumber:
        row.versions.find((v) => v.lifecycleStatus === "PUBLISHED")?.versionNumber ??
        row.versions[0]?.versionNumber ??
        null,
      versions: row.versions.map((v) => ({
        versionNumber: v.versionNumber,
        lifecycleStatus: v.lifecycleStatus,
        publishedAt: v.publishedAt?.toISOString() ?? null,
      })),
    })),
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
