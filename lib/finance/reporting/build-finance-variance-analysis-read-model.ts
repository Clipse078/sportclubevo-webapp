import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import {
  buildVarianceReportingTree,
  collectAccountVarianceNodes,
  summarizeVarianceTreeResult,
} from "@/lib/finance/reporting/build-variance-reporting-tree";
import type { FinanceVarianceAnalysisReadModel } from "@/lib/finance/reporting/finance-variance-analysis-read-model";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import type { CurrentForecastMeasurePayload } from "@/lib/finance/reporting/current-forecast-measure-provider";
import type { ActualMeasurePayload } from "@/lib/finance/reporting/actual-measure-provider";
import {
  computeRelativeContributionBasisPoints,
  rankVarianceDrivers,
  selectTopDriversByFavorability,
  sumAbsoluteVarianceMagnitudes,
} from "@/lib/finance/reporting/reporting-contribution-analysis";
import type {
  FinanceReportingComparisonGrain,
  FinanceReportingComparisonPair,
} from "@/lib/finance/reporting/reporting-comparison-model";
import { YTD_BUDGET_VARIANCE_SUPPORTED } from "@/lib/finance/actual/period-semantics";
import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";

const TOP_DRIVER_LIMIT = 5;

function summaryFromMeasure(
  accounts: ReadonlyArray<{ id: string; canonicalSemantic: "INCOME" | "EXPENSE" }>,
  values: ReadonlyMap<string, number> | null,
) {
  if (!values) return null;
  const lines = accounts.map((account) => ({
    amountMinor: values.get(account.id) ?? 0,
    canonicalSemantic: account.canonicalSemantic,
  }));
  return computeCanonicalFinancialResult(lines);
}

export function buildFinanceVarianceAnalysisReadModel(input: {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string | null;
  comparison: FinanceReportingComparisonPair;
  grain: FinanceReportingComparisonGrain;
  actualCutoffDate: Date | null;
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  approvedMeasure: ApprovedBudgetMeasurePayload | null;
  actualMeasure: ActualMeasurePayload | null;
  forecastMeasure: CurrentForecastMeasurePayload | null;
  sourceVisibility: FinanceVarianceAnalysisReadModel["sourceVisibility"];
}): FinanceVarianceAnalysisReadModel {
  const planningAccounts = input.accounts
    .filter((a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE")
    .map((a) => ({
      id: a.id,
      canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
    }));

  let availability: FinanceVarianceAnalysisReadModel["availability"] = "AVAILABLE";
  let periodMismatch = false;

  if (input.comparison === "ACTUAL_VS_APPROVED_BUDGET") {
    if (input.grain === "ACTUAL_YTD_WITH_EXPLICIT_CUTOFF" && !YTD_BUDGET_VARIANCE_SUPPORTED) {
      periodMismatch = true;
      availability = "PERIOD_MISMATCH";
    }
    if (!input.approvedMeasure) availability = "NO_APPROVED_BUDGET";
    if (!input.actualMeasure && input.sourceVisibility.actual) {
      if (availability === "AVAILABLE") availability = "NO_ACTUAL";
    }
  } else if (input.comparison === "CURRENT_FORECAST_VS_APPROVED_BUDGET") {
    if (!input.approvedMeasure) availability = "NO_APPROVED_BUDGET";
    if (!input.forecastMeasure) {
      if (availability === "AVAILABLE") availability = "NO_CURRENT_FORECAST";
    }
  }

  let baselineMap: ReadonlyMap<string, number> | null = null;
  let comparisonMap: ReadonlyMap<string, number> | null = null;
  let baselineSummary = null;
  let comparisonSummary = null;

  if (input.comparison === "ACTUAL_VS_APPROVED_BUDGET") {
    baselineMap = input.sourceVisibility.approvedBudget
      ? (input.approvedMeasure?.valuesByAccountId ?? null)
      : null;
    comparisonMap = input.sourceVisibility.actual
      ? (input.actualMeasure?.valuesByAccountId ?? null)
      : null;
    baselineSummary = summaryFromMeasure(planningAccounts, baselineMap);
    comparisonSummary = summaryFromMeasure(planningAccounts, comparisonMap);
  } else {
    baselineMap = input.sourceVisibility.approvedBudget
      ? (input.approvedMeasure?.valuesByAccountId ?? null)
      : null;
    comparisonMap = input.sourceVisibility.currentForecast
      ? (input.forecastMeasure?.valuesByAccountId ?? null)
      : null;
    baselineSummary = summaryFromMeasure(planningAccounts, baselineMap);
    comparisonSummary = summaryFromMeasure(planningAccounts, comparisonMap);
  }

  const tree = buildVarianceReportingTree({
    groups: input.groups,
    accounts: input.accounts,
    baselineByAccountId: baselineMap,
    comparisonByAccountId: comparisonMap,
    periodMismatch,
  });

  const managementResultComparison = summarizeVarianceTreeResult(tree);

  const accountNodes = collectAccountVarianceNodes(tree);
  const totalAbs = sumAbsoluteVarianceMagnitudes(accountNodes.map((n) => n.comparison));

  const driverDraft = accountNodes
    .filter((n) => n.comparison.availability === "AVAILABLE")
    .map((node) => ({
      kind: "ACCOUNT" as const,
      id: node.accountId,
      name: node.name,
      canonicalSemantic: node.canonicalSemantic,
      hierarchySortOrder: node.sortOrder,
      comparison: node.comparison,
      relativeContributionBasisPoints: computeRelativeContributionBasisPoints(
        node.comparison.absoluteVarianceMagnitudeMinor,
        totalAbs,
      ),
    }));

  const rankedDrivers = rankVarianceDrivers(driverDraft);

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    mode: "LIVE",
    comparison: input.comparison,
    grain: input.grain,
    baseCurrency: input.baseCurrency,
    availability,
    actualCutoffDate: input.actualCutoffDate,
    approvedBudgetVersionId: input.approvedMeasure?.budgetVersionId ?? null,
    currentForecastVersionId: input.forecastMeasure?.forecastVersionId ?? null,
    baselineSummary,
    comparisonSummary,
    managementResultComparison,
    tree,
    topFavourableDrivers: selectTopDriversByFavorability(rankedDrivers, "FAVORABLE", TOP_DRIVER_LIMIT),
    topUnfavourableDrivers: selectTopDriversByFavorability(
      rankedDrivers,
      "UNFAVORABLE",
      TOP_DRIVER_LIMIT,
    ),
    sourceVisibility: input.sourceVisibility,
  };
}
