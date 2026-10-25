/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceReportingPublicationBar } from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-actions", () => ({
  publishFinanceManagementPnlAction: vi.fn(),
  loadFinancePublicationInspectionAction: vi.fn(),
}));

const publicationLabels = {
  publishAction: "Veröffentlichen",
  dialogTitle: "Publish",
  dialogDescription: "Year {year}",
  dialogImmutability: "Immutable",
  dialogContentLabel: "Content",
  dialogContentValue: "Erfolgsrechnung",
  dialogPeriodLabel: "Period",
  confirmPublish: "Confirm",
  cancel: "Cancel",
  publishing: "Publishing",
  successTitle: "Success",
  successBody: "Version {version}",
  viewLatest: "View",
  notPublishable: "Not ready",
  forbidden: "Forbidden",
  publishFailed: "Failed",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  inspectionTitle: "Inspection",
  inspectionEmpty: "Empty",
  close: "Close",
};

const inspectionLabels = {
  sheetTitle: "Veröffentlichte Erfolgsrechnung",
  frozenNotice: "Frozen",
  versionHeading: "Version",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  contentTypeLabel: "Erfolgsrechnung",
  statusPublished: "Veröffentlicht",
  statusSuperseded: "Ersetzt",
  close: "Close",
};

const historyLabels = {
  historyAction: "Veröffentlichungen",
  historyTitle: "Veröffentlichungen",
  openVersion: "Ansehen",
  versionLabel: "Version {version}",
  publishedAtLabel: "Veröffentlicht",
  statusPublished: "Veröffentlicht",
  statusSuperseded: "Ersetzt",
};

const pnlLabels = {
  pageContextYear: "Year",
  interpretationTitle: "Summary",
  budgetedResult: "Budget",
  expectedResult: "Forecast",
  forecastVsBudgetVariance: "Variance",
  driversTitle: "Drivers",
  driversSubtitle: null,
  topFavourable: "Top",
  topUnfavourable: "Bottom",
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
  favorabilityFavorable: "Günstig",
  favorabilityUnfavorable: "Ungünstig",
  favorabilityOnPlan: "Im Plan",
  partialSourcesHint: "Partial",
  unassignedHint: "Unassigned",
  investigateAccount: "Investigate",
  investigateGroup: "Group",
  attentionSignalsTitle: "Attention",
  grainExplanationYtdVsAnnualPlan: "YTD",
  grainExplanationAnnualActualAndPlan: "Annual",
  attentionResultFavorableTitle: "A",
  attentionResultFavorableDetail: "B",
  attentionResultUnfavorableTitle: "C",
  attentionResultUnfavorableDetail: "D",
  attentionResultOnPlanTitle: "E",
  attentionLargestFavorableTitle: "F",
  attentionLargestUnfavorableTitle: "G",
  attentionDriverExpenseSuffix: "H",
  attentionMissingBudget: "I",
  attentionMissingForecast: "J",
};

const emptySummary: SerializedFinancePublicationSummaryReadModel = {
  availability: "EMPTY",
  canPublish: true,
  publications: [],
};

const withVersions: SerializedFinancePublicationSummaryReadModel = {
  availability: "AVAILABLE",
  canPublish: true,
  publications: [
    {
      publicationId: "pub-1",
      financeYearId: "fy-2026",
      title: "FY 2026",
      currentVersionNumber: 2,
      versions: [
        {
          versionNumber: 2,
          lifecycleStatus: "PUBLISHED",
          publishedAt: "2026-10-26T10:00:00.000Z",
        },
        {
          versionNumber: 1,
          lifecycleStatus: "SUPERSEDED",
          publishedAt: "2026-10-25T12:00:00.000Z",
        },
      ],
    },
  ],
};

describe("FIN-06B-R4 publication discoverability", () => {
  it("does not show history affordance when no publications exist", () => {
    render(
      <FinanceReportingPublicationBar
        financeYearId="fy-2026"
        financeYearName="FY 2026"
        formattingLocale="de-CH"
        canPublish
        reportPublishable
        publicationSummary={emptySummary}
        publicationLabels={publicationLabels}
        inspectionLabels={inspectionLabels}
        historyLabels={historyLabels}
        pnlLabels={pnlLabels}
      />,
    );

    expect(screen.queryByRole("button", { name: "Veröffentlichungen" })).toBeNull();
    expect(document.querySelector('[data-finance-publication-history="visible"]')).toBeNull();
  });

  it("shows history affordance and sorts versions newest first", async () => {
    const user = userEvent.setup();
    render(
      <FinanceReportingPublicationBar
        financeYearId="fy-2026"
        financeYearName="FY 2026"
        formattingLocale="de-CH"
        canPublish
        reportPublishable
        publicationSummary={withVersions}
        publicationLabels={publicationLabels}
        inspectionLabels={inspectionLabels}
        historyLabels={historyLabels}
        pnlLabels={pnlLabels}
      />,
    );

    expect(screen.getByRole("button", { name: "Veröffentlichungen" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    const versionButtons = document.querySelectorAll(
      "[data-finance-publication-history-version]",
    );
    expect(versionButtons[0]?.getAttribute("data-finance-publication-history-version")).toBe("2");
    expect(versionButtons[1]?.getAttribute("data-finance-publication-history-version")).toBe("1");
    expect(
      versionButtons[1]?.getAttribute("data-finance-publication-lifecycle"),
    ).toBe("SUPERSEDED");
  });

  it("uses large inspection sheet surface marker", () => {
    render(
      <FinanceReportingPublicationBar
        financeYearId="fy-2026"
        financeYearName="FY 2026"
        formattingLocale="de-CH"
        canPublish={false}
        reportPublishable
        publicationSummary={withVersions}
        publicationLabels={publicationLabels}
        inspectionLabels={inspectionLabels}
        historyLabels={historyLabels}
        pnlLabels={pnlLabels}
      />,
    );

    expect(document.querySelector("[data-finance-publication-inspection]")).toBeNull();
    expect(
      document.querySelector('[data-finance-publication-bar][data-finance-publication-history="visible"]'),
    ).toBeTruthy();
  });
});
