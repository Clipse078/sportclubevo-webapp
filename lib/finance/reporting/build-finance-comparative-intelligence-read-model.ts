import {
  buildComparativeComparisonAvailabilityMatrix,
  resolveActualVsBudgetVariancePresentationRole,
  resolveComparativeComparisonPresentation,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import type {
  FinanceComparativeAttentionSignal,
  FinanceComparativeIntelligenceReadModel,
} from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";

function buildAttentionSignals(
  pnl: Pick<
    FinanceManagementPnlReadModel,
    | "managementResult"
    | "actualVsBudgetVariance"
    | "actualGrain"
    | "actualCutoffDate"
    | "topFavourableDrivers"
    | "topUnfavourableDrivers"
    | "approvedBudget"
    | "currentForecast"
  >,
  actualVsBudgetRole: FinanceComparativeIntelligenceReadModel["actualVsBudgetVarianceRole"],
): FinanceComparativeAttentionSignal[] {
  const items: FinanceComparativeAttentionSignal[] = [];
  const variance = pnl.managementResult.forecastVsBudget;

  if (
    pnl.approvedBudget.availability !== "NOT_VISIBLE" &&
    pnl.approvedBudget.availability === "NO_APPROVED_BUDGET"
  ) {
    items.push({ kind: "MISSING_APPROVED_BUDGET", priority: 10 });
  }

  if (
    pnl.currentForecast.availability !== "NOT_VISIBLE" &&
    pnl.currentForecast.availability === "NO_CURRENT_FORECAST"
  ) {
    items.push({ kind: "MISSING_CURRENT_FORECAST", priority: 20 });
  }

  if (variance.availability === "AVAILABLE" && variance.favorability) {
    switch (variance.favorability) {
      case "FAVORABLE":
        items.push({ kind: "FORECAST_EXPECTED_ABOVE_BUDGET", priority: 30 });
        break;
      case "UNFAVORABLE":
        items.push({ kind: "FORECAST_EXPECTED_BELOW_BUDGET", priority: 30 });
        break;
      case "ON_PLAN":
        items.push({ kind: "FORECAST_ON_BUDGET", priority: 35 });
        break;
    }
  }

  if (pnl.topFavourableDrivers.length > 0) {
    items.push({ kind: "MATERIAL_FAVORABLE_VARIANCE_DRIVERS", priority: 40 });
  }
  if (pnl.topUnfavourableDrivers.length > 0) {
    items.push({ kind: "MATERIAL_UNFAVORABLE_VARIANCE_DRIVERS", priority: 40 });
  }

  const actualCell = pnl.managementResult.actual;
  const hasRecordedActual =
    actualCell.availability === "AVAILABLE" &&
    actualCell.amountMinor !== null &&
    actualCell.amountMinor !== 0;

  if (hasRecordedActual) {
    items.push({ kind: "RECORDED_ACTUAL_EVIDENCE", priority: 50 });
  }

  const hasMaterialForecastVariance =
    pnl.topFavourableDrivers.length > 0 || pnl.topUnfavourableDrivers.length > 0;

  if (
    pnl.actualGrain === "YTD" &&
    hasMaterialForecastVariance &&
    actualVsBudgetRole === "UNSUPPORTED" &&
    variance.availability === "AVAILABLE"
  ) {
    items.push({ kind: "LIMITED_ACTUAL_EVIDENCE", priority: 55 });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export type FinanceComparativeIntelligenceSource = Omit<
  FinanceManagementPnlReadModel,
  "comparativeIntelligence"
>;

export function buildFinanceComparativeIntelligenceReadModel(
  pnl: FinanceComparativeIntelligenceSource,
): FinanceComparativeIntelligenceReadModel {
  const actualVsBudgetRole = resolveActualVsBudgetVariancePresentationRole({
    actualGrain: pnl.actualGrain,
    varianceSlice: pnl.actualVsBudgetVariance,
  });

  const ytdContext = resolveComparativeComparisonPresentation({
    kind: "YTD_ACTUAL_VS_ANNUAL_APPROVED_BUDGET",
    actualGrain: pnl.actualGrain,
  });

  const actualPresentationRole =
    pnl.actualGrain === "YTD" ? ("CONTEXT_ONLY" as const) : ("SUPPORTED" as const);

  return {
    overallComparison: {
      pair: "CURRENT_FORECAST_VS_APPROVED_BUDGET",
      presentationRole: "SUPPORTED",
      baseline: pnl.managementResult.approvedBudget,
      comparison: pnl.managementResult.currentForecast,
      variance: pnl.managementResult.forecastVsBudget,
    },
    actualContext: {
      grain: pnl.actualGrain,
      cutoffDate: pnl.actualCutoffDate,
      measure: pnl.managementResult.actual,
      presentationRole: actualPresentationRole,
      grainExplanationKey:
        pnl.actualGrain === "YTD" ? ytdContext.explanationKey : null,
    },
    actualVsBudgetVarianceRole: actualVsBudgetRole,
    comparisonAvailability: buildComparativeComparisonAvailabilityMatrix({
      actualGrain: pnl.actualGrain,
    }),
    materialDrivers: {
      favourable: pnl.topFavourableDrivers,
      unfavourable: pnl.topUnfavourableDrivers,
    },
    attentionSignals: buildAttentionSignals(pnl, actualVsBudgetRole),
    sourceAvailability: {
      approvedBudget: pnl.approvedBudget.availability,
      actual: pnl.actual.availability,
      currentForecast: pnl.currentForecast.availability,
    },
  };
}
