/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceManagementReportingDetailSheet } from "@/components/admin/finance/reporting/FinanceManagementReportingDetailSheet";
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

const detailLabels = {
  sheetTitleAccount: "Account",
  sheetTitleGroup: "Reporting group",
  hierarchyLabel: "Hierarchy",
  summaryTitle: "Financial position",
  periodContextTitle: "Actual period context",
  actualGrainAnnual: "Full financial year",
  actualGrainYtd: "Actual through",
  evidenceTitle: "Recorded actual values",
  actualEntriesTitle: "Entries",
  noActualEntries: "No entries",
  evidenceNotVisible: "Not visible",
  sourceActionsTitle: "Source data",
  openBudget: "Budget",
  openActuals: "Actuals",
  openForecast: "Forecast",
  openTiming: "Timing",
  archivedAccount: "Archived",
  unassignedAccount: "Unassigned",
  notFoundTitle: "Not found",
  notFoundBody: "Missing",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  varianceVsBudgetLabel: "Variance vs budget",
  favorabilityFavorable: "Favourable",
  favorabilityUnfavorable: "Unfavourable",
  favorabilityOnPlan: "On plan",
  entryDate: "Date",
  entryAmount: "Amount",
  entryDescription: "Description",
  evidenceEntryFallback: "Actual entry",
  evidenceShowAll: "Show all {count} entries",
  evidenceReconciliationSummary: "{count} entries · {total}",
  evidenceReconciliationRestricted: "Restricted",
  groupAccountsTitle: "Composition",
  investigateAccount: "Investigate",
  closeDetail: "Close",
  semanticIncomeLabel: "Income",
  semanticExpenseLabel: "Expense",
  targetKindAccountLabel: "Account",
  targetKindGroupLabel: "Reporting group",
  actualContextSeparator: " · ",
  interpretationForecastAboveBudget: "Forecast is {variance} above budget.",
  interpretationForecastBelowBudget: "Forecast is {variance} below budget.",
  interpretationForecastOnBudget: "Forecast matches budget.",
};

function accountDetail(
  overrides: Partial<SerializedFinanceManagementReportingDetailReadModel> = {},
): SerializedFinanceManagementReportingDetailReadModel {
  return {
    tenantId: "t1",
    financeYearId: "y1",
    financeYearName: "FY2026",
    baseCurrency: "CHF",
    availability: "AVAILABLE",
    targetKind: "ACCOUNT",
    accountId: "acc-1",
    groupId: "g1",
    name: "Mitgliedsbeiträge",
    lifecycle: "ACTIVE",
    archivedAt: null,
    canonicalSemantic: "INCOME",
    hierarchyPath: [{ id: "g1", name: "Einnahmen" }],
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
      variancePercent: 21.5,
      absoluteVarianceMagnitudeMinor: 37_694_00,
    },
    actualEvidence: {
      availability: "AVAILABLE",
      entries: [
        {
          entryId: "e1",
          effectiveDate: "2026-01-06T00:00:00.000Z",
          amountMinor: 13_200_00,
          currency: "CHF",
          description: "January batch",
        },
        {
          entryId: "e2",
          effectiveDate: "2026-02-06T00:00:00.000Z",
          amountMinor: 12_100_00,
          currency: "CHF",
          description: "FIXTURE|AUTO|001",
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
    ...overrides,
  };
}

describe("FIN-05E R2 premium investigation sheet", () => {
  it("uses account name once in sheet chrome without duplicate body title", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mitgliedsbeiträge" })).toBeTruthy();
    const body = document.querySelector("[data-finance-reporting-detail-body]");
    expect(body).toBeTruthy();
    const nameOccurrences = (body!.textContent ?? "").split("Mitgliedsbeiträge").length - 1;
    expect(nameOccurrences).toBe(0);
    expect(document.querySelector("[data-finance-reporting-detail-identity]")).toBeNull();
  });

  it("shows hierarchy context and income account metadata", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    expect(screen.getByText("Income · Account")).toBeTruthy();
    expect(document.querySelector("[data-finance-reporting-detail-hierarchy]")?.textContent).toBe(
      "Einnahmen",
    );
  });

  it("renders interpretation, compact actual period, and variance emphasis", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-finance-reporting-detail-interpretation]")).toBeTruthy();
    expect(screen.getByText("Full financial year")).toBeTruthy();
    expect(screen.getByText("Variance vs budget")).toBeTruthy();
    expect(document.querySelector("[data-finance-reporting-detail-period]")).toBeNull();
  });

  it("lists evidence chronologically without exposing opaque descriptions", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const list = document.querySelector("[data-finance-reporting-detail-evidence-list]");
    expect(list).toBeTruthy();
    expect(within(list as HTMLElement).getByText("January batch")).toBeTruthy();
    expect(list!.textContent).not.toContain("FIXTURE|AUTO|001");
    expect(list!.textContent).not.toContain("entryId");
    expect(document.querySelector("[data-finance-reporting-detail-evidence-list] table")).toBeNull();
  });

  it("shows reconciliation summary when entries explain actual", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail({
          actual: { availability: "AVAILABLE", amountMinor: 25_300_00 },
        })}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-finance-reporting-detail-evidence-reconciliation]")).toBeTruthy();
  });

  it("uses secondary source navigation links instead of button bar", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const sources = document.querySelector("[data-finance-reporting-detail-sources]");
    expect(sources).toBeTruthy();
    expect(within(sources as HTMLElement).getByRole("link", { name: /Budget/i })).toBeTruthy();
    expect(sources!.querySelector("button")).toBeNull();
  });

  it("expands long evidence lists on demand", async () => {
    const user = userEvent.setup();
    const manyEntries = Array.from({ length: 15 }, (_, i) => ({
      entryId: `e-${i}`,
      effectiveDate: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      amountMinor: 1_00,
      currency: "CHF",
      description: null,
    }));
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail({
          actual: { availability: "AVAILABLE", amountMinor: 15_00 },
          actualEvidence: { availability: "AVAILABLE", entries: manyEntries },
        })}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const list = document.querySelector("[data-finance-reporting-detail-evidence-list]");
    expect(list!.querySelectorAll("li").length).toBe(12);
    await user.click(screen.getByRole("button", { name: "Show all 15 entries" }));
    expect(list!.querySelectorAll("li").length).toBe(15);
  });

  it("orders body as interpretation summary → evidence → sources", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const body = document.querySelector("[data-finance-reporting-detail-body]");
    const sections = [
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
  });

  it("applies restrained desktop width class on sheet panel", () => {
    render(
      <FinanceManagementReportingDetailSheet
        open
        onClose={vi.fn()}
        detail={accountDetail()}
        loading={false}
        formattingLocale="de-CH"
        labels={detailLabels}
        onInvestigateAccount={vi.fn()}
      />,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain("720px");
    expect(dialog?.className).not.toContain("820px");
  });
});
