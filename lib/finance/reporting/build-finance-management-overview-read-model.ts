import { buildFinanceVarianceAnalysisReadModel } from "@/lib/finance/reporting/build-finance-variance-analysis-read-model";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import type { ActualMeasurePayload } from "@/lib/finance/reporting/actual-measure-provider";
import type { CurrentForecastMeasurePayload } from "@/lib/finance/reporting/current-forecast-measure-provider";
import { computeCanonicalFinancialResult } from "@/lib/finance/reporting/canonical-financial-result";
import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";

function measureAvailability(
  visible: boolean,
  payloadPresent: boolean,
  missingCode: FinanceManagementOverviewReadModel["approvedBudget"]["availability"],
): FinanceManagementOverviewReadModel["approvedBudget"]["availability"] {
  if (!visible) return "NOT_VISIBLE";
  if (!payloadPresent) return missingCode;
  return "AVAILABLE";
}

export function buildFinanceManagementOverviewReadModel(input: {
  tenantId: string;
  financeYearId: string;
  financeYearName: string;
  baseCurrency: string | null;
  structureAvailability: "AVAILABLE" | "NO_STRUCTURE";
  actualCutoffDate: Date | null;
  groups: FinancialReportingGroup[];
  accounts: FinancialAccount[];
  approvedMeasure: ApprovedBudgetMeasurePayload | null;
  actualMeasure: ActualMeasurePayload | null;
  forecastMeasure: CurrentForecastMeasurePayload | null;
  sourceVisibility: {
    approvedBudget: boolean;
    actual: boolean;
    currentForecast: boolean;
  };
}): FinanceManagementOverviewReadModel {
  const planningAccounts = input.accounts
    .filter((a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE")
    .map((a) => ({
      id: a.id,
      canonicalSemantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
    }));

  const budgetSummary =
    input.sourceVisibility.approvedBudget && input.approvedMeasure
      ? computeCanonicalFinancialResult(
          planningAccounts.map((account) => ({
            amountMinor: input.approvedMeasure!.valuesByAccountId.get(account.id) ?? 0,
            canonicalSemantic: account.canonicalSemantic,
          })),
        )
      : null;

  const actualSummary =
    input.sourceVisibility.actual && input.actualMeasure
      ? computeCanonicalFinancialResult(
          planningAccounts.map((account) => ({
            amountMinor: input.actualMeasure!.valuesByAccountId.get(account.id) ?? 0,
            canonicalSemantic: account.canonicalSemantic,
          })),
        )
      : null;

  const forecastSummary =
    input.sourceVisibility.currentForecast && input.forecastMeasure
      ? computeCanonicalFinancialResult(
          planningAccounts.map((account) => ({
            amountMinor: input.forecastMeasure!.valuesByAccountId.get(account.id) ?? 0,
            canonicalSemantic: account.canonicalSemantic,
          })),
        )
      : null;

  const forecastVariance = buildFinanceVarianceAnalysisReadModel({
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    baseCurrency: input.baseCurrency,
    comparison: "CURRENT_FORECAST_VS_APPROVED_BUDGET",
    grain: "ANNUAL_FULL_YEAR",
    actualCutoffDate: input.actualCutoffDate,
    groups: input.groups,
    accounts: input.accounts,
    approvedMeasure: input.approvedMeasure,
    actualMeasure: input.actualMeasure,
    forecastMeasure: input.forecastMeasure,
    sourceVisibility: input.sourceVisibility,
  });

  const actualVariance = buildFinanceVarianceAnalysisReadModel({
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    baseCurrency: input.baseCurrency,
    comparison: "ACTUAL_VS_APPROVED_BUDGET",
    grain: "ANNUAL_FULL_YEAR",
    actualCutoffDate: input.actualCutoffDate,
    groups: input.groups,
    accounts: input.accounts,
    approvedMeasure: input.approvedMeasure,
    actualMeasure: input.actualMeasure,
    forecastMeasure: input.forecastMeasure,
    sourceVisibility: input.sourceVisibility,
  });

  let availability: FinanceManagementOverviewReadModel["availability"] = "AVAILABLE";
  if (input.structureAvailability === "NO_STRUCTURE") {
    availability = "NO_STRUCTURE";
  } else if (
    forecastVariance.availability !== "AVAILABLE" &&
    actualVariance.availability !== "AVAILABLE" &&
    !budgetSummary
  ) {
    availability = "PARTIAL_SOURCE_AVAILABILITY";
  }

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    mode: "LIVE",
    baseCurrency: input.baseCurrency,
    availability,
    actualCutoffDate: input.actualCutoffDate,
    approvedBudget: {
      availability: measureAvailability(
        input.sourceVisibility.approvedBudget,
        input.approvedMeasure !== null,
        "NO_APPROVED_BUDGET",
      ),
      summary: budgetSummary,
      approvedBudgetVersionId: input.approvedMeasure?.budgetVersionId ?? null,
    },
    actual: {
      availability: measureAvailability(
        input.sourceVisibility.actual,
        input.actualMeasure !== null,
        "NO_ACTUAL",
      ),
      summary: actualSummary,
      grain: input.actualMeasure?.grain ?? null,
    },
    currentForecast: {
      availability: measureAvailability(
        input.sourceVisibility.currentForecast,
        input.forecastMeasure !== null,
        "NO_CURRENT_FORECAST",
      ),
      summary: forecastSummary,
      currentForecastVersionId: input.forecastMeasure?.forecastVersionId ?? null,
    },
    forecastVsBudgetVariance: forecastVariance.managementResultComparison,
    actualVsBudgetVariance: actualVariance.managementResultComparison,
    topFavourableDrivers: forecastVariance.topFavourableDrivers,
    topUnfavourableDrivers: forecastVariance.topUnfavourableDrivers,
    attention: {
      hasUnfavourableManagementResultVariance:
        forecastVariance.managementResultComparison.favorability === "UNFAVORABLE",
      hasMissingApprovedBudget: input.approvedMeasure === null,
      hasMissingCurrentForecast: input.forecastMeasure === null,
    },
  };
}
