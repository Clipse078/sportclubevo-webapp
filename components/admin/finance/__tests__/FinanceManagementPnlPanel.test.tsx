/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { serializedComparativeIntelligenceStub } from "@/lib/finance/__tests__/fixtures/serialized-comparative-intelligence-stub";

const reportsPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/reports/page.tsx"),
  "utf8",
);

const emptySlice = {
  availability: "BOTH_MISSING" as const,
  baselineMinor: null,
  comparisonMinor: null,
  rawDeltaMinor: null,
  variancePercent: null,
  favorability: null,
  absoluteVarianceMagnitudeMinor: null,
};

const baseModel: SerializedFinanceManagementPnlReadModel = {
  tenantId: "t1",
  financeYearId: "y1",
  financeYearName: "FY2026",
  mode: "LIVE",
  baseCurrency: "EUR",
  availability: "AVAILABLE",
  actualCutoffDate: null,
  actualGrain: "ANNUAL_FULL_YEAR",
  sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
  approvedBudget: { availability: "AVAILABLE", approvedBudgetVersionId: "bv1" },
  actual: { availability: "AVAILABLE", grain: "ANNUAL_FULL_YEAR" },
  currentForecast: { availability: "AVAILABLE", currentForecastVersionId: "fv1" },
  actualVsBudgetVariance: emptySlice,
  interpretation: {
    budgetedResult: { incomeMinor: 100_00, expenseMinor: 40_00, resultMinor: 60_00 },
    expectedResult: { incomeMinor: 110_00, expenseMinor: 45_00, resultMinor: 65_00 },
    forecastVsBudgetManagementResult: {
      ...emptySlice,
      availability: "AVAILABLE",
      rawDeltaMinor: 5_00,
      favorability: "FAVORABLE",
    },
  },
  incomeSection: {
    semantic: "INCOME",
    sectionTotal: {
      approvedBudget: { availability: "AVAILABLE", amountMinor: 100_00 },
      actual: { availability: "AVAILABLE", amountMinor: 90_00 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 110_00 },
      forecastVsBudget: {
        ...emptySlice,
        availability: "AVAILABLE",
        rawDeltaMinor: 10_00,
        favorability: "FAVORABLE",
      },
    },
    nodes: [],
  },
  expenseSection: {
    semantic: "EXPENSE",
    sectionTotal: {
      approvedBudget: { availability: "AVAILABLE", amountMinor: 40_00 },
      actual: { availability: "AVAILABLE", amountMinor: 35_00 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 45_00 },
      forecastVsBudget: {
        ...emptySlice,
        availability: "AVAILABLE",
        rawDeltaMinor: 5_00,
        favorability: "UNFAVORABLE",
      },
    },
    nodes: [],
  },
  managementResult: {
    approvedBudget: { availability: "AVAILABLE", amountMinor: 60_00 },
    actual: { availability: "AVAILABLE", amountMinor: 55_00 },
    currentForecast: { availability: "AVAILABLE", amountMinor: 65_00 },
    forecastVsBudget: {
      ...emptySlice,
      availability: "AVAILABLE",
      rawDeltaMinor: 5_00,
      favorability: "FAVORABLE",
    },
  },
  topFavourableDrivers: [],
  topUnfavourableDrivers: [],
  reconciliation: {
    approvedBudget: {
      canonicalIncomeMinor: 100_00,
      canonicalExpenseMinor: 40_00,
      canonicalResultMinor: 60_00,
      representedIncomeMinor: 100_00,
      representedExpenseMinor: 40_00,
      representedResultMinor: 60_00,
      reconciles: true,
    },
    actual: {
      canonicalIncomeMinor: 90_00,
      canonicalExpenseMinor: 35_00,
      canonicalResultMinor: 55_00,
      representedIncomeMinor: 90_00,
      representedExpenseMinor: 35_00,
      representedResultMinor: 55_00,
      reconciles: true,
    },
    currentForecast: {
      canonicalIncomeMinor: 110_00,
      canonicalExpenseMinor: 45_00,
      canonicalResultMinor: 65_00,
      representedIncomeMinor: 110_00,
      representedExpenseMinor: 45_00,
      representedResultMinor: 65_00,
      reconciles: true,
    },
  },
  hasUnassignedFinancialValues: false,
  comparativeIntelligence: serializedComparativeIntelligenceStub(),
};

