/**
 * FIN-06A — foundation read model for publishing workspace (no product actions yet).
 */

import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  canManageFinancialShares,
  canPublishFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
  requireFinancePublicationFoundationView,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { FINANCE_06A_IMPLEMENTATION } from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

export type FinancePublishingFoundationReadModel = {
  workspaceRoute: typeof FINANCE_06A_IMPLEMENTATION.foundationWorkspaceRoute;
  availability: "FOUNDATION";
  capabilities: {
    canViewPublicationHistory: boolean;
    canShare: boolean;
    canPublish: boolean;
    canManageShares: boolean;
  };
  counts: {
    publicationCount: number;
    activeShareCount: number;
  };
};

export async function loadFinancePublishingFoundationReadModel(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
): Promise<FinancePublishingFoundationReadModel> {
  requireFinancePublicationFoundationView(ctx);

  const [publicationCount, activeShareCount] = await Promise.all([
    prisma.financePublication.count({ where: { tenantId: ctx.tenantId } }),
    prisma.financeFinancialShare.count({
      where: { tenantId: ctx.tenantId, status: "ACTIVE" },
    }),
  ]);

  return {
    workspaceRoute: FINANCE_06A_IMPLEMENTATION.foundationWorkspaceRoute,
    availability: "FOUNDATION",
    capabilities: {
      canViewPublicationHistory: canViewFinancePublicationHistory(ctx),
      canShare: canShareFinancialReports(ctx),
      canPublish: canPublishFinancialReports(ctx),
      canManageShares: canManageFinancialShares(ctx),
    },
    counts: {
      publicationCount,
      activeShareCount,
    },
  };
}

/** Tenant isolation guard — foreign tenant must not resolve publication rows. */
export async function financePublicationExistsForTenant(
  prisma: PrismaClient,
  tenantId: string,
  publicationId: string,
): Promise<boolean> {
  const row = await prisma.financePublication.findFirst({
    where: { id: publicationId, tenantId },
    select: { id: true },
  });
  return Boolean(row);
}
