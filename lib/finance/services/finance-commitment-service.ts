import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assertEffectiveDateWithinFinanceYear } from "@/lib/finance/actual/finance-year-membership";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import { assertSameTenant, isIso4217Currency } from "@/lib/finance/tenant-scope";
import {
  assertFinanceCommitmentDeletable,
  assertFinanceCommitmentEditable,
} from "@/lib/finance/commitment/finance-commitment-edit-policy";
import { generateFinanceEconomicObligationKey } from "@/lib/finance/commitment/finance-economic-obligation-key";
import {
  assertFinanceCommitmentLifecycleTransition,
  assertFinanceCommitmentMayBecomeActive,
} from "@/lib/finance/commitment/finance-commitment-lifecycle";
import {
  canApproveFinanceCommitments,
  canManageFinanceCommitments,
  canSubmitFinanceCommitments,
  requireFinanceCommitmentFoundationView,
} from "@/lib/finance/commitment/finance-commitment-authorization";
import type { FinanceCommitmentApprovalDecisionKind } from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import { FINANCE_COMMITMENT_PERSISTENCE_MODEL } from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import { auditFinanceCommitmentLifecycle } from "@/lib/finance/audit/finance-commitment-audit";

type Db = Pick<
  PrismaClient,
  | "financeCommitment"
  | "financeYear"
  | "financialAccount"
  | "financeCostCenter"
  | "financeEconomicEvidenceLink"
  | "financeCommitmentApprovalDecision"
  | "auditLog"
  | "$transaction"
>;

function parseDateOnly(value: Date | string, field: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new FinanceDomainError(
        "FINANCE_COMMITMENT_VALIDATION",
        `Invalid ${field}.`,
        400,
      );
    }
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      `Invalid ${field}.`,
      400,
    );
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      `Invalid ${field}.`,
      400,
    );
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function assertPositiveCommitmentAmount(amountMinor: number): void {
  assertSafeAmountMinor(amountMinor);
  if (amountMinor <= 0) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Commitment amount must be greater than zero.",
      400,
    );
  }
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!isIso4217Currency(normalized)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Unsupported currency code.",
      400,
    );
  }
  return normalized;
}

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getCommitmentForTenantOrThrow(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  const row = await db.financeCommitment.findFirst({
    where: { id: commitmentId, tenantId: ctx.tenantId },
  });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Commitment not found.", 404);
  }
  return row;
}

async function validateOptionalAccount(
  db: Db,
  ctx: FinanceAuthContext,
  financialAccountId: string | null | undefined,
) {
  if (!financialAccountId) return;
  const account = await db.financialAccount.findUnique({ where: { id: financialAccountId } });
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
}

async function validateOptionalCostCenter(
  db: Db,
  ctx: FinanceAuthContext,
  costCenterId: string | null | undefined,
) {
  if (!costCenterId) return;
  const center = await db.financeCostCenter.findUnique({ where: { id: costCenterId } });
  if (!center) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Cost center not found.", 404);
  }
  assertSameTenant(center.tenantId, ctx.tenantId, "Cost center");
}

export type CreateFinanceCommitmentInput = {
  financeYearId: string;
  title: string;
  amountMinor: number;
  currency: string;
  commitmentDate: Date | string;
  description?: string | null;
  externalReference?: string | null;
  financialAccountId?: string | null;
  costCenterId?: string | null;
  partyName?: string | null;
  partyReference?: string | null;
  expectedEvidenceDate?: Date | string | null;
  expectedPaymentDate?: Date | string | null;
  responsibleUserId?: string | null;
};

export type UpdateFinanceCommitmentInput = {
  title?: string;
  amountMinor?: number;
  currency?: string;
  commitmentDate?: Date | string;
  description?: string | null;
  externalReference?: string | null;
  financialAccountId?: string | null;
  costCenterId?: string | null;
  partyName?: string | null;
  partyReference?: string | null;
  expectedEvidenceDate?: Date | string | null;
  expectedPaymentDate?: Date | string | null;
  responsibleUserId?: string | null;
  /** Guard against accidental obligation key mutation — must match persisted value. */
  economicObligationKey?: never;
};

function trimTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Title is required.",
      400,
    );
  }
  if (trimmed.length > 240) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Title is too long.",
      400,
    );
  }
  return trimmed;
}

