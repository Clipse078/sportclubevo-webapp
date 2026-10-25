import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import { deriveFinanceForecastTimingWorkspacePresentationState } from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import {
  FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE,
  type FinanceOverviewAttentionItem,
  type FinanceOverviewDecisionIntelligenceReadModel,
  type FinanceOverviewExpectedMovementSection,
  type FinanceOverviewFinancialConclusion,
} from "@/lib/finance/reporting/finance-overview-decision-intelligence-read-model";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";
import { selectTopDriversByFavorability } from "@/lib/finance/reporting/reporting-contribution-analysis";

function resolveFinancialConclusion(
  management: FinanceManagementOverviewReadModel,
): FinanceOverviewFinancialConclusion {
  const forecastResultMinor = management.currentForecast.summary?.resultMinor ?? null;
  const approvedBudgetResultMinor = management.approvedBudget.summary?.resultMinor ?? null;
  const variance = management.forecastVsBudgetVariance;
  const favorability = variance.favorability;

  if (management.currentForecast.availability === "NOT_VISIBLE") {
    return {
      kind: "NO_CONCLUSION",
      forecastVsBudgetFavorability: null,
      forecastResultMinor: null,
      approvedBudgetResultMinor,
      forecastVsBudgetVarianceMinor: null,
    };
  }

  if (
    management.currentForecast.availability === "NO_CURRENT_FORECAST" ||
    forecastResultMinor === null
  ) {
    return {
      kind: "FORECAST_UNAVAILABLE",
      forecastVsBudgetFavorability: null,
      forecastResultMinor: null,
      approvedBudgetResultMinor,
      forecastVsBudgetVarianceMinor: null,
    };
  }

  if (
    management.approvedBudget.availability === "NO_APPROVED_BUDGET" ||
    approvedBudgetResultMinor === null
  ) {
    return {
      kind: "BUDGET_UNAVAILABLE",
      forecastVsBudgetFavorability: null,
      forecastResultMinor,
      approvedBudgetResultMinor: null,
      forecastVsBudgetVarianceMinor: null,
    };
  }

  if (variance.availability !== "AVAILABLE" || favorability === null) {
    return {
      kind: "NO_CONCLUSION",
      forecastVsBudgetFavorability: favorability,
      forecastResultMinor,
      approvedBudgetResultMinor,
      forecastVsBudgetVarianceMinor: variance.rawDeltaMinor,
    };
  }

  let kind: FinanceOverviewFinancialConclusion["kind"];
  switch (favorability) {
    case "ON_PLAN":
      kind = "ON_TRACK";
      break;
    case "FAVORABLE":
      kind = "ABOVE_BUDGET_EXPECTED";
      break;
    case "UNFAVORABLE":
      kind = "BELOW_BUDGET_EXPECTED";
      break;
  }

  return {
    kind,
    forecastVsBudgetFavorability: favorability,
    forecastResultMinor,
    approvedBudgetResultMinor,
    forecastVsBudgetVarianceMinor: variance.rawDeltaMinor,
  };
}

