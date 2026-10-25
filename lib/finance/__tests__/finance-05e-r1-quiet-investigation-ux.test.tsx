/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import { FinanceManagementReportingDetailSheet } from "@/components/admin/finance/reporting/FinanceManagementReportingDetailSheet";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import type { SerializedFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";

const emptySlice = {
  availability: "BOTH_MISSING" as const,
  baselineMinor: null,
  comparisonMinor: null,
  rawDeltaMinor: null,
  variancePercent: null,
  favorability: null,
  absoluteVarianceMagnitudeMinor: null,
};

const measureSlice = {
  approvedBudget: { availability: "AVAILABLE" as const, amountMinor: 100_00 },
  actual: { availability: "AVAILABLE" as const, amountMinor: 90_00 },
  currentForecast: { availability: "AVAILABLE" as const, amountMinor: 110_00 },
  forecastVsBudget: {
    ...emptySlice,
    availability: "AVAILABLE" as const,
    rawDeltaMinor: 10_00,
    favorability: "FAVORABLE" as const,
  },
};

const baseModel: SerializedFinanceManagementPnlReadModel = {
  tenantId: "t1",
  financeYearId: "y1",
  financeYearName: "FY2026",
  mode: "LIVE",
  baseCurrency: "CHF",
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
    sectionTotal: { ...measureSlice },
    nodes: [
      {
        kind: "reporting_group",
        groupId: "g1",
        name: "Membership group",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        children: [
          {
            kind: "account",
            accountId: "acc-1",
            name: "Mitgliedsbeiträge",
            reportingGroupId: "g1",
            sortOrder: 0,
            lifecycle: "ACTIVE",
            archivedAt: null,
            canonicalSemantic: "INCOME",
            ...measureSlice,
          },
        ],
        ...measureSlice,
      },
      {
        kind: "account",
        accountId: "acc-section",
        name: "Section account",
        reportingGroupId: "g2",
        sortOrder: 1,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "INCOME",
        ...measureSlice,
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
  managementResult: { ...measureSlice },
  topFavourableDrivers: [
    {
      kind: "ACCOUNT",
      id: "acc-1",
      name: "Mitgliedsbeiträge",
      canonicalSemantic: "INCOME",
      hierarchySortOrder: 0,
      comparison: measureSlice.forecastVsBudget,
      relativeContributionBasisPoints: 10_000,
      rank: 1,
    },
  ],
  topUnfavourableDrivers: [
    {
      kind: "REPORTING_GROUP",
      id: "g-exp",
      name: "Personal",
      canonicalSemantic: "EXPENSE",
      hierarchySortOrder: 1,
      comparison: {
        ...emptySlice,
        availability: "AVAILABLE",
        rawDeltaMinor: 24_124_00,
        favorability: "UNFAVORABLE",
      },
      relativeContributionBasisPoints: 8_000,
      rank: 1,
    },
  ],
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
  expandAccounts: "Expand accounts",
  collapseAccounts: "Collapse accounts",
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
};

const detailLabels = {
  sheetTitleAccount: "Account",
  sheetTitleGroup: "Reporting group",
  hierarchyLabel: "Hierarchy",
  summaryTitle: "Financial position",
  periodContextTitle: "Actual period context",
  actualGrainAnnual: "Full financial year actual",
  actualGrainYtd: "Actual to date through",
  evidenceTitle: "Supporting evidence",
  actualEntriesTitle: "Actual entries",
  noActualEntries: "No entries",
  evidenceNotVisible: "Not visible",
  sourceActionsTitle: "Manage source data",
  openBudget: "Open budget",
  openActuals: "Open actuals",
  openForecast: "Open forecast",
  openTiming: "Open timing",
  archivedAccount: "Archived",
  unassignedAccount: "Unassigned",
  notFoundTitle: "Not found",
  notFoundBody: "Missing",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  favorabilityFavorable: "Favourable",
  favorabilityUnfavorable: "Unfavourable",
  favorabilityOnPlan: "On plan",
  entryDate: "Date",
  entryAmount: "Amount",
  entryDescription: "Description",
  groupAccountsTitle: "Accounts in this group",
  investigateAccount: "Investigate",
  closeDetail: "Close",
};

const accountDetail: SerializedFinanceManagementReportingDetailReadModel = {
  tenantId: "t1",
  financeYearId: "y1",
  financeYearName: "FY2026",
  baseCurrency: "CHF",
  availability: "AVAILABLE",
  targetKind: "ACCOUNT",
  accountId: "acc-1",
  groupId: null,
  name: "Mitgliedsbeiträge",
  lifecycle: "ACTIVE",
  archivedAt: null,
  canonicalSemantic: "INCOME",
  hierarchyPath: [{ id: "g1", name: "Membership group" }],
  isUnassignedResidual: false,
  actualGrain: "ANNUAL_FULL_YEAR",
  actualCutoffDate: null,
  approvedBudget: { availability: "AVAILABLE", amountMinor: 175_000_00 },
  actual: { availability: "AVAILABLE", amountMinor: 103_400_00 },
  currentForecast: { availability: "AVAILABLE", amountMinor: 212_694_00 },
  forecastVsBudget: {
    ...emptySlice,
    availability: "AVAILABLE",
    rawDeltaMinor: 37_694_00,
    favorability: "FAVORABLE",
  },
  actualEvidence: {
    availability: "AVAILABLE",
    entries: [
      {
        entryId: "e1",
        effectiveDate: "2026-10-01T00:00:00.000Z",
        amountMinor: 50_000_00,
        currency: "CHF",
        description: "Fee batch",
      },
    ],
  },
  sourceActions: {
    budget: { canNavigate: true, href: "/dashboard/finance/budget" },
    actual: { canNavigate: true, href: "/dashboard/finance/actuals" },
    forecast: { canNavigate: false, href: null },
    timing: { canNavigate: false, href: null },
  },
  childAccountSummaries: [],
};

describe("FIN-05E R1 quiet investigation UX", () => {
  it("does not render repeated visible Investigate column labels in the statement", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateAccount={vi.fn()}
        onInvestigateGroup={vi.fn()}
        onInvestigateDriver={vi.fn()}
      />,
    );
    const panel = document.querySelector("[data-finance-pnl-panel]");
    expect(panel?.textContent).not.toMatch(/\bInvestigate\b/);
    expect(screen.queryByRole("button", { name: "Investigate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Group detail" })).toBeNull();
  });

  it("preserves financial column order without an action column", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const headerRow = document.querySelector("[data-finance-pnl-table] thead tr");
    expect(headerRow).toBeTruthy();
    const headers = Array.from(headerRow!.querySelectorAll("th")).map((th) => th.textContent?.trim());
    expect(headers).toEqual(["Income", "Budget", "Actual", "Forecast", "Variance (Pct)"]);
    expect(headers.length).toBe(5);
  });

  it("opens account investigation from the account identity control", async () => {
    const user = userEvent.setup();
    const onInvestigateAccount = vi.fn();
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateAccount={onInvestigateAccount}
      />,
    );
    const table = document.querySelector("[data-finance-pnl-table]");
    await user.click(
      within(table as HTMLElement).getByRole("button", { name: "Investigate: Mitgliedsbeiträge" }),
    );
    expect(onInvestigateAccount).toHaveBeenCalledWith("acc-1");
  });

  it("keeps expand/collapse separate from group investigation", async () => {
    const user = userEvent.setup();
    const onInvestigateGroup = vi.fn();
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateGroup={onInvestigateGroup}
      />,
    );
    const expand = screen.getByRole("button", { name: "Collapse accounts" });
    await user.click(expand);
    expect(onInvestigateGroup).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Group detail: Membership group" }));
    expect(onInvestigateGroup).toHaveBeenCalledWith("g1");
  });

  it("does not mark section totals as drillable", () => {
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const totalRow = document.querySelector('[data-finance-pnl-row="section-total"]');
    expect(totalRow?.getAttribute("data-finance-pnl-drillable")).toBeNull();
  });

  it("routes favourable and unfavourable drivers to account and group targets", async () => {
    const user = userEvent.setup();
    const onInvestigateDriver = vi.fn();
    render(
      <FinanceManagementPnlPanel
        model={baseModel}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        labels={labels}
        onInvestigateDriver={onInvestigateDriver}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Investigate: Mitgliedsbeiträge" }));
    expect(onInvestigateDriver).toHaveBeenCalledWith({ kind: "ACCOUNT", id: "acc-1" });
    await user.click(screen.getByRole("button", { name: "Investigate: Personal" }));
    expect(onInvestigateDriver).toHaveBeenCalledWith({ kind: "REPORTING_GROUP", id: "g-exp" });
  });

  it("orders sheet content identity → summary → evidence → secondary sources", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const body = document.querySelector("[data-finance-reporting-detail-body]");
    expect(body).toBeTruthy();
    const sections = [
      "[data-finance-reporting-detail-identity]",
      "[data-finance-reporting-detail-summary]",
      "[data-finance-reporting-detail-evidence]",
      "[data-finance-reporting-detail-sources]",
    ].map((sel) => body!.querySelector(sel));
    expect(sections.every(Boolean)).toBe(true);
    for (let i = 0; i < sections.length - 1; i++) {
      expect(
        sections[i]!.compareDocumentPosition(sections[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    const summary = body!.querySelector("[data-finance-reporting-detail-summary]");
    const sources = body!.querySelector("[data-finance-reporting-detail-sources]");
    expect(within(summary as HTMLElement).getByText("Budget")).toBeTruthy();
    expect(within(sources as HTMLElement).getByText("Open budget")).toBeTruthy();
  });
});