const labels = {
  pageContextYear: "Financial year",
  interpretationTitle: "Interpretation",
  budgetedResult: "Budget result",
  expectedResult: "Expected result",
  forecastVsBudgetVariance: "Forecast vs budget",
  driversTitle: "Drivers",
  driversSubtitle: "Variance vs approved budget plan",
  topFavourable: "Favourable",
  topUnfavourable: "Unfavourable",
  incomeSection: "Income",
  expenseSection: "Expense",
  incomeSectionTotal: "Total income",
  expenseSectionTotal: "Total expense",
  managementResult: "Result",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnActualYtd: "Actual YTD",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  columnVariancePercent: "Variance percentage",
  unassignedGroup: "Unassigned",
  archivedAccount: "Archived",
  expandAccounts: "Expand",
  collapseAccounts: "Collapse",
  noStructureTitle: "No structure",
  noStructureBody: "Configure structure",
  openStructure: "Open structure",
  noStructureViewOnly: "View only",
  favorabilityFavorable: "Favourable",
  favorabilityUnfavorable: "Unfavourable",
  favorabilityOnPlan: "On plan",
  partialSourcesHint: "Partial",
  unassignedHint: "Unassigned amounts",
  investigateAccount: "Investigate",
  investigateGroup: "Group detail",
  attentionSignalsTitle: "Attention",
  grainExplanationYtdVsAnnualPlan: "YTD hint",
  grainExplanationAnnualActualAndPlan: "Annual hint",
  attentionResultFavorableTitle: "Result ahead of plan",
  attentionResultFavorableDetail: "Forecast is {amount} above budget.",
  attentionResultUnfavorableTitle: "Result below plan",
  attentionResultUnfavorableDetail: "Forecast is {amount} below budget.",
  attentionResultOnPlanTitle: "On plan",
  attentionLargestFavorableTitle: "Largest favourable variance",
  attentionLargestUnfavorableTitle: "Largest unfavourable variance",
  attentionDriverExpenseSuffix: "expense",
  attentionMissingBudget: "Missing budget",
  attentionMissingForecast: "Missing forecast",
};