function buildAttentionItems(input: {
  management: FinanceManagementOverviewReadModel;
  timingOverview: FinanceForecastTimingOverviewReadModel | null;
  timingVisible: boolean;
}): FinanceOverviewAttentionItem[] {
  const items: FinanceOverviewAttentionItem[] = [];

  if (input.management.availability === "NO_STRUCTURE") {
    items.push({
      kind: "NO_REPORTING_STRUCTURE",
      priority: 10,
      routeKey: "structure",
    });
  }

  if (
    input.management.approvedBudget.availability !== "NOT_VISIBLE" &&
    input.management.approvedBudget.availability === "NO_APPROVED_BUDGET"
  ) {
    items.push({
      kind: "MISSING_APPROVED_BUDGET",
      priority: 20,
      routeKey: "budget",
    });
  }

  if (
    input.management.currentForecast.availability !== "NOT_VISIBLE" &&
    input.management.currentForecast.availability === "NO_CURRENT_FORECAST"
  ) {
    items.push({
      kind: "MISSING_CURRENT_FORECAST",
      priority: 30,
      routeKey: "forecast",
    });
  }

  if (input.management.attention.hasUnfavourableManagementResultVariance) {
    items.push({
      kind: "UNFAVORABLE_FORECAST_VS_BUDGET",
      priority: 40,
      routeKey: "reports",
    });
  }

  if (input.timingVisible && input.timingOverview) {
    const hasOverallocation = input.timingOverview.exceptions.some(
      (e) => e.kind === "OVERALLOCATED",
    );
    if (hasOverallocation) {
      items.push({
        kind: "TIMING_OVERALLOCATED",
        priority: 50,
        routeKey: "timing",
      });
    }

    const hasAmbiguous = input.timingOverview.exceptions.some(
      (e) => e.kind === "AMBIGUOUS_AT_CUTOFF",
    );
    if (hasAmbiguous) {
      items.push({
        kind: "TIMING_AMBIGUOUS_AT_CUTOFF",
        priority: 55,
        routeKey: "timing",
      });
    }

    const untimedIncome = input.timingOverview.annual.income.unscheduledRemainderMinor;
    const untimedExpense = input.timingOverview.annual.expense.unscheduledRemainderMinor;
    const untimedTotal = (untimedIncome ?? 0) + (untimedExpense ?? 0);
    const remaining =
      input.timingOverview.annual.income.remainingFutureExpectationMinor +
      input.timingOverview.annual.expense.remainingFutureExpectationMinor;

    if (
      remaining > 0 &&
      untimedTotal > 0 &&
      untimedTotal * 10_000 >= remaining * 3_000
    ) {
      items.push({
        kind: "SIGNIFICANT_UNTIMED_REMAINDER",
        priority: 60,
        routeKey: "timing",
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

function buildExpectedMovementSection(input: {
  timingVisible: boolean;
  timingOverview: FinanceForecastTimingOverviewReadModel | null;
  visualModel: FinanceForecastTimingVisualModel | null;
}): FinanceOverviewExpectedMovementSection {
  if (!input.timingVisible) {
    return {
      availability: "NOT_VISIBLE",
      presentationState: null,
      timingCoverage: null,
      untimedRemainderMinor: null,
      visualModel: null,
    };
  }

  if (!input.timingOverview) {
    return {
      availability: "NO_CURRENT_FORECAST",
      presentationState: null,
      timingCoverage: null,
      untimedRemainderMinor: null,
      visualModel: null,
    };
  }

  if (input.timingOverview.currentForecast.kind === "UNAVAILABLE") {
    return {
      availability: "NO_CURRENT_FORECAST",
      presentationState: null,
      timingCoverage: input.timingOverview.timingCoverage,
      untimedRemainderMinor: null,
      visualModel: null,
    };
  }

  const income = input.timingOverview.annual.income;
  const expense = input.timingOverview.annual.expense;
  const remainingFuture =
    income.remainingFutureExpectationMinor + expense.remainingFutureExpectationMinor;
  const untimedTotal =
    (income.unscheduledRemainderMinor ?? 0) + (expense.unscheduledRemainderMinor ?? 0);
  const plottableCount = input.visualModel?.markers.length ?? 0;

  const presentationState = deriveFinanceForecastTimingWorkspacePresentationState({
    hasRemainingExpectation: remainingFuture > 0,
    timedFutureExpectationMinor:
      income.timedFutureExpectationMinor + expense.timedFutureExpectationMinor,
    untimedTotalMinor: untimedTotal,
    plottableMarkerCount: plottableCount,
  });

  if (presentationState === "NO_REMAINING") {
    return {
      availability: "NO_REMAINING_EXPECTATION",
      presentationState,
      timingCoverage: input.timingOverview.timingCoverage,
      untimedRemainderMinor: untimedTotal > 0 ? untimedTotal : null,
      visualModel: null,
    };
  }

  if (presentationState === "ZERO_TIMING") {
    return {
      availability: "ZERO_TIMING",
      presentationState,
      timingCoverage: input.timingOverview.timingCoverage,
      untimedRemainderMinor: untimedTotal > 0 ? untimedTotal : null,
      visualModel: null,
    };
  }

  return {
    availability: "PARTIAL_OR_FULL_TIMING",
    presentationState,
    timingCoverage: input.timingOverview.timingCoverage,
    untimedRemainderMinor: untimedTotal > 0 ? untimedTotal : null,
    visualModel: input.visualModel,
  };
}

export function buildFinanceOverviewDecisionIntelligenceReadModel(input: {
  management: FinanceManagementOverviewReadModel;
  timingOverview: FinanceForecastTimingOverviewReadModel | null;
  visualModel: FinanceForecastTimingVisualModel | null;
  timingVisible: boolean;
  capabilities: FinanceOverviewDecisionIntelligenceReadModel["capabilities"];
}): FinanceOverviewDecisionIntelligenceReadModel {
  const favourable = selectTopDriversByFavorability(
    input.management.topFavourableDrivers,
    "FAVORABLE",
    FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE,
  );
  const unfavourable = selectTopDriversByFavorability(
    input.management.topUnfavourableDrivers,
    "UNFAVORABLE",
    FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE,
  );

  return {
    management: input.management,
    conclusion: resolveFinancialConclusion(input.management),
    drivers: {
      favourable,
      unfavourable,
      maxPerSide: FINANCE_OVERVIEW_MAX_DRIVERS_PER_SIDE,
    },
    attentionItems: buildAttentionItems({
      management: input.management,
      timingOverview: input.timingOverview,
      timingVisible: input.timingVisible,
    }),
    expectedMovement: buildExpectedMovementSection({
      timingVisible: input.timingVisible,
      timingOverview: input.timingOverview,
      visualModel: input.visualModel,
    }),
    capabilities: input.capabilities,
  };
}
