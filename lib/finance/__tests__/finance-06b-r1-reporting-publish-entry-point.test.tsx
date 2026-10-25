/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinanceReportingInvestigationWorkspace } from "@/components/admin/finance/reporting/FinanceReportingInvestigationWorkspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canPublishFinancialReports } from "@/lib/finance/publishing/finance-publishing-authorization";
import { TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS } from "@/lib/permissions/tenant-club-admin-permission-contract";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { serializedComparativeIntelligenceStub } from "@/lib/finance/__tests__/fixtures/serialized-comparative-intelligence-stub";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard/finance/reports",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/actions", () => ({
  loadFinanceReportingDetailAction: vi.fn(),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-actions", () => ({
  publishFinanceManagementPnlAction: vi.fn(),
  loadFinancePublicationInspectionAction: vi.fn(),
}));

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

const model: SerializedFinanceManagementPnlReadModel = {
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
    sectionTotal: {
      approvedBudget: { availability: "AVAILABLE", amountMinor: 100_00 },
      actual: { availability: "AVAILABLE", amountMinor: 90_00 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 110_00 },
      forecastVsBudget: { ...emptySlice, availability: "AVAILABLE", rawDeltaMinor: 10_00 },
    },
    nodes: [],
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
  topFavourableDrivers: [],
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

const publicationLabels = {
  publishAction: "Veröffentlichen",
  dialogTitle: "Publish",
  dialogDescription: "Year {year}",
  dialogImmutability: "Immutable",
  dialogContentLabel: "Content",
  dialogContentValue: "Management P&L",
  dialogPeriodLabel: "Period",
  confirmPublish: "Confirm",
  cancel: "Cancel",
  publishing: "Publishing",
  successTitle: "Published",
  successBody: "Version {version}",
  viewLatest: "View",
  notPublishable: "Not publishable",
  forbidden: "Forbidden",
  publishFailed: "Failed",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published at",
  inspectionTitle: "Inspection",
  inspectionEmpty: "Empty",
  close: "Close",
};

const publicationInspectionLabels = {
  sheetTitle: "Inspection sheet",
  frozenNotice: "Frozen",
  versionHeading: "Version",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  contentTypeLabel: "Erfolgsrechnung",
  statusPublished: "Published",
  statusSuperseded: "Superseded",
  close: "Close",
};

const pnlLabels = {
  pageContextYear: "Year",
  interpretationTitle: "Interpretation",
  budgetedResult: "Budget",
  expectedResult: "Forecast",
  forecastVsBudgetVariance: "Variance",
  driversTitle: "Drivers",
  driversSubtitle: "Subtitle",
  topFavourable: "Favourable",
  topUnfavourable: "Unfavourable",
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
  attentionSignalsTitle: "Attention",
  grainExplanationYtdVsAnnualPlan: "YTD hint",
  grainExplanationAnnualActualAndPlan: "Annual hint",
  attentionResultFavorableTitle: "Ahead",
  attentionResultFavorableDetail: "Forecast {amount} above budget.",
  attentionResultUnfavorableTitle: "Below",
  attentionResultUnfavorableDetail: "Forecast {amount} below budget.",
  attentionResultOnPlanTitle: "On plan",
  attentionLargestFavorableTitle: "Largest favourable",
  attentionLargestUnfavorableTitle: "Largest unfavourable",
  attentionDriverExpenseSuffix: "expense",
  attentionMissingBudget: "No budget",
  attentionMissingForecast: "No forecast",
};

describe("FIN-06B-R1 reporting publish entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports route derives publish visibility from finance.reporting.publish on workspace ctx", () => {
    expect(reportsPage).toContain("canPublishReport = canPublishFinancialReports(workspace.ctx)");
    expect(reportsPage).toContain("canViewFinancePublicationHistory");
    expect(reportsPage).toContain("canPublishFinancialReports");
    expect(reportsPage).not.toMatch(/canPublishReport=\{true\}/);
  });

  it("Club Admin regression contract includes FIN-06 publication keys", () => {
    expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(
      PERMISSIONS.FINANCE_REPORTING_PUBLISH,
    );
    expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(
      PERMISSIONS.FINANCE_PUBLICATION_VIEW,
    );
  });

  it("shows Veröffentlichen when effective publish permission is present", () => {
    const permissionKeys = new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_REPORTING_PUBLISH,
    ]);
    expect(canPublishFinancialReports({ tenantId: "t1", userId: "u1", permissionKeys })).toBe(
      true,
    );

    render(
      <FinanceReportingInvestigationWorkspace
        model={model}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        canPublishReport
        publicationLabels={publicationLabels}
        publicationInspectionLabels={publicationInspectionLabels}
        pnlLabels={pnlLabels}
        detailLabels={{} as never}
      />,
    );

    expect(screen.getByRole("button", { name: "Veröffentlichen" })).toBeTruthy();
  });

  it("hides Veröffentlichen when publish permission is absent", () => {
    const permissionKeys = new Set([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_REPORTING_SHARE]);
    expect(canPublishFinancialReports({ tenantId: "t1", userId: "u1", permissionKeys })).toBe(
      false,
    );

    render(
      <FinanceReportingInvestigationWorkspace
        model={model}
        formattingLocale="de-CH"
        canConfigureStructure={false}
        canPublishReport={false}
        publicationLabels={publicationLabels}
        publicationInspectionLabels={publicationInspectionLabels}
        pnlLabels={pnlLabels}
        detailLabels={{} as never}
      />,
    );

    expect(screen.queryByRole("button", { name: "Veröffentlichen" })).toBeNull();
  });
});