describe("FinanceManagementPnlPanel", () => {
  it("renders interpretation before tabular sections", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    const interpretation = document.querySelector("[data-finance-pnl-interpretation]");
    const table = document.querySelector("[data-finance-pnl-table]");
    expect(interpretation).toBeTruthy();
    expect(table).toBeTruthy();
    expect(
      interpretation!.compareDocumentPosition(table!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows empty structure state without CTA when user cannot configure", () => {
    render(
      <FinanceManagementPnlPanel
        model={{ ...baseModel, availability: "NO_STRUCTURE" }}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    expect(document.querySelector('[data-finance-pnl-empty="no-structure"]')).toBeTruthy();
    expect(screen.queryByText("Open structure")).toBeNull();
  });

  it("uses semantic favourability text alongside variance", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    expect(screen.getAllByText("Favourable").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Finance\.favorability/i)).toBeNull();
  });

  it("keeps positive expense delta sign with unfavourable accessible label", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    expect(screen.getAllByText("Unfavourable").length).toBeGreaterThan(0);
    const sectionTotals = document.querySelectorAll('[data-finance-pnl-row="section-total"]');
    expect(sectionTotals.length).toBe(2);
    expect(sectionTotals[1]?.textContent).toMatch(/\+/);
  });

  it("surfaces material drivers in decision-oriented attention", () => {
    const favourableDriver = {
      kind: "ACCOUNT" as const,
      id: "d1",
      name: "Membership",
      canonicalSemantic: "INCOME" as const,
      hierarchySortOrder: 1,
      rank: 1,
      relativeContributionBasisPoints: 5000,
      comparison: {
        ...emptySlice,
        availability: "AVAILABLE" as const,
        rawDeltaMinor: 37_694_00,
        favorability: "FAVORABLE" as const,
      },
    };
    const unfavourableDriver = {
      kind: "ACCOUNT" as const,
      id: "d2",
      name: "Staff",
      canonicalSemantic: "EXPENSE" as const,
      hierarchySortOrder: 2,
      rank: 1,
      relativeContributionBasisPoints: 4000,
      comparison: {
        ...emptySlice,
        availability: "AVAILABLE" as const,
        rawDeltaMinor: 24_124_00,
        favorability: "UNFAVORABLE" as const,
      },
    };
    render(
      <FinanceManagementPnlPanel
        model={{
          ...baseModel,
          topFavourableDrivers: [favourableDriver],
          topUnfavourableDrivers: [unfavourableDriver],
          comparativeIntelligence: serializedComparativeIntelligenceStub({
            attentionInsights: [
              {
                kind: "OVERALL_RESULT",
                favorability: "FAVORABLE",
                rawDeltaMinor: 5_00,
              },
              { kind: "FAVORABLE_DRIVER", driver: favourableDriver },
              { kind: "UNFAVORABLE_DRIVER", driver: unfavourableDriver },
            ],
          }),
        }}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateDriver={vi.fn()}
      />,
    );
    expect(screen.getByText("Largest favourable variance")).toBeTruthy();
    expect(screen.getByText("Largest unfavourable variance")).toBeTruthy();
    expect(screen.getByText(/Membership/)).toBeTruthy();
    expect(screen.getByText(/Staff/)).toBeTruthy();
    expect(document.querySelector("[data-finance-pnl-exceptions]")).toBeNull();
  });

  it("resolves favorability labels from Finance.actuals translations on the page", () => {
    expect(reportsPage).toContain('t("actuals.favorabilityFavorable")');
    expect(reportsPage).toContain('t("actuals.favorabilityUnfavorable")');
    expect(reportsPage).toContain('t("actuals.favorabilityOnPlan")');
    expect(reportsPage).not.toContain('t("favorabilityFavorable")');
  });

  it("uses pnl translation keys for interpretation labels on the page", () => {
    expect(reportsPage).toContain('t("reporting.pnl.budgetedResult")');
    expect(reportsPage).toContain('t("reporting.pnl.varianceVsBudget")');
    expect(reportsPage).toContain('t("reporting.pnl.driversSubtitle")');
  });

  it("does not render directional favourability arrows in variance cells", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    const panel = document.querySelector("[data-finance-pnl-panel]");
    expect(panel?.querySelector("svg.lucide-arrow-up")).toBeNull();
    expect(panel?.querySelector("svg.lucide-arrow-down")).toBeNull();
  });

  it("shows YTD actual cutoff in table column headers when grain is YTD", () => {
    render(
      <FinanceManagementPnlPanel
        model={{
          ...baseModel,
          actualGrain: "YTD",
          actualCutoffDate: "2026-10-25T00:00:00.000Z",
        }}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    const headers = Array.from(document.querySelectorAll("th")).map((th) => th.textContent ?? "");
    expect(headers.some((text) => text.includes("Actual YTD") && text.includes("2026"))).toBe(true);
  });

  it("does not fabricate actual cutoff in column headers for annual grain", () => {
    render(
      <FinanceManagementPnlPanel
        model={{
          ...baseModel,
          actualGrain: "ANNUAL_FULL_YEAR",
          actualCutoffDate: null,
        }}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    const headers = Array.from(document.querySelectorAll("th")).map((th) => th.textContent ?? "");
    expect(headers.filter((text) => text === "Actual").length).toBeGreaterThan(0);
    expect(headers.some((text) => text.includes("YTD"))).toBe(false);
  });

  it("wraps income, expense, and result in one statement container", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    const statement = document.querySelector("[data-finance-pnl-statement]");
    expect(statement?.querySelector('[data-finance-pnl-table]')).toBeTruthy();
    expect(statement?.querySelector('[data-finance-pnl-result-table]')).toBeTruthy();
  });

  it("labels section totals distinctly from section headings", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
      />,
    );
    expect(screen.getByText("Total income")).toBeTruthy();
    expect(screen.getByText("Total expense")).toBeTruthy();
  });
});
