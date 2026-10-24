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
import {
  formalizeCurrentForecast,
  previewFormalCurrentForecast,
} from "@/lib/finance/services/finance-forecast-formal-reforecast-service";
import type {
  FormalizeCurrentForecastResult,
  FormalReforecastOutcome,
  FormalReforecastPreviewResult,
} from "@/lib/finance/forecast/formal-reforecast-contract";
import { mapFormalReforecastDomainError } from "@/lib/finance/forecast/formal-reforecast-outcome-mapping";
import type {
  CurrentForecastVsApprovedBudgetResult,
  CurrentForecastVsPreviousResult,
  FinanceForecastHistoryReadModel,
  FinanceForecastVersionComparison,
} from "@/lib/finance/forecast/forecast-history-read-model";
import {
  compareFinanceForecastVersions,
  getCurrentForecastVsApprovedBudget,
  getCurrentForecastVsPrevious,
  loadFinanceForecastHistory,
} from "@/lib/finance/services/finance-forecast-history-query-service";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";

export type FinanceForecastActionResult =
  | { ok: true; targetForecastVersionId?: string; targetVersionNumber?: number }
  | { ok: false; error: string };

export type FormalReforecastActionResult =
  | { ok: true; outcome: "SUCCESS"; result: FormalizeCurrentForecastResult }
  | { ok: false; outcome: Exclude<FormalReforecastOutcome, "SUCCESS">; error: string };

async function forecastCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function revalidateFinanceForecastRoutes() {
  revalidatePath("/dashboard/finance/forecast", "layout");
  revalidatePath("/dashboard/finance/forecast");
  revalidatePath("/dashboard/finance");
}

function mapResult(fn: () => Promise<unknown>): Promise<FinanceForecastActionResult> {
  return fn()
    .then(() => {
      revalidateFinanceForecastRoutes();
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

export async function previewFormalReforecastAction(input: {
  financeYearId: string;
  asOfDate?: string;
  actualsThroughDate?: string | null;
  revisionLabel?: string | null;
  revisionReason?: string | null;
  revisionContext?: string | null;
}): Promise<
  | { ok: true; preview: FormalReforecastPreviewResult }
  | { ok: false; outcome: FormalReforecastOutcome; error: string }
> {
  const ctx = await forecastCtx();
  try {
    const preview = await previewFormalCurrentForecast(prisma, ctx, input);
    return { ok: true, preview };
  } catch (error: unknown) {
    const outcome = mapFormalReforecastDomainError(error);
    return {
      ok: false,
      outcome: outcome === "SUCCESS" ? "UNEXPECTED_ERROR" : outcome,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function formalizeCurrentForecastAction(input: {
  financeYearId: string;
  expectedCurrentForecastVersionId: string;
  asOfDate: string;
  actualsThroughDate?: string | null;
  revisionLabel?: string | null;
  revisionReason?: string | null;
  revisionContext?: string | null;
}): Promise<FormalReforecastActionResult> {
  const ctx = await forecastCtx();
  try {
    const result = await formalizeCurrentForecast(prisma, ctx, input);
    revalidateFinanceForecastRoutes();
    return { ok: true, outcome: "SUCCESS", result };
  } catch (error: unknown) {
    const outcome = mapFormalReforecastDomainError(error);
    return {
      ok: false,
      outcome: outcome === "SUCCESS" ? "UNEXPECTED_ERROR" : outcome,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function loadFinanceForecastHistoryAction(input: {
  financeYearId: string;
}): Promise<
  | { ok: true; history: FinanceForecastHistoryReadModel }
  | { ok: false; error: string }
  | { ok: true; history: null }
> {
  const ctx = await forecastCtx();
  try {
    const history = await loadFinanceForecastHistory(prisma, ctx, input.financeYearId);
    return { ok: true, history };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function compareFinanceForecastVersionsAction(input: {
  financeYearId: string;
  baseVersionId: string;
  comparisonVersionId: string;
}): Promise<
  | { ok: true; comparison: FinanceForecastVersionComparison }
  | { ok: false; error: string }
> {
  const ctx = await forecastCtx();
  try {
    const comparison = await compareFinanceForecastVersions(prisma, ctx, input);
    return { ok: true, comparison };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function loadCurrentForecastVsPreviousAction(input: {
  financeYearId: string;
}): Promise<
  | { ok: true; result: CurrentForecastVsPreviousResult }
  | { ok: false; error: string }
> {
  const ctx = await forecastCtx();
  try {
    const result = await getCurrentForecastVsPrevious(prisma, ctx, input.financeYearId);
    return { ok: true, result };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function loadCurrentForecastVsApprovedBudgetAction(input: {
  financeYearId: string;
}): Promise<
  | { ok: true; result: CurrentForecastVsApprovedBudgetResult }
  | { ok: false; error: string }
> {
  const ctx = await forecastCtx();
  try {
    const result = await getCurrentForecastVsApprovedBudget(prisma, ctx, input.financeYearId);
    return { ok: true, result };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

export async function adoptProjectionAction(input: {
  financeYearId: string;
  expectedSourceForecastVersionId: string;
  expectedProjectionVersionId: string;
}): Promise<FinanceForecastActionResult> {
  const ctx = await forecastCtx();
  return adoptProjectionForYear(prisma, ctx, {
    financeYearId: input.financeYearId,
    expectedSourceForecastVersionId: input.expectedSourceForecastVersionId,
    expectedProjectionVersionId: input.expectedProjectionVersionId,
  })
    .then((result) => {
      revalidateFinanceForecastRoutes();
      return {
        ok: true as const,
        targetForecastVersionId: result.targetForecastVersionId,
        targetVersionNumber: result.targetVersionNumber,
      };
    })
    .catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    }));
}
