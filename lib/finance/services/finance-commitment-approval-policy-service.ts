import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assertSameTenant, isIso4217Currency } from "@/lib/finance/tenant-scope";
import { canManageFinanceCommitmentPolicy } from "@/lib/finance/commitment/finance-commitment-authorization";
import {
  assertValidApprovalPolicyThreshold,
  normalizeFinanceCommitmentApprovalPolicySnapshot,
} from "@/lib/finance/commitment/finance-commitment-approval-policy-evaluation";
import type { FinanceCommitmentApprovalPolicySnapshot } from "@/lib/finance/commitment/finance-commitment-approval-policy-contract";
import { auditFinanceCommitmentApprovalPolicyUpdated } from "@/lib/finance/audit/finance-commitment-approval-policy-audit";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";

type Db = Pick<
  PrismaClient,
  "financeCommitmentApprovalPolicy" | "financeConfiguration" | "auditLog"
>;

export type FinanceCommitmentApprovalPolicyReadModel = FinanceCommitmentApprovalPolicySnapshot & {
  id: string | null;
  canManage: boolean;
  baseCurrency: string | null;
  persisted: boolean;
};

async function getBaseCurrency(db: Db, ctx: FinanceAuthContext): Promise<string | null> {
  const setup = await loadFinanceSetupSnapshot(db as never, ctx);
  return setup.configuration?.baseCurrency ?? null;
}

export async function loadFinanceCommitmentApprovalPolicyReadModel(
  db: Db,
  ctx: FinanceAuthContext,
): Promise<FinanceCommitmentApprovalPolicyReadModel> {
  const [row, baseCurrency] = await Promise.all([
    db.financeCommitmentApprovalPolicy.findUnique({
      where: { tenantId: ctx.tenantId },
    }),
    getBaseCurrency(db, ctx),
  ]);

  const normalized = normalizeFinanceCommitmentApprovalPolicySnapshot(
    row
      ? {
          enabled: row.enabled,
          thresholdAmountMinor: row.thresholdAmountMinor,
          thresholdCurrency: row.thresholdCurrency,
        }
      : null,
    baseCurrency,
  );

  return {
    id: row?.id ?? null,
    ...normalized,
    canManage: canManageFinanceCommitmentPolicy(ctx),
    baseCurrency,
    persisted: Boolean(row),
  };
}

export async function resolveEffectiveFinanceCommitmentApprovalPolicy(
  db: Db,
  ctx: FinanceAuthContext,
): Promise<FinanceCommitmentApprovalPolicySnapshot> {
  const model = await loadFinanceCommitmentApprovalPolicyReadModel(db, ctx);
  return {
    enabled: model.enabled,
    thresholdAmountMinor: model.thresholdAmountMinor,
    thresholdCurrency: model.thresholdCurrency,
  };
}

export type SaveFinanceCommitmentApprovalPolicyInput = {
  enabled: boolean;
  thresholdAmountMinor: number;
};

function normalizePolicyCurrency(baseCurrency: string): string {
  const normalized = baseCurrency.trim().toUpperCase();
  if (!isIso4217Currency(normalized)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Configure a valid finance base currency before saving approval policy.",
      400,
    );
  }
  return normalized;
}

export async function saveFinanceCommitmentApprovalPolicy(
  db: Db,
  ctx: FinanceAuthContext,
  input: SaveFinanceCommitmentApprovalPolicyInput,
): Promise<FinanceCommitmentApprovalPolicyReadModel> {
  if (!canManageFinanceCommitmentPolicy(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const baseCurrency = await getBaseCurrency(db, ctx);
  if (!baseCurrency) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_POLICY_VALIDATION",
      "Configure the finance base currency before saving approval policy.",
      400,
    );
  }

  assertValidApprovalPolicyThreshold(input.thresholdAmountMinor);
  const thresholdCurrency = normalizePolicyCurrency(baseCurrency);

  const existing = await db.financeCommitmentApprovalPolicy.findUnique({
    where: { tenantId: ctx.tenantId },
  });

  const after = {
    enabled: input.enabled,
    thresholdAmountMinor: input.thresholdAmountMinor,
    thresholdCurrency,
  };

  if (existing) {
    assertSameTenant(existing.tenantId, ctx.tenantId, "Approval policy");
    const before = {
      enabled: existing.enabled,
      thresholdAmountMinor: existing.thresholdAmountMinor,
      thresholdCurrency: existing.thresholdCurrency,
    };
    const updated = await db.financeCommitmentApprovalPolicy.update({
      where: { id: existing.id },
      data: {
        ...after,
        updatedByUserId: ctx.userId,
      },
    });
    await auditFinanceCommitmentApprovalPolicyUpdated(db, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      policyId: updated.id,
      before,
      after,
    });
  } else {
    const created = await db.financeCommitmentApprovalPolicy.create({
      data: {
        tenantId: ctx.tenantId,
        ...after,
        updatedByUserId: ctx.userId,
      },
    });
    await auditFinanceCommitmentApprovalPolicyUpdated(db, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      policyId: created.id,
      before: {
        enabled: normalizeFinanceCommitmentApprovalPolicySnapshot(null, baseCurrency).enabled,
        thresholdAmountMinor: normalizeFinanceCommitmentApprovalPolicySnapshot(null, baseCurrency)
          .thresholdAmountMinor,
        thresholdCurrency,
      },
      after,
    });
  }

  return loadFinanceCommitmentApprovalPolicyReadModel(db, ctx);
}
