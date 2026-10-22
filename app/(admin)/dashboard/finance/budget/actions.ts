"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { financeErrorMessage } from "@/lib/finance/errors";
import {
  approveBudgetVersion,
  getOrCreateDraftBudgetForYear,
  upsertBudgetLine,
} from "@/lib/finance/services/finance-budget-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";

export type FinanceBudgetActionResult = { ok: true } | { ok: false; error: string };

async function budgetCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function mapResult(fn: () => Promise<unknown>): Promise<FinanceBudgetActionResult> {
  return fn()
    .then(() => {
      revalidatePath("/dashboard/finance/budget");
      return { ok: true as const };
    })
    .catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    }));
}

export async function ensureDraftBudgetAction(
  financeYearId: string,
): Promise<FinanceBudgetActionResult> {
  const ctx = await budgetCtx();
  return mapResult(() => getOrCreateDraftBudgetForYear(prisma, ctx, financeYearId));
}

export async function saveBudgetLineAction(input: {
  budgetVersionId: string;
  financialAccountId: string;
  amountMinor: number;
}): Promise<FinanceBudgetActionResult> {
  const ctx = await budgetCtx();
  return mapResult(() => upsertBudgetLine(prisma, ctx, input));
}

export async function approveBudgetAction(
  budgetVersionId: string,
): Promise<FinanceBudgetActionResult> {
  const ctx = await budgetCtx();
  return mapResult(() => approveBudgetVersion(prisma, ctx, budgetVersionId));
}
