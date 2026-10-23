import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04A R2 forecast workspace UX", () => {
  it("uses canonical variance comparison table columns when baseline exists", () => {
    expect(panel).toContain("FinanceVarianceComparisonColGroup");
    expect(panel).toContain('mode="FULL_YEAR"');
    expect(panel).toContain("accountColumn");
    expect(panel).toContain("budgetColumn");
    expect(panel).toContain("forecastColumn");
    expect(panel).toContain("deltaColumn");
    expect(panel).toContain("ratingColumn");
    expect(de).toContain('"deltaColumn": "Abweichung"');
  });

  it("rests forecast amounts on canonical whole-major formatting without per-cell currency", () => {
    expect(panel).toContain("formatBudgetPlanningWholeMajorNumber");
    expect(panel).toContain("FINANCE_FORECAST_MONEY_CELL_INPUT_CLASS");
    expect(panel).not.toContain("FINANCE_BUDGET_AMOUNT_INPUT_CLASS");
  });

  it("keeps local-first draft updates separate from blur persistence", () => {
    expect(panel).toContain("onLocalDraftChange");
    expect(panel).toContain("onPersist");
    expect(panel).toContain("normalizeBudgetAmountInput");
    expect(panel).toContain("onKeyDown");
  });

  it("uses compact summary strip with single canonical result and no duplicate footer", () => {
    expect(panel).toContain("FINANCE_SUMMARY_STRIP_SURFACE_CLASS");
    expect(panel).toContain('data-finance-forecast-summary="result"');
    expect(panel).toContain("financeResultSemanticTextClass");
    expect(panel).not.toContain("sectionTotals");
  });

  it("shows explicit signed variance separate from favorability labels", () => {
    expect(panel).toContain("formatBudgetPlanningSignedWholeMajorNumber");
    expect(panel).toContain("computeForecastBudgetComparisonMetrics");
    expect(panel).toContain("favorabilityFavorable");
    expect(panel).toContain("financeVarianceComparisonSemanticTextClass");
  });

  it("places persistence feedback near version metadata", () => {
    expect(panel).toContain("data-finance-forecast-persistence");
    expect(panel).toContain("currentVersionLabel");
  });

  it("create modal remains single-choice segmented control without checkboxes", () => {
    expect(panel).toContain("SceSegmentedControl");
    expect(panel).toContain("createModeEmptyDescription");
    expect(panel).toContain("createModeFromBaselineDescription");
    expect(panel).toContain("canInitializeFromBaseline ? \"FROM_BASELINE\" : \"EMPTY\"");
    expect(panel).not.toMatch(/type="checkbox"/);
  });

  it("avoids page-level horizontal overflow architecture regression", () => {
    expect(panel).toContain("FINANCE_VARIANCE_COMPARISON_TABLE_CLASS");
    expect(panel).toContain("min-w-0 overflow-x-auto");
    expect(panel).not.toContain("min-w-[32rem]");
  });
});
