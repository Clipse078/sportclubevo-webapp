"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError, financeErrorMessage } from "@/lib/finance/errors";
import {
  createFinanceActualEntry,
  deleteFinanceActualEntry,
  updateFinanceActualEntry,
} from "@/lib/finance/services/finance-actual-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";

export type FinanceActualActionResult = { ok: true } | { ok: false; error: string };

async function actualCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function mapResult(fn: () => Promise<unknown>): Promise<FinanceActualActionResult> {
  return fn()
    .then(() => {
      revalidatePath("/dashboard/finance/actuals");
      return { ok: true as const };
    })
    .catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    }));
}

export async function createActualEntryAction(input: {
  financeYearId: string;
  financialAccountId: string;
  effectiveDate: string;
  amountMinor: number;
  currency: string;
  description?: string | null;
}): Promise<FinanceActualActionResult> {
  const ctx = await actualCtx();
  return mapResult(() =>
    createFinanceActualEntry(prisma, ctx, {
      ...input,
      effectiveDate: input.effectiveDate,
    }),
  );
}

export async function updateActualEntryAction(input: {
  entryId: string;
  effectiveDate?: string;
  amountMinor?: number;
  description?: string | null;
}): Promise<FinanceActualActionResult> {
  const ctx = await actualCtx();
  const { entryId, ...rest } = input;
  return mapResult(() =>
    updateFinanceActualEntry(prisma, ctx, entryId, {
      ...rest,
      effectiveDate: rest.effectiveDate,
    }),
  );
}

export async function deleteActualEntryAction(entryId: string): Promise<FinanceActualActionResult> {
  const ctx = await actualCtx();
  return mapResult(() => deleteFinanceActualEntry(prisma, ctx, entryId));
}
