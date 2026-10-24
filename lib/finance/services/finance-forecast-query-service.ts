import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import { computeBudgetPlanningTotals } from "@/lib/finance/budget/budget-planning-totals";
import { computeForecastBudgetComparisonMetrics } from "@/lib/finance/forecast/forecast-budget-comparison";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { recommendFormalReforecastAsOfDate } from "@/lib/finance/forecast/formal-reforecast-date-recommendation";
import {
  buildForecastPlanningRows,
  type ForecastWorkspaceSnapshot,
} from "@/lib/finance/forecast/forecast-presentation";
import { buildForecastHistoryDisplayMetadata } from "@/lib/finance/forecast/forecast-revision-presentation";
import type {
  CurrentForecastVsApprovedBudgetResult,
  CurrentForecastVsPreviousResult,
  FinanceForecastHistoryReadModel,
} from "@/lib/finance/forecast/forecast-history-read-model";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  getCurrentForecastVsApprovedBudget,
  getCurrentForecastVsPrevious,
  loadFinanceForecastHistory,
} from "@/lib/finance/services/finance-forecast-history-query-service";
import { resolveBudgetSelectedYearId } from "@/lib/finance/budget/resolve-budget-selected-year";
import {
  listFinanceYearsForForecast,
  loadForecastCreationContext,
  resolveCanonicalCurrentForecastVersionByPointer,
} from "@/lib/finance/services/finance-forecast-service";
import { resolveTenantBudgetCurrency } from "@/lib/finance/services/finance-budget-service";
import { loadBudgetForYear } from "@/lib/finance/services/finance-budget-service";

type Db = Parameters<typeof loadBudgetForYear>[0] &
  Parameters<typeof loadForecastCreationContext>[0] &
  Pick<PrismaClient, "financeForecast" | "financialAccount">;

export type ForecastOverviewSummary = {
  financeYearName: string;
  currency: string | null;
  versionNumber: number;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
  resultDeltaVsBudgetMinor: number | null;
};

export async function loadCurrentForecastOverviewSummary(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<ForecastOverviewSummary | null> {
  if (!financeYearId) return null;

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    include: { financeYear: { select: { name: true } } },
  });
  if (!forecast) return null;
  const currentVersion = await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast);
  if (!currentVersion) return null;

  const currency = await resolveTenantBudgetCurrency(db, ctx);

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, canonicalSemantic: true },
  });
  const semanticByAccount = new Map(accounts.map((a) => [a.id, a.canonicalSemantic]));

  const incomeExpenseLines = currentVersion.lines.map((line) => ({
    amountMinor: line.amountMinor,
    financialAccount: {
      canonicalSemantic: semanticByAccount.get(line.financialAccountId) ?? "OTHER",
    },
  }));
  const forecastTotals = computeBudgetPlanningTotals(incomeExpenseLines);

  const budget = await loadBudgetForYear(db, ctx, financeYearId);
  const baseline =
    budget && budget.versions.length > 0
      ? resolveCurrentGovernanceBaselineVersion({
          currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
          versions: budget.versions,
        })
      : null;
  const baselineTotals = baseline
    ? computeBudgetPlanningTotals(
        baseline.lines.map((line) => ({
          amountMinor: line.amountMinor,
          financialAccount: { canonicalSemantic: line.financialAccount.canonicalSemantic },
        })),
      )
    : null;

  return {
    financeYearName: forecast.financeYear.name,
    currency,
    versionNumber: currentVersion.versionNumber,
    incomeMinor: forecastTotals.totalIncomeMinor,
    expenseMinor: forecastTotals.totalExpenseMinor,
    resultMinor: forecastTotals.resultMinor,
    resultDeltaVsBudgetMinor: baselineTotals
      ? forecastTotals.resultMinor - baselineTotals.resultMinor
      : null,
  };
}

