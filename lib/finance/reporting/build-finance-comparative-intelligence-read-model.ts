import {
  buildComparativeComparisonAvailabilityMatrix,
  resolveActualVsBudgetVariancePresentationRole,
  resolveComparativeComparisonPresentation,
} from "@/lib/finance/reporting/comparative-comparison-availability";
import { buildFinanceComparativeAttentionInsights } from "@/lib/finance/reporting/build-finance-comparative-attention-insights";
import type { FinanceComparativeIntelligenceReadModel } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";

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
    attentionInsights: buildFinanceComparativeAttentionInsights(pnl),
    sourceAvailability: {
      approvedBudget: pnl.approvedBudget.availability,
      actual: pnl.actual.availability,
      currentForecast: pnl.currentForecast.availability,
    },
  };
}
