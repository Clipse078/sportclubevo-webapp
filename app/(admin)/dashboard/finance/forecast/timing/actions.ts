"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { financeErrorMessage } from "@/lib/finance/errors";
import type { ExpectedFinancialEventTimingPrecisionPersisted } from "@/lib/finance/forecast/expected-financial-event-persistence-validation";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import {
  createFinanceExpectedFinancialEvent,
  deleteFinanceExpectedFinancialEvent,
  updateFinanceExpectedFinancialEvent,
} from "@/lib/finance/services/finance-expected-financial-event-service";
import { loadExpectedFinancialTimingReconciliation } from "@/lib/finance/services/finance-expected-financial-timing-reconciliation-service";

export type FinanceExpectedEventActionResult =
  | { ok: true; eventId?: string }
  | { ok: false; errorCode?: string; error: string };

async function timingCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function revalidateForecastTimingRoutes(financeYearId?: string) {
  revalidatePath("/dashboard/finance/forecast", "layout");
  revalidatePath("/dashboard/finance/forecast/timing");
  if (financeYearId) {
    revalidatePath(`/dashboard/finance/forecast/timing?yearId=${financeYearId}`);
  }
}

function mapExpectedEventError(error: unknown): FinanceExpectedEventActionResult {
  if (error instanceof FinanceDomainError) {
    return { ok: false, errorCode: error.code, error: error.message };
  }
  return { ok: false, error: financeErrorMessage(error) };
}

export async function createFinanceExpectedEventAction(input: {
  financeYearId: string;
  financialAccountId: string;
  expectedAmountMinor: number;
  timingPrecision: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
  description?: string | null;
}): Promise<FinanceExpectedEventActionResult> {
  try {
    const ctx = await timingCtx();
    const created = await createFinanceExpectedFinancialEvent(prisma, ctx, input);
    revalidateForecastTimingRoutes(input.financeYearId);
    return { ok: true, eventId: created.id };
  } catch (error) {
    return mapExpectedEventError(error);
  }
}

export async function updateFinanceExpectedEventAction(input: {
  eventId: string;
  financeYearId: string;
  expectedAmountMinor?: number;
  timingPrecision?: ExpectedFinancialEventTimingPrecisionPersisted;
  expectedDateIso?: string | null;
  expectedMonthStartIso?: string | null;
  rangeStartDateIso?: string | null;
  rangeEndDateIso?: string | null;
  description?: string | null;
  expectedUpdatedAt: string;
}): Promise<FinanceExpectedEventActionResult> {
  try {
    const ctx = await timingCtx();
    const updated = await updateFinanceExpectedFinancialEvent(prisma, ctx, input.eventId, {
      expectedAmountMinor: input.expectedAmountMinor,
      timingPrecision: input.timingPrecision,
      expectedDateIso: input.expectedDateIso,
      expectedMonthStartIso: input.expectedMonthStartIso,
      rangeStartDateIso: input.rangeStartDateIso,
      rangeEndDateIso: input.rangeEndDateIso,
      description: input.description,
      expectedUpdatedAt: input.expectedUpdatedAt,
    });
    revalidateForecastTimingRoutes(input.financeYearId);
    return { ok: true, eventId: updated.id };
  } catch (error) {
    return mapExpectedEventError(error);
  }
}

export async function deleteFinanceExpectedEventAction(input: {
  eventId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
}): Promise<FinanceExpectedEventActionResult> {
  try {
    const ctx = await timingCtx();
    await deleteFinanceExpectedFinancialEvent(
      prisma,
      ctx,
      input.eventId,
      input.expectedUpdatedAt,
    );
    revalidateForecastTimingRoutes(input.financeYearId);
    return { ok: true };
  } catch (error) {
    return mapExpectedEventError(error);
  }
}

export type AccountTimingContextResult =
  | {
      ok: true;
      unscheduledRemainderMinor: number | null;
      overallocatedAmountMinor: number | null;
      remainingFutureExpectationMinor: number | null;
    }
  | { ok: false; error: string };

export async function loadAccountTimingContextAction(input: {
  financeYearId: string;
  financialAccountId: string;
  actualsThroughDateIso: string;
}): Promise<AccountTimingContextResult> {
  try {
    const ctx = await timingCtx();
    const reconciliation = await loadExpectedFinancialTimingReconciliation(prisma, ctx, {
      financeYearId: input.financeYearId,
      financialAccountId: input.financialAccountId,
      actualsThroughDateIso: input.actualsThroughDateIso,
    });
    return {
      ok: true,
      unscheduledRemainderMinor: reconciliation.unscheduledRemainderMinor,
      overallocatedAmountMinor: reconciliation.overallocatedAmountMinor,
      remainingFutureExpectationMinor: reconciliation.remainingFutureExpectationMinor,
    };
  } catch (error) {
    return { ok: false, error: financeErrorMessage(error) };
  }
}
