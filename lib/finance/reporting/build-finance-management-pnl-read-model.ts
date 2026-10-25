import type { FinancialAccount, FinancialReportingGroup } from "@prisma/client";
import { buildFinanceManagementOverviewReadModel } from "@/lib/finance/reporting/build-finance-management-overview-read-model";
import type { ApprovedBudgetMeasurePayload } from "@/lib/finance/reporting/approved-budget-measure-provider";
import type { ActualMeasurePayload } from "@/lib/finance/reporting/actual-measure-provider";
import type { CurrentForecastMeasurePayload } from "@/lib/finance/reporting/current-forecast-measure-provider";
import {
  buildManagementPnlSemanticSections,
  buildManagementPnlVarianceTree,
} from "@/lib/finance/reporting/build-management-pnl-tree";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { ManagementPnlMeasureCell } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import {
  computeCanonicalSourceSectionTotals,
  reconcilePnlSectionTotals,
} from "@/lib/finance/reporting/pnl-reporting-completeness";
import { summarizeVarianceTreeResult } from "@/lib/finance/reporting/build-variance-reporting-tree";

function emptyMeasureCell(
  visible: boolean,
  missing: ManagementPnlMeasureCell["availability"],
): ManagementPnlMeasureCell {
  return { availability: visible ? missing : "NOT_VISIBLE", amountMinor: null };
}

export function buildFinanceManagementPnlReadModel(input: {
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
}): FinanceManagementPnlReadModel {
  const overview = buildFinanceManagementOverviewReadModel(input);

  const budgetMap = input.sourceVisibility.approvedBudget
    ? (input.approvedMeasure?.valuesByAccountId ?? null)
    : null;
  const actualMap = input.sourceVisibility.actual
    ? (input.actualMeasure?.valuesByAccountId ?? null)
    : null;
  const forecastMap = input.sourceVisibility.currentForecast
    ? (input.forecastMeasure?.valuesByAccountId ?? null)
    : null;

  const { varianceTree, unassignedAccounts } = buildManagementPnlVarianceTree({
    groups: input.groups,
    accounts: input.accounts,
    budgetMap,
    forecastMap,
    budgetVisible: input.sourceVisibility.approvedBudget,
    forecastVisible: input.sourceVisibility.currentForecast,
  });

  const { incomeSection, expenseSection, hasUnassignedFinancialValues } =
    buildManagementPnlSemanticSections({
      groups: input.groups,
      accounts: input.accounts,
      budgetVisible: input.sourceVisibility.approvedBudget,
      actualVisible: input.sourceVisibility.actual,
      forecastVisible: input.sourceVisibility.currentForecast,
      budgetMap,
      actualMap,
      forecastMap,
      varianceTree,
      unassignedAccounts,
    });

  const managementForecastVsBudget = summarizeVarianceTreeResult(varianceTree);

  const managementResult = {
    approvedBudget: {
      availability: overview.approvedBudget.availability,
      amountMinor: overview.approvedBudget.summary?.resultMinor ?? null,
    },
    actual: {
      availability: overview.actual.availability,
      amountMinor: overview.actual.summary?.resultMinor ?? null,
    },
    currentForecast: {
      availability: overview.currentForecast.availability,
      amountMinor: overview.currentForecast.summary?.resultMinor ?? null,
    },
    forecastVsBudget: managementForecastVsBudget,
  };

  const buildReconciliation = (
    sourceVisible: boolean,
    values: ReadonlyMap<string, number> | null,
    sectionField: "approvedBudget" | "actual" | "currentForecast",
  ) => {
    const canonical = computeCanonicalSourceSectionTotals({
      accounts: input.accounts,
      valuesByAccountId: values,
      sourceVisible,
    });
    return reconcilePnlSectionTotals({
      canonical: {
        incomeMinor: canonical.incomeMinor,
        expenseMinor: canonical.expenseMinor,
      },
      represented: {
        incomeMinor:
          sourceVisible && values ? incomeSection.sectionTotal[sectionField].amountMinor : null,
        expenseMinor:
          sourceVisible && values ? expenseSection.sectionTotal[sectionField].amountMinor : null,
      },
    });
  };

  let availability = overview.availability;
  if (input.structureAvailability === "NO_STRUCTURE") {
    availability = "NO_STRUCTURE";
  }

  return {
    tenantId: input.tenantId,
    financeYearId: input.financeYearId,
    financeYearName: input.financeYearName,
    mode: "LIVE",
    baseCurrency: input.baseCurrency,
    availability,
    actualCutoffDate: input.actualCutoffDate,
    actualGrain: input.actualMeasure?.grain ?? null,
    sourceVisibility: input.sourceVisibility,
    approvedBudget: {
      availability: overview.approvedBudget.availability,
      approvedBudgetVersionId: overview.approvedBudget.approvedBudgetVersionId,
    },
    actual: {
      availability: overview.actual.availability,
      grain: overview.actual.grain,
    },
    currentForecast: {
      availability: overview.currentForecast.availability,
      currentForecastVersionId: overview.currentForecast.currentForecastVersionId,
    },
    actualVsBudgetVariance: overview.actualVsBudgetVariance,
    interpretation: {
      budgetedResult: overview.approvedBudget.summary,
      expectedResult: overview.currentForecast.summary,
      forecastVsBudgetManagementResult: overview.forecastVsBudgetVariance,
    },
    incomeSection,
    expenseSection,
    managementResult,
    topFavourableDrivers: overview.topFavourableDrivers,
    topUnfavourableDrivers: overview.topUnfavourableDrivers,
    reconciliation: {
      approvedBudget: buildReconciliation(
        input.sourceVisibility.approvedBudget,
        budgetMap,
        "approvedBudget",
      ),
      actual: buildReconciliation(input.sourceVisibility.actual, actualMap, "actual"),
      currentForecast: buildReconciliation(
        input.sourceVisibility.currentForecast,
        forecastMap,
        "currentForecast",
      ),
    },
    hasUnassignedFinancialValues,
  };
}