export async function createFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  input: CreateFinanceCommitmentInput,
) {
  if (!canManageFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const year = await getFinanceYearOrThrow(db, ctx, input.financeYearId);
  const title = trimTitle(input.title);
  assertPositiveCommitmentAmount(input.amountMinor);
  const currency = normalizeCurrency(input.currency);
  const commitmentDate = parseDateOnly(input.commitmentDate, "commitment date");
  assertEffectiveDateWithinFinanceYear(commitmentDate, year);

  await validateOptionalAccount(db, ctx, input.financialAccountId);
  await validateOptionalCostCenter(db, ctx, input.costCenterId);

  const economicObligationKey = generateFinanceEconomicObligationKey(ctx.tenantId);

  const expectedEvidenceDate = input.expectedEvidenceDate
    ? parseDateOnly(input.expectedEvidenceDate, "expected evidence date")
    : null;
  const expectedPaymentDate = input.expectedPaymentDate
    ? parseDateOnly(input.expectedPaymentDate, "expected payment date")
    : null;

  const commitment = await db.financeCommitment.create({
    data: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      economicObligationKey,
      lifecycleStatus: "DRAFT",
      approvalStatus: "NOT_REQUIRED",
      title,
      description: input.description?.trim() || null,
      externalReference: input.externalReference?.trim() || null,
      amountMinor: input.amountMinor,
      currency,
      financialAccountId: input.financialAccountId ?? null,
      costCenterId: input.costCenterId ?? null,
      partyName: input.partyName?.trim() || null,
      partyReference: input.partyReference?.trim() || null,
      commitmentDate,
      expectedEvidenceDate,
      expectedPaymentDate,
      responsibleUserId: input.responsibleUserId ?? null,
      requestedByUserId: ctx.userId,
      createdByUserId: ctx.userId,
      updatedByUserId: ctx.userId,
    },
  });

  await db.financeEconomicEvidenceLink.create({
    data: {
      tenantId: ctx.tenantId,
      economicObligationKey,
      evidenceKind: "COMMITMENT",
      evidenceRefType: FINANCE_COMMITMENT_PERSISTENCE_MODEL.commitment,
      evidenceRefId: commitment.id,
      amountMinorSnapshot: input.amountMinor,
      linkedByUserId: ctx.userId,
    },
  });

  await auditFinanceCommitmentLifecycle(db, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    commitmentId: commitment.id,
    action: "COMMITMENT_CREATED",
    metadataJson: {
      lifecycleStatus: commitment.lifecycleStatus,
      approvalStatus: commitment.approvalStatus,
    },
  });

  return commitment;
}

export async function updateFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
  input: UpdateFinanceCommitmentInput,
) {
  if (!canManageFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  assertFinanceCommitmentEditable(existing);

  if ("economicObligationKey" in input && input.economicObligationKey !== undefined) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_IMMUTABLE_OBLIGATION",
      "Economic obligation identity cannot be changed.",
      409,
    );
  }

  const year = await getFinanceYearOrThrow(db, ctx, existing.financeYearId);

  const nextTitle = input.title !== undefined ? trimTitle(input.title) : existing.title;
  const nextAmount =
    input.amountMinor !== undefined ? input.amountMinor : existing.amountMinor;
  if (input.amountMinor !== undefined) {
    assertPositiveCommitmentAmount(nextAmount);
  }
  const nextCurrency =
    input.currency !== undefined ? normalizeCurrency(input.currency) : existing.currency;
  const nextCommitmentDate =
    input.commitmentDate !== undefined
      ? parseDateOnly(input.commitmentDate, "commitment date")
      : existing.commitmentDate;
  assertEffectiveDateWithinFinanceYear(nextCommitmentDate, year);

  if (input.financialAccountId !== undefined) {
    await validateOptionalAccount(db, ctx, input.financialAccountId);
  }
  if (input.costCenterId !== undefined) {
    await validateOptionalCostCenter(db, ctx, input.costCenterId);
  }

  const updated = await db.financeCommitment.update({
    where: { id: existing.id },
    data: {
      title: nextTitle,
      amountMinor: nextAmount,
      currency: nextCurrency,
      commitmentDate: nextCommitmentDate,
      description:
        input.description !== undefined ? input.description?.trim() || null : existing.description,
      externalReference:
        input.externalReference !== undefined
          ? input.externalReference?.trim() || null
          : existing.externalReference,
      financialAccountId:
        input.financialAccountId !== undefined
          ? input.financialAccountId
          : existing.financialAccountId,
      costCenterId:
        input.costCenterId !== undefined ? input.costCenterId : existing.costCenterId,
      partyName:
        input.partyName !== undefined ? input.partyName?.trim() || null : existing.partyName,
      partyReference:
        input.partyReference !== undefined
          ? input.partyReference?.trim() || null
          : existing.partyReference,
      expectedEvidenceDate:
        input.expectedEvidenceDate !== undefined
          ? input.expectedEvidenceDate
            ? parseDateOnly(input.expectedEvidenceDate, "expected evidence date")
            : null
          : existing.expectedEvidenceDate,
      expectedPaymentDate:
        input.expectedPaymentDate !== undefined
          ? input.expectedPaymentDate
            ? parseDateOnly(input.expectedPaymentDate, "expected payment date")
            : null
          : existing.expectedPaymentDate,
      responsibleUserId:
        input.responsibleUserId !== undefined
          ? input.responsibleUserId
          : existing.responsibleUserId,
      updatedByUserId: ctx.userId,
    },
  });

  if (updated.economicObligationKey !== existing.economicObligationKey) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_IMMUTABLE_OBLIGATION",
      "Economic obligation identity cannot be changed.",
      409,
    );
  }

  await auditFinanceCommitmentLifecycle(db, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    commitmentId: updated.id,
    action: "COMMITMENT_UPDATED",
  });

  return updated;
}