export async function loadForecastWorkspaceSnapshot(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string | null,
): Promise<{
  years: Awaited<ReturnType<typeof listFinanceYearsForForecast>>;
  snapshot: ForecastWorkspaceSnapshot | null;
  hasAccounts: boolean;
  selectedYearId: string | null;
  baseCurrency: string | null;
  creation: { canInitializeFromBaseline: boolean };
}> {
  const years = await listFinanceYearsForForecast(db, ctx);
  const baseCurrency = await resolveTenantBudgetCurrency(db, ctx);
  const financeConfig = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { currentFinanceYearId: true },
  });

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    include: { reportingGroup: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const hasAccounts = accounts.some(
    (a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE",
  );

  const selectedYearId = resolveBudgetSelectedYearId({
    requestedYearId: financeYearId,
    years,
    currentFinanceYearId: financeConfig?.currentFinanceYearId ?? null,
  });

  if (!selectedYearId) {
    return {
      years,
      snapshot: null,
      hasAccounts,
      selectedYearId: null,
      baseCurrency,
      creation: { canInitializeFromBaseline: false },
    };
  }

  const year = years.find((y) => y.id === selectedYearId)!;
  const creation = await loadForecastCreationContext(db, ctx, selectedYearId);

  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId: selectedYearId } },
    select: { id: true, currentVersionId: true },
  });

  const currentVersion = forecast
    ? await resolveCanonicalCurrentForecastVersionByPointer(db, ctx, forecast)
    : null;

  const budget = await loadBudgetForYear(db, ctx, selectedYearId);
  const baseline =
    budget && budget.versions.length > 0
      ? resolveCurrentGovernanceBaselineVersion({
          currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
          versions: budget.versions,
        })
      : null;

  const approvedBudgetByAccount = new Map<string, number>();
  if (baseline) {
    for (const line of baseline.lines) {
      approvedBudgetByAccount.set(line.financialAccountId, line.amountMinor);
    }
  }

  const rows = buildForecastPlanningRows({
    accounts,
    lines: currentVersion?.lines ?? [],
    approvedBudgetByAccount,
    comparisonForAccount: (semantic, budgetMinor, forecastMinor) => {
      const metrics = computeForecastBudgetComparisonMetrics({
        canonicalSemantic: semantic,
        approvedBudgetMinor: budgetMinor,
        forecastMinor,
      });
      return {
        rawForecastDeltaMinor: metrics.rawForecastDeltaMinor,
        favorability: metrics.favorability,
      };
    },
  });

  const totals = computeBudgetPlanningTotals(
    rows
      .filter((row) => row.amountMinor !== null)
      .map((row) => ({
        amountMinor: row.amountMinor!,
        financialAccount: { canonicalSemantic: row.semantic },
      })),
  );

  const approvedBaselineTotals = baseline
    ? computeBudgetPlanningTotals(
        baseline.lines.map((line) => ({
          amountMinor: line.amountMinor,
          financialAccount: { canonicalSemantic: line.financialAccount.canonicalSemantic },
        })),
      )
    : null;

  const recommendedFormalReforecastAsOfDate = recommendFormalReforecastAsOfDate({
    startDate: year.startDate,
    endDate: year.endDate,
  });

  const currentRevision = currentVersion
    ? {
        revisionLabel: currentVersion.revisionLabel,
        revisionSource: (currentVersion.revisionSource as ForecastRevisionSource | null) ?? null,
        asOfDate: currentVersion.asOfDate
          ? formatFinanceCalendarDateIso(currentVersion.asOfDate)
          : null,
        presentation: buildForecastHistoryDisplayMetadata({
          revisionLabel: currentVersion.revisionLabel,
          revisionSource: currentVersion.revisionSource,
          asOfDate: currentVersion.asOfDate,
          versionNumber: currentVersion.versionNumber,
          isCurrent: true,
        }),
      }
    : null;

  const snapshot: ForecastWorkspaceSnapshot = {
    financeYearId: selectedYearId,
    financeYearName: year.name,
    forecastId: forecast?.id ?? null,
    versionId: currentVersion?.id ?? null,
    versionNumber: currentVersion?.versionNumber ?? null,
    status: currentVersion ? "CURRENT" : "NONE",
    currency: baseCurrency,
    recommendedFormalReforecastAsOfDate,
    currentRevision,
    rows,
    totals: {
      totalIncomeMinor: totals.totalIncomeMinor,
      totalExpenseMinor: totals.totalExpenseMinor,
      resultMinor: totals.resultMinor,
    },
    approvedBaselineTotals: approvedBaselineTotals
      ? {
          totalIncomeMinor: approvedBaselineTotals.totalIncomeMinor,
          totalExpenseMinor: approvedBaselineTotals.totalExpenseMinor,
          resultMinor: approvedBaselineTotals.resultMinor,
        }
      : null,
  };

  return {
    years,
    snapshot,
    hasAccounts,
    selectedYearId,
    baseCurrency,
    creation,
  };
}

export type ForecastWorkspaceRollingUxData = {
  history: FinanceForecastHistoryReadModel | null;
  vsPrevious: CurrentForecastVsPreviousResult;
  vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
};

/** Batched server read models for FIN-04C-05 workspace (history + comparisons). */
export async function loadForecastWorkspaceRollingUxData(
  db: Db &
    Parameters<typeof loadFinanceForecastHistory>[0] &
    Parameters<typeof getCurrentForecastVsPrevious>[0],
  ctx: FinanceAuthContext,
  financeYearId: string,
): Promise<ForecastWorkspaceRollingUxData | null> {
  const forecast = await db.financeForecast.findUnique({
    where: { tenantId_financeYearId: { tenantId: ctx.tenantId, financeYearId } },
    select: { id: true },
  });
  if (!forecast) {
    return null;
  }

  const [history, vsPrevious, vsApprovedBudget] = await Promise.all([
    loadFinanceForecastHistory(db, ctx, financeYearId),
    getCurrentForecastVsPrevious(db, ctx, financeYearId),
    getCurrentForecastVsApprovedBudget(db, ctx, financeYearId),
  ]);

  return { history, vsPrevious, vsApprovedBudget };
}
