import type { FinanceComparativeAttentionSignalKind } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type { FinanceComparativeGrainExplanationKey } from "@/lib/finance/reporting/comparative-comparison-availability";

export function financeComparativeAttentionSignalLabelKey(
  kind: FinanceComparativeAttentionSignalKind,
): keyof FinanceComparativeAttentionLabelMap {
  switch (kind) {
    case "FORECAST_EXPECTED_ABOVE_BUDGET":
      return "signalForecastAboveBudget";
    case "FORECAST_EXPECTED_BELOW_BUDGET":
      return "signalForecastBelowBudget";
    case "FORECAST_ON_BUDGET":
      return "signalForecastOnBudget";
    case "MATERIAL_FAVORABLE_VARIANCE_DRIVERS":
      return "signalMaterialFavorableDrivers";
    case "MATERIAL_UNFAVORABLE_VARIANCE_DRIVERS":
      return "signalMaterialUnfavorableDrivers";
    case "RECORDED_ACTUAL_EVIDENCE":
      return "signalRecordedActualEvidence";
    case "LIMITED_ACTUAL_EVIDENCE":
      return "signalLimitedActualEvidence";
    case "MISSING_APPROVED_BUDGET":
      return "signalMissingBudget";
    case "MISSING_CURRENT_FORECAST":
      return "signalMissingForecast";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type FinanceComparativeAttentionLabelMap = {
  signalForecastAboveBudget: string;
  signalForecastBelowBudget: string;
  signalForecastOnBudget: string;
  signalMaterialFavorableDrivers: string;
  signalMaterialUnfavorableDrivers: string;
  signalRecordedActualEvidence: string;
  signalLimitedActualEvidence: string;
  signalMissingBudget: string;
  signalMissingForecast: string;
};

export function financeComparativeGrainExplanationLabelKey(
  key: FinanceComparativeGrainExplanationKey,
): "grainExplanationYtdVsAnnualPlan" | "grainExplanationAnnualActualAndPlan" {
  if (key === "YTD_ACTUAL_VS_ANNUAL_PLAN") return "grainExplanationYtdVsAnnualPlan";
  return "grainExplanationAnnualActualAndPlan";
}

export type FinanceComparativeGrainExplanationLabelMap = {
  grainExplanationYtdVsAnnualPlan: string;
  grainExplanationAnnualActualAndPlan: string;
};