function assertSubmitReady(commitment: {
  title: string;
  amountMinor: number;
  currency: string;
  commitmentDate: Date;
  financeYearId: string;
}): void {
  trimTitle(commitment.title);
  assertPositiveCommitmentAmount(commitment.amountMinor);
  normalizeCurrency(commitment.currency);
  if (!commitment.financeYearId) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Financial year is required before submission.",
      400,
    );
  }
}

/**
 * FIN-07B v1: every submission enters organisational review (PENDING).
 * Activation after approval is FIN-07C; service helper below supports domain tests only.
 */
export async function submitFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  if (!canSubmitFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  assertFinanceCommitmentLifecycleTransition(existing.lifecycleStatus, "SUBMITTED");
  assertSubmitReady(existing);

  const updated = await db.financeCommitment.update({
    where: { id: existing.id },
    data: {
      lifecycleStatus: "SUBMITTED",
      approvalStatus: "PENDING",
      submittedAt: new Date(),
      updatedByUserId: ctx.userId,
    },
  });

  await auditFinanceCommitmentLifecycle(db, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    commitmentId: updated.id,
    action: "COMMITMENT_SUBMITTED",
    metadataJson: { approvalStatus: updated.approvalStatus },
  });

  return updated;
}

function normalizeApprovalDecisionComment(
  decision: FinanceCommitmentApprovalDecisionKind,
  comment: string | null | undefined,
): string | null {
  const trimmed = comment?.trim() ?? "";
  if (!trimmed) {
    if (decision === "REJECTED") {
      throw new FinanceDomainError(
        "FINANCE_COMMITMENT_VALIDATION",
        "A short rejection reason is required.",
        400,
      );
    }
    return null;
  }
  if (trimmed.length < 3 && decision === "REJECTED") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Rejection reason is too short.",
      400,
    );
  }
  if (trimmed.length > 500) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Decision comment is too long.",
      400,
    );
  }
  return trimmed;
}

type ApprovalDecisionDb = Pick<
  PrismaClient,
  "financeCommitment" | "financeCommitmentApprovalDecision" | "auditLog"
>;

