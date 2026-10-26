/**
 * FIN-07A — foundation read model for commitments workspace (no product actions yet).
 */

import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  canApproveFinanceCommitments,
  canManageFinanceCommitmentPolicy,
  canManageFinanceCommitments,
  canSubmitFinanceCommitments,
  canViewFinanceCommitments,
  requireFinanceCommitmentFoundationView,
} from "@/lib/finance/commitment/finance-commitment-authorization";
import { FINANCE_07A_IMPLEMENTATION } from "@/lib/finance/commitment/finance-commitment-architecture-contract";

export type FinanceCommitmentFoundationReadModel = {
  workspaceRoute: typeof FINANCE_07A_IMPLEMENTATION.foundationWorkspaceRoute;
  availability: "FOUNDATION";
  capabilities: {
    canView: boolean;
    canManage: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canManagePolicy: boolean;
  };
  counts: {
    commitmentCount: number;
    pendingApprovalCount: number;
  };
};

export async function loadFinanceCommitmentFoundationReadModel(
  prisma: PrismaClient,
  ctx: FinanceAuthContext,
): Promise<FinanceCommitmentFoundationReadModel> {
  requireFinanceCommitmentFoundationView(ctx);

  const [commitmentCount, pendingApprovalCount] = await Promise.all([
    prisma.financeCommitment.count({ where: { tenantId: ctx.tenantId } }),
    prisma.financeCommitment.count({
      where: {
        tenantId: ctx.tenantId,
        approvalStatus: "PENDING",
        lifecycleStatus: { in: ["SUBMITTED"] },
      },
    }),
  ]);

  return {
    workspaceRoute: FINANCE_07A_IMPLEMENTATION.foundationWorkspaceRoute,
    availability: "FOUNDATION",
    capabilities: {
      canView: canViewFinanceCommitments(ctx),
      canManage: canManageFinanceCommitments(ctx),
      canSubmit: canSubmitFinanceCommitments(ctx),
      canApprove: canApproveFinanceCommitments(ctx),
      canManagePolicy: canManageFinanceCommitmentPolicy(ctx),
    },
    counts: {
      commitmentCount,
      pendingApprovalCount,
    },
  };
}

/** Tenant isolation guard — foreign tenant must not resolve commitment rows. */
export async function financeCommitmentExistsForTenant(
  prisma: PrismaClient,
  tenantId: string,
  commitmentId: string,
): Promise<boolean> {
  const row = await prisma.financeCommitment.findFirst({
    where: { id: commitmentId, tenantId },
    select: { id: true },
  });
  return Boolean(row);
}
