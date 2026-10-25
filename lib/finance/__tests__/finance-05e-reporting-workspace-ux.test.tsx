/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { serializedComparativeIntelligenceStub } from "@/lib/finance/__tests__/fixtures/serialized-comparative-intelligence-stub";

const reportsPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/reports/page.tsx"),
  "utf8",
);
const investigationWorkspace = readFileSync(
  join(
    process.cwd(),
    "components/admin/finance/reporting/FinanceReportingInvestigationWorkspace.tsx",
  ),
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

const model: SerializedFinanceManagementPnlReadModel = {
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
    budgetedResult: null,
    expectedResult: null,
    forecastVsBudgetManagementResult: emptySlice,
  },
  incomeSection: {
    semantic: "INCOME",
    sectionTotal: {
      approvedBudget: { availability: "AVAILABLE", amountMinor: 100_00 },
      actual: { availability: "AVAILABLE", amountMinor: 90_00 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 110_00 },
      forecastVsBudget: { ...emptySlice, availability: "AVAILABLE", rawDeltaMinor: 10_00 },
    },
    nodes: [
      {
        kind: "account",
        accountId: "acc-1",
        name: "Membership",
        reportingGroupId: "g1",
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "INCOME",
        approvedBudget: { availability: "AVAILABLE", amountMinor: 100_00 },
        actual: { availability: "AVAILABLE", amountMinor: 90_00 },
        currentForecast: { availability: "AVAILABLE", amountMinor: 110_00 },
        forecastVsBudget: { ...emptySlice, availability: "AVAILABLE", rawDeltaMinor: 10_00 },
      },
    ],
  },
  expenseSection: {
    semantic: "EXPENSE",
    sectionTotal: {
      approvedBudget: { availability: "AVAILABLE", amountMinor: 0 },
      actual: { availability: "AVAILABLE", amountMinor: 0 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 0 },
      forecastVsBudget: emptySlice,
    },
    nodes: [],
  },
  managementResult: {
    approvedBudget: { availability: "AVAILABLE", amountMinor: 100_00 },
    actual: { availability: "AVAILABLE", amountMinor: 90_00 },
    currentForecast: { availability: "AVAILABLE", amountMinor: 110_00 },
    forecastVsBudget: emptySlice,
  },
  topFavourableDrivers: [
    {
      kind: "ACCOUNT",
      id: "acc-1",
      name: "Membership",
      canonicalSemantic: "INCOME",
      hierarchySortOrder: 0,
      comparison: { ...emptySlice, availability: "AVAILABLE", rawDeltaMinor: 10_00, favorability: "FAVORABLE" },
      relativeContributionBasisPoints: 10_000,
      rank: 1,
    },
  ],
  topUnfavourableDrivers: [],
  reconciliation: {
    approvedBudget: {
      canonicalIncomeMinor: 100_00,
      canonicalExpenseMinor: 0,
      canonicalResultMinor: 100_00,
      representedIncomeMinor: 100_00,
      representedExpenseMinor: 0,
      representedResultMinor: 100_00,
      reconciles: true,
    },
    actual: {
      canonicalIncomeMinor: 90_00,
      canonicalExpenseMinor: 0,
      canonicalResultMinor: 90_00,
      representedIncomeMinor: 90_00,
      representedExpenseMinor: 0,
      representedResultMinor: 90_00,
      reconciles: true,
    },
    currentForecast: {
      canonicalIncomeMinor: 110_00,
      canonicalExpenseMinor: 0,
      canonicalResultMinor: 110_00,
      representedIncomeMinor: 110_00,
      representedExpenseMinor: 0,
      representedResultMinor: 110_00,
      reconciles: true,
    },
  },
  hasUnassignedFinancialValues: false,
  comparativeIntelligence: serializedComparativeIntelligenceStub(),
};

const labels = {
  pageContextYear: "Year",
  interpretationTitle: "Interpretation",
  budgetedResult: "Budget",
  expectedResult: "Forecast",
  forecastVsBudgetVariance: "Variance",
  driversTitle: "Drivers",
  driversSubtitle: "Subtitle",
  topFavourable: "Favourable",
  topUnfavourable: "Unfavourable",
  exceptionsTitle: "Material variances",
  incomeSection: "Income",
  expenseSection: "Expense",
  incomeSectionTotal: "Total income",
  expenseSectionTotal: "Total expense",
  managementResult: "Result",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnActualYtd: "YTD",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  columnVariancePercent: "Pct",
  unassignedGroup: "Unassigned",
  archivedAccount: "Archived",
  expandAccounts: "Expand",
  collapseAccounts: "Collapse",
  noStructureTitle: "No structure",
  noStructureBody: "Body",
  openStructure: "Open",
  noStructureViewOnly: "View only",
  favorabilityFavorable: "Favourable",
  favorabilityUnfavorable: "Unfavourable",
  favorabilityOnPlan: "On plan",
  partialSourcesHint: "Partial",
  unassignedHint: "Unassigned",
  investigateAccount: "Investigate",
  investigateGroup: "Group detail",
  actualEvidenceTitle: "Actual",
  attentionSignalsTitle: "Attention",
  grainExplanationYtdVsAnnualPlan: "YTD hint",
  grainExplanationAnnualActualAndPlan: "Annual hint",
  signalForecastAboveBudget: "Above",
  signalForecastBelowBudget: "Below",
  signalForecastOnBudget: "On plan",
  signalMaterialFavorableDrivers: "Fav",
  signalMaterialUnfavorableDrivers: "Unfav",
  signalRecordedActualEvidence: "Evidence",
  signalLimitedActualEvidence: "Limited",
  signalMissingBudget: "No budget",
  signalMissingForecast: "No forecast",
};

describe("FIN-05E reporting workspace UX", () => {
  it("wires investigation workspace on reports route", () => {
    expect(reportsPage).toContain("FinanceReportingInvestigationWorkspace");
    expect(reportsPage).toContain('searchParams: Promise<{ yearId?: string; account?: string; group?: string }>');
    expect(reportsPage).toContain('t("reporting.investigation.pageDescription")');
  });

  it("uses server action for lazy detail load", () => {
    expect(investigationWorkspace).toContain("loadFinanceReportingDetailAction");
    expect(investigationWorkspace).toContain("FinanceManagementReportingDetailSheet");
  });

  it("exposes accessible account investigate affordance", async () => {
    const user = userEvent.setup();
    const onInvestigateAccount = vi.fn();
    render(
      <FinanceManagementPnlPanel
        model={model}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateAccount={onInvestigateAccount}
        onInvestigateDriver={vi.fn()}
      />,
    );
    const table = document.querySelector("[data-finance-pnl-table]");
    expect(table).toBeTruthy();
    const accountButton = within(table as HTMLElement).getByRole("button", {
      name: "Investigate: Membership",
    });
    await user.click(accountButton);
    expect(onInvestigateAccount).toHaveBeenCalledWith("acc-1");
  });

  it("marks exceptions section and driver buttons", () => {
    render(
      <FinanceManagementPnlPanel
        model={model}
        formattingLocale="en-GB"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateDriver={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-finance-pnl-exceptions]")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Investigate: Membership" })).toBeTruthy();
  });
});
