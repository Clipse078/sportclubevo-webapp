import type { PrismaClient } from "@prisma/client";
import { aggregateActualTotalsByAccount } from "@/lib/finance/actual/aggregate-actuals";
import { isEffectiveDateOnOrBeforeCutoff } from "@/lib/finance/actual/period-semantics";
import {
  formatFinanceCalendarDateIso,
  parseFinanceCalendarDateIso,
} from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { mapExpectedFinancialEventToReconciliationShape } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { ReconcileExpectedFinancialTimingResult } from "@/lib/finance/forecast/expected-financial-event-reconciliation-types";
import { reconcileExpectedFinancialTiming } from "@/lib/finance/forecast/reconcile-expected-financial-timing";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  | "financeYear"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeActualEntry"
  | "financeExpectedFinancialEvent"
  | "financialAccount"
>;

export type LoadExpectedFinancialTimingReconciliationInput = {
  financeYearId: string;
  financialAccountId: string;
  /**
   * Explicit actuals-through cutoff (YYYY-MM-DD). When omitted, uses the current
   * forecast version `actualsThroughDate`. Never derived from the system clock.
   */
  actualsThroughDateIso?: string;
};

export type ExpectedFinancialTimingReconciliationReadModel =
  ReconcileExpectedFinancialTimingResult & {
    financeYearId: string;
    financialAccountId: string;
    currentForecastVersionId: string | null;
    expectedEventCount: number;
  };

async function getFinanceYearOrThrow(db: Db, ctx: FinanceAuthContext, financeYearId: string) {
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");
  return year;
}

async function getAccountOrThrow(db: Db, ctx: FinanceAuthContext, financialAccountId: string) {
  const account = await db.financialAccount.findUnique({ where: { id: financialAccountId } });
  if (!account) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(account.tenantId, ctx.tenantId, "Financial account");
  return account;
}

function resolveCutoffIso(input: {
  callerIso?: string;
  forecastVersionActualsThrough: Date | null;
}): string {
  const fromVersion = input.forecastVersionActualsThrough
    ? formatFinanceCalendarDateIso(input.forecastVersionActualsThrough)
    : null;

  if (input.callerIso) {
    parseFinanceCalendarDateIso(input.callerIso);
    if (fromVersion && input.callerIso.trim() !== fromVersion) {
      throw new FinanceDomainError(
        "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF",
        "Actuals-through cutoff must match the current forecast version context.",
        400,
      );
    }
    return input.callerIso.trim();
  }

  if (!fromVersion) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_CUTOFF",
      "Actuals-through cutoff must be supplied explicitly when the current forecast version has none.",
      400,
    );
  }
  return fromVersion;
}

export async function loadExpectedFinancialTimingReconciliation(
  db: Db,
  ctx: FinanceAuthContext,
  input: LoadExpectedFinancialTimingReconciliationInput,
): Promise<ExpectedFinancialTimingReconciliationReadModel> {
  requireFinanceForecastView(ctx);
  await getFinanceYearOrThrow(db, ctx, input.financeYearId);
  await getAccountOrThrow(db, ctx, input.financialAccountId);

  const forecast = await db.financeForecast.findUnique({
    where: {
      tenantId_financeYearId: {
        tenantId: ctx.tenantId,
        financeYearId: input.financeYearId,
      },
    },
    select: { id: true, currentVersionId: true, tenantId: true },
  });

  let annualForecastAmountMinor: number | null = null;
  let currentForecastVersionId: string | null = null;
  let forecastVersionActualsThrough: Date | null = null;

  if (forecast?.currentVersionId) {
    const version = await db.financeForecastVersion.findUnique({
      where: { id: forecast.currentVersionId },
      include: {
        lines: true,
        forecast: { select: { id: true, tenantId: true } },
      },
    });
    if (version && version.forecastId === forecast.id) {
      assertSameTenant(version.forecast.tenantId, ctx.tenantId, "Forecast");
      currentForecastVersionId = version.id;
      forecastVersionActualsThrough = version.actualsThroughDate ?? null;
      const line = version.lines.find(
        (l) => l.financialAccountId === input.financialAccountId,
      );
      annualForecastAmountMinor = line ? line.amountMinor : null;
    }
  }

  const actualsThroughDateIso = resolveCutoffIso({
    callerIso: input.actualsThroughDateIso,
    forecastVersionActualsThrough,
  });
  const cutoffDate = parseFinanceCalendarDateIso(actualsThroughDateIso);

  const actualRows = await db.financeActualEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      financialAccountId: input.financialAccountId,
    },
    select: { effectiveDate: true, amountMinor: true, financialAccountId: true },
  });

  const throughCutoff = actualRows.filter((row) =>
    isEffectiveDateOnOrBeforeCutoff(row.effectiveDate, cutoffDate),
  );
  const actualTotals = aggregateActualTotalsByAccount(throughCutoff);
  const actualThroughCutoffMinor =
    actualTotals.get(input.financialAccountId) ?? 0;

  const eventRows = await db.financeExpectedFinancialEvent.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      financialAccountId: input.financialAccountId,
    },
  });

  const reconciliation = reconcileExpectedFinancialTiming({
    annualForecastAmountMinor,
    actualThroughCutoffMinor,
    actualsThroughDateIso,
    expectedEvents: eventRows.map(mapExpectedFinancialEventToReconciliationShape),
  });

  return {
    ...reconciliation,
    financeYearId: input.financeYearId,
    financialAccountId: input.financialAccountId,
    currentForecastVersionId,
    expectedEventCount: eventRows.length,
  };
}
