import type { FinanceComparativeAttentionInsight } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type { FinanceComparativeGrainExplanationKey } from "@/lib/finance/reporting/comparative-comparison-availability";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { formatManagementPnlVarianceDelta } from "@/lib/finance/presentation/format-management-pnl-measure";

export type FinanceComparativeAttentionLabelMap = {
  attentionResultFavorableTitle: string;
  attentionResultFavorableDetail: string;
  attentionResultUnfavorableTitle: string;
  attentionResultUnfavorableDetail: string;
  attentionResultOnPlanTitle: string;
  attentionLargestFavorableTitle: string;
  attentionLargestUnfavorableTitle: string;
  attentionDriverExpenseSuffix: string;
  attentionMissingBudget: string;
  attentionMissingForecast: string;
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

function interpolateAmount(template: string, amount: string): string {
  return template.replace("{amount}", amount);
}

function formatOverallVarianceAmount(
  insight: Extract<FinanceComparativeAttentionInsight, { kind: "OVERALL_RESULT" }>,
  currency: string | null,
  locale: string,
): string | null {
  if (insight.rawDeltaMinor === null) return null;
  const magnitudeMinor = Math.abs(insight.rawDeltaMinor);
  return formatFinanceManagementMoneyMinor(magnitudeMinor, currency, locale);
}

export type FinanceComparativeAttentionInsightPresentation = {
  title: string;
  detail: string | null;
  driverVarianceLabel: string | null;
};

export function presentFinanceComparativeAttentionInsight(
  insight: FinanceComparativeAttentionInsight,
  labels: FinanceComparativeAttentionLabelMap,
  currency: string | null,
  locale: string,
): FinanceComparativeAttentionInsightPresentation {
  switch (insight.kind) {
    case "OVERALL_RESULT": {
      const amount = formatOverallVarianceAmount(insight, currency, locale);
      if (insight.favorability === "FAVORABLE") {
        return {
          title: labels.attentionResultFavorableTitle,
          detail:
            amount !== null
              ? interpolateAmount(labels.attentionResultFavorableDetail, amount)
              : null,
          driverVarianceLabel: null,
        };
      }
      if (insight.favorability === "UNFAVORABLE") {
        return {
          title: labels.attentionResultUnfavorableTitle,
          detail:
            amount !== null
              ? interpolateAmount(labels.attentionResultUnfavorableDetail, amount)
              : null,
          driverVarianceLabel: null,
        };
      }
      return {
        title: labels.attentionResultOnPlanTitle,
        detail: null,
        driverVarianceLabel: null,
      };
    }
    case "FAVORABLE_DRIVER": {
      const varianceLabel = formatManagementPnlVarianceDelta(
        insight.driver.comparison,
        currency,
        locale,
      );
      return {
        title: labels.attentionLargestFavorableTitle,
        detail: `${insight.driver.name} ${varianceLabel}`.trim(),
        driverVarianceLabel: varianceLabel,
      };
    }
    case "UNFAVORABLE_DRIVER": {
      const varianceLabel = formatManagementPnlVarianceDelta(
        insight.driver.comparison,
        currency,
        locale,
      );
      const expenseSuffix =
        insight.driver.canonicalSemantic === "EXPENSE"
          ? ` ${labels.attentionDriverExpenseSuffix}`
          : "";
      return {
        title: labels.attentionLargestUnfavorableTitle,
        detail: `${insight.driver.name} ${varianceLabel}${expenseSuffix}`.trim(),
        driverVarianceLabel: varianceLabel,
      };
    }
    case "MISSING_APPROVED_BUDGET":
      return {
        title: labels.attentionMissingBudget,
        detail: null,
        driverVarianceLabel: null,
      };
    case "MISSING_CURRENT_FORECAST":
      return {
        title: labels.attentionMissingForecast,
        detail: null,
        driverVarianceLabel: null,
      };
    default: {
      const _exhaustive: never = insight;
      return _exhaustive;
    }
  }
}
