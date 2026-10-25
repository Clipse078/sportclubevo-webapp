import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type {
  FinanceComparativeAttentionInsight,
  FinanceComparativeAttentionDriverRef,
} from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";

export const FINANCE_COMPARATIVE_ATTENTION_MAX_INSIGHTS = 3;

function toDriverRef(driver: FinanceVarianceDriver): FinanceComparativeAttentionDriverRef {
  return {
    kind: driver.kind,
    id: driver.id,
    name: driver.name,
    canonicalSemantic: driver.canonicalSemantic,
    comparison: driver.comparison,
  };
}

export type FinanceComparativeAttentionInsightSource = Pick<
  FinanceManagementPnlReadModel,
  | "managementResult"
  | "topFavourableDrivers"
  | "topUnfavourableDrivers"
  | "approvedBudget"
  | "currentForecast"
>;

export function buildFinanceComparativeAttentionInsights(
  pnl: FinanceComparativeAttentionInsightSource,
): FinanceComparativeAttentionInsight[] {
  const items: FinanceComparativeAttentionInsight[] = [];

  if (
    pnl.approvedBudget.availability !== "NOT_VISIBLE" &&
    pnl.approvedBudget.availability === "NO_APPROVED_BUDGET"
  ) {
    return [{ kind: "MISSING_APPROVED_BUDGET" }];
  }

  if (
    pnl.currentForecast.availability !== "NOT_VISIBLE" &&
    pnl.currentForecast.availability === "NO_CURRENT_FORECAST"
  ) {
    items.push({ kind: "MISSING_CURRENT_FORECAST" });
    return items.slice(0, FINANCE_COMPARATIVE_ATTENTION_MAX_INSIGHTS);
  }

  const variance = pnl.managementResult.forecastVsBudget;
  if (variance.availability === "AVAILABLE" && variance.favorability) {
    items.push({
      kind: "OVERALL_RESULT",
      favorability: variance.favorability,
      rawDeltaMinor: variance.rawDeltaMinor,
    });
  }

  const topFavourable = pnl.topFavourableDrivers[0];
  if (topFavourable) {
    items.push({ kind: "FAVORABLE_DRIVER", driver: toDriverRef(topFavourable) });
  }

  const topUnfavourable = pnl.topUnfavourableDrivers[0];
  if (topUnfavourable) {
    items.push({ kind: "UNFAVORABLE_DRIVER", driver: toDriverRef(topUnfavourable) });
  }

  return items.slice(0, FINANCE_COMPARATIVE_ATTENTION_MAX_INSIGHTS);
}
