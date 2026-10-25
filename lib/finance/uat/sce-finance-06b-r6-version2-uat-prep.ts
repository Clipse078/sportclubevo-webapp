/**
 * SCE-FIN-06B-R6 — Version 2 PO UAT preparation (inspect-only; no mutations, no V2 creation).
 */

import { roundAmountMinorToWholeMajorPresentation } from "@/lib/finance/presentation/finance-money-presentation";
import {
  metricsEqual,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
  type R5PnlCheckpointMetrics,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";

export const R6_OPERATION_ID = "sce-finance-06b-r6-version2-uat-prep";

/** Whole-CHF presentation checkpoints (PO visual UAT). */
export const R6_LIVE_BEFORE_VERSION_2 = R5_LIVE_AFTER_MUTATION;
export const R6_VERSION_1_FROZEN = R5_V1_BASELINE;

export const R6_PO_UAT_STEPS = [
  "A. Verify LIVE Erfolgsrechnung: Forecast result 162'533 CHF; Budget 150'000; Actual 7'776; variance +12'533 favorable; Mitgliedsbeiträge Forecast 213'694.",
  "B. Open Veröffentlichungen → Version 1: still 161'533; variance +11'533; Mitgliedsbeiträge 212'694.",
  "C. Close Version 1.",
  "D. Use Veröffentlichen → Veröffentlichen to create Version 2 through the product UI (engineering must not create V2).",
  "E. Veröffentlichungen history: Version 2 newest/current; Version 1 older/superseded.",
  "F. Open Version 2: 162'533; +12'533; Mitgliedsbeiträge 213'694.",
  "G. Re-open Version 1: still 161'533; +11'533; 212'694 Mitgliedsbeiträge. STOP after screenshots.",
] as const;

export function metricsMatchPoWholeChfPresentation(
  actual: R5PnlCheckpointMetrics,
  expected: Readonly<R5PnlCheckpointMetrics>,
  currencyCode: string,
): boolean {
  const round = (m: R5PnlCheckpointMetrics): R5PnlCheckpointMetrics => ({
    mitgliedsbeitraegeForecastMinor:
      m.mitgliedsbeitraegeForecastMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.mitgliedsbeitraegeForecastMinor, currencyCode),
    totalForecastIncomeMinor:
      m.totalForecastIncomeMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.totalForecastIncomeMinor, currencyCode),
    totalForecastExpenseMinor:
      m.totalForecastExpenseMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.totalForecastExpenseMinor, currencyCode),
    forecastResultMinor:
      m.forecastResultMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.forecastResultMinor, currencyCode),
    budgetResultMinor:
      m.budgetResultMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.budgetResultMinor, currencyCode),
    actualResultMinor:
      m.actualResultMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.actualResultMinor, currencyCode),
    forecastVsBudgetDeltaMinor:
      m.forecastVsBudgetDeltaMinor === null
        ? null
        : roundAmountMinorToWholeMajorPresentation(m.forecastVsBudgetDeltaMinor, currencyCode),
  });
  return metricsEqual(round(actual), round(expected));
}

export {
  metricsEqual,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_V1_BASELINE,
  R5_LIVE_AFTER_MUTATION,
};
