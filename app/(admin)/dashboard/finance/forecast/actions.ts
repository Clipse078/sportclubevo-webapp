"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { financeErrorMessage } from "@/lib/finance/errors";
import type { ForecastCreationMode } from "@/lib/finance/forecast/forecast-contract";
import {
  createForecastForYear,
  upsertForecastLine,
} from "@/lib/finance/services/finance-forecast-service";
import { generateFinanceYearProjection } from "@/lib/finance/services/finance-projection-generation-service";
import { adoptProjectionForYear } from "@/lib/finance/services/finance-projection-adoption-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";

export type FinanceForecastActionResult = { ok: true } | { ok: false; error: string };

async function forecastCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function mapResult(fn: () => Promise<unknown>): Promise<FinanceForecastActionResult> {
  return fn()
    .then(() => {
      revalidatePath("/dashboard/finance/forecast");
      revalidatePath("/dashboard/finance");
      return { ok: true as const };
    })
    .catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    }));
}

export async function createForecastAction(input: {
  financeYearId: string;
  mode: ForecastCreationMode;
}): Promise<FinanceForecastActionResult> {
  const ctx = await forecastCtx();
  return mapResult(() => createForecastForYear(prisma, ctx, input));
}

export async function saveForecastLineAction(input: {
  forecastVersionId: string;
  financialAccountId: string;
  amountMinor: number;
}): Promise<FinanceForecastActionResult> {
  const ctx = await forecastCtx();
  return mapResult(() => upsertForecastLine(prisma, ctx, input));
}

export async function generateProjectionAction(input: {
  financeYearId: string;
}): Promise<FinanceForecastActionResult> {
  const ctx = await forecastCtx();
  return mapResult(() =>
    generateFinanceYearProjection(prisma, ctx, {
      financeYearId: input.financeYearId,
    }),
  );
}

export async function adoptProjectionAction(input: {
  financeYearId: string;
  expectedSourceForecastVersionId: string;
  expectedProjectionVersionId: string;
}): Promise<FinanceForecastActionResult> {
  const ctx = await forecastCtx();
  return mapResult(() =>
    adoptProjectionForYear(prisma, ctx, {
      financeYearId: input.financeYearId,
      expectedSourceForecastVersionId: input.expectedSourceForecastVersionId,
      expectedProjectionVersionId: input.expectedProjectionVersionId,
    }),
  );
}