export function emptyFinanceManagementPnlReadModel(
  partial: Pick<
    FinanceManagementPnlReadModel,
    "tenantId" | "financeYearId" | "financeYearName" | "baseCurrency" | "availability"
  >,
): FinanceManagementPnlReadModel {
  const emptySlice = {
    availability: "BOTH_MISSING" as const,
    baselineMinor: null,
    comparisonMinor: null,
    rawDeltaMinor: null,
    variancePercent: null,
    favorability: null,
    absoluteVarianceMagnitudeMinor: null,
  };
  const emptySection = {
    semantic: "INCOME" as const,
    sectionTotal: {
      approvedBudget: emptyMeasureCell(false, "NOT_VISIBLE"),
      actual: emptyMeasureCell(false, "NOT_VISIBLE"),
      currentForecast: emptyMeasureCell(false, "NOT_VISIBLE"),
      forecastVsBudget: emptySlice,
    },
    nodes: [],
  };
  return {
    tenantId: partial.tenantId,
    financeYearId: partial.financeYearId,
    financeYearName: partial.financeYearName,
    mode: "LIVE",
    baseCurrency: partial.baseCurrency,
    availability: partial.availability,
    actualCutoffDate: null,
    actualGrain: null,
    sourceVisibility: {
      approvedBudget: false,
      actual: false,
      currentForecast: false,
    },
    approvedBudget: {
      availability: "NOT_VISIBLE",
      approvedBudgetVersionId: null,
    },
    actual: { availability: "NOT_VISIBLE", grain: null },
    currentForecast: {
      availability: "NOT_VISIBLE",
      currentForecastVersionId: null,
    },
    actualVsBudgetVariance: emptySlice,
    interpretation: {
      budgetedResult: null,
      expectedResult: null,
      forecastVsBudgetManagementResult: emptySlice,
    },
    incomeSection: emptySection,
    expenseSection: { ...emptySection, semantic: "EXPENSE" },
    managementResult: {
      approvedBudget: emptyMeasureCell(false, "NOT_VISIBLE"),
      actual: emptyMeasureCell(false, "NOT_VISIBLE"),
      currentForecast: emptyMeasureCell(false, "NOT_VISIBLE"),
      forecastVsBudget: emptySlice,
    },
    topFavourableDrivers: [],
    topUnfavourableDrivers: [],
    reconciliation: {
      approvedBudget: {
        canonicalIncomeMinor: null,
        canonicalExpenseMinor: null,
        canonicalResultMinor: null,
        representedIncomeMinor: null,
        representedExpenseMinor: null,
        representedResultMinor: null,
        reconciles: true,
      },
      actual: {
        canonicalIncomeMinor: null,
        canonicalExpenseMinor: null,
        canonicalResultMinor: null,
        representedIncomeMinor: null,
        representedExpenseMinor: null,
        representedResultMinor: null,
        reconciles: true,
      },
      currentForecast: {
        canonicalIncomeMinor: null,
        canonicalExpenseMinor: null,
        canonicalResultMinor: null,
        representedIncomeMinor: null,
        representedExpenseMinor: null,
        representedResultMinor: null,
        reconciles: true,
      },
    },
    hasUnassignedFinancialValues: false,
  };
}