async function applyFinanceCommitmentApprovalDecision(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
  decision: FinanceCommitmentApprovalDecisionKind,
  comment: string | null | undefined,
) {
  if (!canApproveFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  if (existing.lifecycleStatus !== "SUBMITTED") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_INVALID_STATE",
      "Only submitted commitments can receive an approval decision.",
      409,
    );
  }
  if (existing.approvalStatus !== "PENDING") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_APPROVAL_ALREADY_DECIDED",
      "This commitment no longer awaits an approval decision.",
      409,
    );
  }

  const normalizedComment = normalizeApprovalDecisionComment(decision, comment);
  const decidedAt = new Date();
  const nextApprovalStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";

  const runDecision = async (tx: ApprovalDecisionDb) => {
    const locked = await tx.financeCommitment.updateMany({
      where: {
        id: existing.id,
        tenantId: ctx.tenantId,
        lifecycleStatus: "SUBMITTED",
        approvalStatus: "PENDING",
      },
      data: {
        approvalStatus: nextApprovalStatus,
        approvalDecidedAt: decidedAt,
        approvalDecidedByUserId: ctx.userId,
        updatedByUserId: ctx.userId,
      },
    });
    if (locked.count !== 1) {
      throw new FinanceDomainError(
        "FINANCE_COMMITMENT_APPROVAL_ALREADY_DECIDED",
        "This commitment no longer awaits an approval decision.",
        409,
      );
    }

    await tx.financeCommitmentApprovalDecision.create({
      data: {
        tenantId: ctx.tenantId,
        commitmentId: existing.id,
        decision,
        comment: normalizedComment,
        decidedByUserId: ctx.userId,
        decidedAt,
      },
    });

    const updated = await tx.financeCommitment.findFirst({
      where: { id: existing.id, tenantId: ctx.tenantId },
    });
    if (!updated) {
      throw new FinanceDomainError("FINANCE_NOT_FOUND", "Commitment not found.", 404);
    }

    await auditFinanceCommitmentLifecycle(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      commitmentId: updated.id,
      action: decision === "APPROVED" ? "COMMITMENT_APPROVED" : "COMMITMENT_REJECTED",
      metadataJson: normalizedComment ? { hasComment: true } : undefined,
    });

    return updated;
  };

  if (typeof db.$transaction === "function") {
    return db.$transaction((tx: ApprovalDecisionDb) => runDecision(tx));
  }
  return runDecision(db);
}

export async function approveFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
  input?: { comment?: string | null },
) {
  return applyFinanceCommitmentApprovalDecision(
    db,
    ctx,
    commitmentId,
    "APPROVED",
    input?.comment,
  );
}

export async function rejectFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
  input: { comment: string },
) {
  return applyFinanceCommitmentApprovalDecision(
    db,
    ctx,
    commitmentId,
    "REJECTED",
    input.comment,
  );
}

/** @deprecated Use approveFinanceCommitment — retained for FIN-07B tests. */
export async function approveFinanceCommitmentForDomain(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  return approveFinanceCommitment(db, ctx, commitmentId);
}

/** Domain-only activation after approval — UI inbox deferred to FIN-07C. */
export async function activateFinanceCommitmentAfterApproval(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  requireFinanceCommitmentFoundationView(ctx);
  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  assertFinanceCommitmentLifecycleTransition(existing.lifecycleStatus, "ACTIVE");
  assertFinanceCommitmentMayBecomeActive(existing);

  return db.financeCommitment.update({
    where: { id: existing.id },
    data: {
      lifecycleStatus: "ACTIVE",
      updatedByUserId: ctx.userId,
    },
  });
}

export async function cancelFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  if (!canManageFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  assertFinanceCommitmentLifecycleTransition(existing.lifecycleStatus, "CANCELLED");

  const updated = await db.financeCommitment.update({
    where: { id: existing.id },
    data: {
      lifecycleStatus: "CANCELLED",
      cancelledAt: new Date(),
      updatedByUserId: ctx.userId,
    },
  });

  await auditFinanceCommitmentLifecycle(db, {
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    commitmentId: updated.id,
    action: "COMMITMENT_CANCELLED",
  });

  return updated;
}

export async function deleteDraftFinanceCommitment(
  db: Db,
  ctx: FinanceAuthContext,
  commitmentId: string,
) {
  if (!canManageFinanceCommitments(ctx)) {
    throw new FinanceDomainError("FINANCE_FORBIDDEN", "Insufficient permission.", 403);
  }

  const existing = await getCommitmentForTenantOrThrow(db, ctx, commitmentId);
  assertFinanceCommitmentDeletable(existing);

  await db.financeEconomicEvidenceLink.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      evidenceRefType: FINANCE_COMMITMENT_PERSISTENCE_MODEL.commitment,
      evidenceRefId: existing.id,
    },
  });

  await db.financeCommitment.delete({ where: { id: existing.id } });
}
