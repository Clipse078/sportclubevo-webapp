/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";

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
};

const labels = {
  pageContextYear: "Financial year",
  interpretationTitle: "Interpretation",
  budgetedResult: "Budget result",
  expectedResult: "Expected result",
  forecastVsBudgetVariance: "Forecast vs budget",
  driversTitle: "Drivers",
  topFavourable: "Favourable",
  topUnfavourable: "Unfavourable",
  incomeSection: "Income",
  expenseSection: "Expense",
  managementResult: "Result",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnActualYtd: "Actual YTD",
  columnForecast: "Forecast",
  columnForecastVsBudget: "Forecast vs budget",
  columnVariancePercent: "Var %",
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
  });
});
