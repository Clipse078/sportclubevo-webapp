"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveFinanceCommitmentActionMessageKey } from "@/lib/finance/commitment/finance-commitment-action-errors";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import {
  approveFinanceCommitment,
  cancelFinanceCommitment,
  createFinanceCommitment,
  deleteDraftFinanceCommitment,
  rejectFinanceCommitment,
  submitFinanceCommitment,
  updateFinanceCommitment,
} from "@/lib/finance/services/finance-commitment-service";
import { getFinanceCommitmentDetail } from "@/lib/finance/services/finance-commitment-query-service";

export type FinanceCommitmentActionResult =
  | { ok: true; commitmentId?: string }
  | { ok: false; errorCode?: string; errorKey?: string; error: string };

function revalidateCommitments(financeYearId?: string | null) {
  revalidatePath("/dashboard/finance/commitments", "layout");
  revalidatePath("/dashboard/finance/commitments/approvals", "layout");
  if (financeYearId) {
    revalidatePath(`/dashboard/finance/commitments?yearId=${financeYearId}`);
    revalidatePath(`/dashboard/finance/commitments/approvals?yearId=${financeYearId}`);
  }
}

function mapError(error: unknown): FinanceCommitmentActionResult {
  if (error instanceof FinanceDomainError) {
    return {
      ok: false,
      errorCode: error.code,
      errorKey: resolveFinanceCommitmentActionMessageKey(error.code),
      error: error.message,
    };
  }
  return { ok: false, error: "Unexpected error.", errorKey: "errors.generic" };
}

async function commitmentCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

export async function createFinanceCommitmentAction(input: {
  financeYearId: string;
  title: string;
  amountMinor: number;
  currency: string;
  commitmentDateIso: string;
  description?: string | null;
  externalReference?: string | null;
  financialAccountId?: string | null;
  partyName?: string | null;
  expectedPaymentDateIso?: string | null;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    const created = await createFinanceCommitment(prisma, ctx, {
      financeYearId: input.financeYearId,
      title: input.title,
      amountMinor: input.amountMinor,
      currency: input.currency,
      commitmentDate: input.commitmentDateIso,
      description: input.description,
      externalReference: input.externalReference,
      financialAccountId: input.financialAccountId,
      partyName: input.partyName,
      expectedPaymentDate: input.expectedPaymentDateIso,
    });
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: created.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
  title?: string;
  amountMinor?: number;
  currency?: string;
  commitmentDateIso?: string;
  description?: string | null;
  externalReference?: string | null;
  financialAccountId?: string | null;
  partyName?: string | null;
  expectedPaymentDateIso?: string | null;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await updateFinanceCommitment(prisma, ctx, input.commitmentId, {
      title: input.title,
      amountMinor: input.amountMinor,
      currency: input.currency,
      commitmentDate: input.commitmentDateIso,
      description: input.description,
      externalReference: input.externalReference,
      financialAccountId: input.financialAccountId,
      partyName: input.partyName,
      expectedPaymentDate: input.expectedPaymentDateIso,
    });
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: input.commitmentId };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await submitFinanceCommitment(prisma, ctx, input.commitmentId);
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: input.commitmentId };
  } catch (error) {
    return mapError(error);
  }
}

export async function cancelFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await cancelFinanceCommitment(prisma, ctx, input.commitmentId);
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: input.commitmentId };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteDraftFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await deleteDraftFinanceCommitment(prisma, ctx, input.commitmentId);
    revalidateCommitments(input.financeYearId);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function loadFinanceCommitmentDetailAction(commitmentId: string) {
  const ctx = await commitmentCtx();
  return getFinanceCommitmentDetail(prisma, ctx, commitmentId);
}

export async function approveFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
  comment?: string | null;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await approveFinanceCommitment(prisma, ctx, input.commitmentId, {
      comment: input.comment,
    });
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: input.commitmentId };
  } catch (error) {
    return mapError(error);
  }
}

export async function rejectFinanceCommitmentAction(input: {
  commitmentId: string;
  financeYearId: string;
  comment: string;
}): Promise<FinanceCommitmentActionResult> {
  try {
    const ctx = await commitmentCtx();
    await rejectFinanceCommitment(prisma, ctx, input.commitmentId, {
      comment: input.comment,
    });
    revalidateCommitments(input.financeYearId);
    return { ok: true, commitmentId: input.commitmentId };
  } catch (error) {
    return mapError(error);
  }
}
