/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FinanceReportingPublicationBar } from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import { FinancePublicationFastShareButton } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";
import { FINANCE_06D_R2_FAST_PATH_CONTRACT } from "@/lib/finance/publishing/finance-06d-r2-fast-path-contract";

const getDefaultStatus = vi.fn();
const ensureDefault = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-actions", () => ({
  publishFinanceManagementPnlAction: vi.fn(),
  loadFinancePublicationInspectionAction: vi.fn(),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-share-actions", () => ({
  getDefaultFinancePublicationShareStatusAction: (...args: unknown[]) => getDefaultStatus(...args),
  ensureDefaultFinancePublicationShareAction: (...args: unknown[]) => ensureDefault(...args),
}));

const publicationSummary: SerializedFinancePublicationSummaryReadModel = {
  availability: "AVAILABLE",
  canPublish: true,
  publications: [
    {
      publicationId: "pub-1",
      financeYearId: "fy-2026",
      title: "Erfolgsrechnung",
      currentVersionNumber: 3,
      versions: [
        { versionNumber: 3, lifecycleStatus: "PUBLISHED", publishedAt: "2026-10-26T10:00:00.000Z" },
        { versionNumber: 2, lifecycleStatus: "SUPERSEDED", publishedAt: "2026-10-25T10:00:00.000Z" },
        { versionNumber: 1, lifecycleStatus: "SUPERSEDED", publishedAt: "2026-10-24T10:00:00.000Z" },
      ],
    },
  ],
};

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
  sheetTitle: "Sheet",
  frozenNotice: "Frozen",
  versionHeading: "Version",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  contentTypeLabel: "Erfolgsrechnung",
  statusPublished: "Veröffentlicht",
  statusSuperseded: "Ersetzt",
  downloadPdf: "PDF herunterladen",
  close: "Close",
  shareableHint: "Hint",
  loading: "Loading",
};

const historyLabels = {
  historyAction: "Veröffentlichungen",
  historyTitle: "Veröffentlichungen",
  openVersion: "Ansehen",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  statusPublished: "Veröffentlicht",
  statusSuperseded: "Ersetzt",
  downloadPdf: "PDF herunterladen",
};

const fastShareLabels = {
  shareAction: "Teilen",
  copyLink: "Link kopieren",
  openLink: "Link öffnen",
  linkCopiedTitle: "Copied",
  linkCreatedTitle: "Created",
  linkCopiedBody: "Year {year} v{version}",
  linkCopySuccess: "Copied link",
  createFailed: "Failed",
  manageAction: "Freigabe verwalten",
};

const pnlLabels = {
  pageContextYear: "Year",
  interpretationTitle: "Interpretation",
  budgetedResult: "Budget",
  expectedResult: "Expected",
  forecastVsBudgetVariance: "Variance",
  driversTitle: "Drivers",
  driversSubtitle: "Sub",
  topFavourable: "Top +",
  topUnfavourable: "Top -",
  incomeSection: "Income",
  expenseSection: "Expense",
  incomeSectionTotal: "Income total",
  expenseSectionTotal: "Expense total",
  managementResult: "Result",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnActualYtd: "Actual YTD",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  columnVariancePercent: "Var %",
  unassignedGroup: "Unassigned",
  archivedAccount: "Archived",
  expandAccounts: "Expand",
  collapseAccounts: "Collapse",
  noStructureTitle: "No structure",
  noStructureBody: "Body",
  openStructure: "Open",
  noStructureViewOnly: "View only",
  favorabilityFavorable: "Favorable",
  favorabilityUnfavorable: "Unfavorable",
  favorabilityOnPlan: "On plan",
  partialSourcesHint: "Partial",
  unassignedHint: "Unassigned",
  investigateAccount: "Investigate account",
  investigateGroup: "Investigate group",
  attentionSignalsTitle: "Attention",
  grainExplanationYtdVsAnnualPlan: "YTD",
  grainExplanationAnnualActualAndPlan: "Annual",
  attentionResultFavorableTitle: "Fav",
  attentionResultFavorableDetail: "Fav detail",
  attentionResultUnfavorableTitle: "Unfav",
  attentionResultUnfavorableDetail: "Unfav detail",
  attentionResultOnPlanTitle: "On plan",
  attentionLargestFavorableTitle: "Largest +",
  attentionLargestUnfavorableTitle: "Largest -",
  attentionDriverExpenseSuffix: "expense",
  attentionMissingBudget: "Missing budget",
  attentionMissingForecast: "Missing forecast",
};

function renderPublicationBar() {
  return render(
    <ToastProvider>
      <FinanceReportingPublicationBar
        financeYearId="fy-2026"
        financeYearName="FY 2026"
        formattingLocale="de-CH"
        canPublish
        canShare
        reportPublishable
        publicationSummary={publicationSummary}
        publicationLabels={publicationLabels}
        inspectionLabels={inspectionLabels}
        historyLabels={historyLabels}
        fastShareLabels={fastShareLabels}
        pnlLabels={pnlLabels}
      />
    </ToastProvider>,
  );
}

describe("FIN-06D-R2R2 publication history decoupling", () => {
  beforeEach(() => {
    getDefaultStatus.mockReset();
    ensureDefault.mockReset();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(async () => undefined) },
    });
  });

  it("documents failure-containment architecture invariants", () => {
    expect(FINANCE_06D_R2_FAST_PATH_CONTRACT.PUBLICATION_HISTORY_DEPENDS_ON_SHARING).toBe(false);
    expect(FINANCE_06D_R2_FAST_PATH_CONTRACT.SHARING_FAILURE_CRASHES_PUBLICATION_HISTORY).toBe(
      false,
    );
    expect(FINANCE_06D_R2_FAST_PATH_CONTRACT.PUBLICATION_HISTORY_PRELOADS_SHARE_STATUS).toBe(
      false,
    );
  });

  it("opens Veröffentlichungen with V1/V2/V3 without preloading share status", async () => {
    const user = userEvent.setup();
    renderPublicationBar();

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));

    const versions = document.querySelectorAll("[data-finance-publication-history-version]");
    expect(versions.length).toBe(3);
    expect(versions[0]?.getAttribute("data-finance-publication-history-version")).toBe("3");
    expect(versions[1]?.getAttribute("data-finance-publication-history-version")).toBe("2");
    expect(versions[2]?.getAttribute("data-finance-publication-history-version")).toBe("1");
    expect(getDefaultStatus).not.toHaveBeenCalled();
  });

  it("fast Teilen uses ensure/reuse only on click", async () => {
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: "/share/finance/publication/test-token",
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 3,
      reused: false,
    });

    const user = userEvent.setup();
    renderPublicationBar();

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    const shareButtons = screen.getAllByRole("button", { name: "Teilen" });
    expect(shareButtons.length).toBe(3);
    expect(getDefaultStatus).not.toHaveBeenCalled();

    await user.click(shareButtons[0]!);
    expect(ensureDefault).toHaveBeenCalledWith({
      publicationId: "pub-1",
      versionNumber: 3,
    });
  });

  it("regression: fast share control requires ToastProvider (PO Veröffentlichungen crash class)", () => {
    expect(() =>
      render(
        <FinancePublicationFastShareButton
          publicationId="pub-1"
          versionNumber={3}
          financeYearName="FY 2026"
          labels={fastShareLabels}
        />,
      ),
    ).toThrow(/useToast must be used inside <ToastProvider>/);
  });
});
