import { describe, expect, it } from "vitest";
import {
  metricsMatchPoWholeChfPresentation,
  R6_LIVE_BEFORE_VERSION_2,
  R6_PO_UAT_STEPS,
  R6_VERSION_1_FROZEN,
} from "@/lib/finance/uat/sce-finance-06b-r6-version2-uat-prep";

describe("FIN-06B-R6 PO UAT prep", () => {
  it("accepts STAGE sub-minor precision when whole-CHF presentation matches PO checkpoint", () => {
    const stageLiveLike = {
      mitgliedsbeitraegeForecastMinor: 213_694_34,
      totalForecastIncomeMinor: 263_694_34,
      totalForecastExpenseMinor: 101_161_04,
      forecastResultMinor: 162_533_30,
      budgetResultMinor: 150_000_00,
      actualResultMinor: 7_776_00,
      forecastVsBudgetDeltaMinor: 12_533_30,
    };
    expect(
      metricsMatchPoWholeChfPresentation(stageLiveLike, R6_LIVE_BEFORE_VERSION_2, "CHF"),
    ).toBe(true);

    const stageV1Like = {
      mitgliedsbeitraegeForecastMinor: 212_694_34,
      totalForecastIncomeMinor: 262_694_34,
      totalForecastExpenseMinor: 101_161_04,
      forecastResultMinor: 161_533_30,
      budgetResultMinor: 150_000_00,
      actualResultMinor: 7_776_00,
      forecastVsBudgetDeltaMinor: 11_533_30,
    };
    expect(metricsMatchPoWholeChfPresentation(stageV1Like, R6_VERSION_1_FROZEN, "CHF")).toBe(true);
  });

  it("documents PO Version 2 UAT steps A–G", () => {
    expect(R6_PO_UAT_STEPS.length).toBe(7);
    expect(R6_PO_UAT_STEPS[0]).toMatch(/162'533/);
    expect(R6_PO_UAT_STEPS[6]).toMatch(/161'533/);
  });
});
