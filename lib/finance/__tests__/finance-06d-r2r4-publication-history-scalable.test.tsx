/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FinanceReportingPublicationBar } from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import { FINANCE_06D_R2R4_PUBLICATION_HISTORY_CONTRACT } from "@/lib/finance/publishing/finance-publication-history-contract";
import { FINANCE_PUBLICATION_HISTORY_PAGE_SIZE } from "@/lib/finance/publishing/finance-publication-history-contract";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";

const loadHistory = vi.fn();
const listShares = vi.fn();
const ensureDefault = vi.fn();
const getDefaultStatus = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-actions", () => ({
  publishFinanceManagementPnlAction: vi.fn(),
  loadFinancePublicationInspectionAction: vi.fn(),
  loadFinancePublicationVersionHistoryAction: (...args: unknown[]) => loadHistory(...args),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-share-actions", () => ({
  getDefaultFinancePublicationShareStatusAction: (...args: unknown[]) => getDefaultStatus(...args),
  ensureDefaultFinancePublicationShareAction: (...args: unknown[]) => ensureDefault(...args),
  listFinancePublicationSharesAction: (...args: unknown[]) => listShares(...args),
  revokeFinancePublicationShareAction: vi.fn(),
  createFinancePublicationShareAction: vi.fn(),
}));

const publicationSummary: SerializedFinancePublicationSummaryReadModel = {
  availability: "AVAILABLE",
  canPublish: true,
  publications: [
    {
      publicationId: "pub-1",
      financeYearId: "fy-2026",
      title: "Erfolgsrechnung",
      currentVersionNumber: 12,
      versionCount: 12,
      versions: [],
    },
  ],
};

const baseProps = {
  financeYearId: "fy-2026",
  financeYearName: "FY 2026",
  formattingLocale: "de-CH",
  canPublish: true,
  canShare: true,
  canRevokeShares: true,
  reportPublishable: true,
  publicationSummary,
  publicationLabels: {
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
  },
  inspectionLabels: {
    sheetTitle: "Sheet",
    frozenNotice: "Frozen",
    versionHeading: "Version",
    versionLabel: "Version {version}",
    publishedAtLabel: "Published",
    contentTypeLabel: "Erfolgsrechnung",
    statusPublished: "Veröffentlicht",
    statusSuperseded: "Ersetzt",
    downloadPdf: "PDF",
    close: "Close",
    shareableHint: "Hint",
    loading: "Loading",
  },
  historyLabels: {
    historyAction: "Veröffentlichungen",
    historyTitle: "Veröffentlichungen",
    openVersion: "Ansehen",
    versionLabel: "Version {version}",
    publishedAtLabel: "Published",
    statusPublished: "Veröffentlicht",
    statusSuperseded: "Ersetzt",
    downloadPdf: "PDF",
    close: "Close",
    loading: "Loading history",
    loadingMore: "Loading more",
    loadOlder: "Ältere Versionen laden",
    empty: "Empty",
  },
  fastShareLabels: {
    shareAction: "Teilen",
    copyLink: "Link kopieren",
    openLink: "Link öffnen",
    linkCopiedTitle: "Copied",
    linkCreatedTitle: "Created",
    linkCopiedBody: "Body",
    linkCopySuccess: "Copied",
    createFailed: "Failed",
    manageAction: "Freigabe verwalten",
  },
  shareManagementLabels: {
    sectionTitle: "Freigaben",
    dialogTitle: "Freigabe verwalten · Version {version}",
    empty: "Empty shares",
    noActiveShare: "Noch keine aktive Freigabe.",
    createDefaultLink: "Freigabelink erstellen",
    statusActive: "Aktiv",
    statusExpired: "Abgelaufen",
    statusRevoked: "Widerrufen",
    createdLabel: "Erstellt",
    expiresLabel: "Läuft ab",
    expiresNone: "Ohne Ablaufdatum",
    creatorLabel: "Von",
    revoke: "Widerrufen",
    revoking: "Widerrufen…",
    revokeFailed: "Failed",
    revokeConfirmTitle: "Confirm",
    revokeConfirmDescription: "Desc",
    revokeSuccess: "Done",
    copyLink: "Link kopieren",
    openLink: "Link öffnen",
    linkCopied: "Copied",
    loadFailed: "Load failed",
    advancedTitle: "Advanced",
    expirySection: "Expiry",
    expiryNone: "None",
    expiryDate: "Date",
    expiryDateLabel: "Until",
    createAdvancedShare: "Create",
    creating: "Creating",
    createFailed: "Create failed",
    manageAction: "Freigabe verwalten",
    cancel: "Cancel",
  },
  pnlLabels: {
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
    favorabilityFavorable: "Favorable",
    favorabilityUnfavorable: "Unfavorable",
    favorabilityOnPlan: "On plan",
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
  },
};

function makeVersions(count: number, start: number) {
  return Array.from({ length: count }, (_, i) => ({
    versionNumber: start - i,
    lifecycleStatus: i === 0 ? "PUBLISHED" : "SUPERSEDED",
    publishedAt: "2026-10-26T10:00:00.000Z",
  }));
}

describe("FIN-06D-R2R4 scalable publication history", () => {
  beforeEach(() => {
    loadHistory.mockReset();
    listShares.mockReset();
    ensureDefault.mockReset();
    getDefaultStatus.mockReset();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(async () => undefined) },
    });
  });

  it("documents R2R4 architecture invariants", () => {
    expect(FINANCE_06D_R2R4_PUBLICATION_HISTORY_CONTRACT.PUBLICATION_HISTORY_DEPENDS_ON_SHARING).toBe(
      false,
    );
    expect(FINANCE_06D_R2R4_PUBLICATION_HISTORY_CONTRACT.SHARE_MANAGEMENT_LOADS_LAZILY).toBe(true);
    expect(
      FINANCE_06D_R2R4_PUBLICATION_HISTORY_CONTRACT.NO_N_PLUS_ONE_SHARE_STATUS_ON_HISTORY_OPEN,
    ).toBe(true);
    expect(FINANCE_PUBLICATION_HISTORY_PAGE_SIZE).toBe(10);
  });

  it("loads bounded initial batch and older versions on demand without share preload", async () => {
    loadHistory
      .mockResolvedValueOnce({
        ok: true,
        versions: makeVersions(10, 12),
        hasOlder: true,
        nextCursorVersionNumber: 3,
      })
      .mockResolvedValueOnce({
        ok: true,
        versions: makeVersions(2, 2),
        hasOlder: false,
        nextCursorVersionNumber: null,
      });

    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FinanceReportingPublicationBar {...baseProps} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));

    await waitFor(() => {
      expect(document.querySelectorAll("[data-finance-publication-history-version]").length).toBe(
        10,
      );
    });
    expect(getDefaultStatus).not.toHaveBeenCalled();
    expect(listShares).not.toHaveBeenCalled();
    expect(loadHistory).toHaveBeenCalledWith({ publicationId: "pub-1" });

    await user.click(screen.getByRole("button", { name: "Ältere Versionen laden" }));

    await waitFor(() => {
      expect(document.querySelectorAll("[data-finance-publication-history-version]").length).toBe(
        12,
      );
    });
    expect(loadHistory).toHaveBeenLastCalledWith({
      publicationId: "pub-1",
      cursorVersionNumber: 3,
    });
  });

  it("loads share state only when Freigabe verwalten is selected", async () => {
    loadHistory.mockResolvedValueOnce({
      ok: true,
      versions: makeVersions(1, 4),
      hasOlder: false,
      nextCursorVersionNumber: null,
    });
    listShares.mockResolvedValueOnce({ ok: true, shares: [] });

    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FinanceReportingPublicationBar {...baseProps} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Freigabe verwalten" })).toBeTruthy();
    });
    expect(listShares).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Freigabe verwalten" }));

    await waitFor(() => {
      expect(listShares).toHaveBeenCalledTimes(1);
    });
    expect(listShares).toHaveBeenCalledWith({ publicationId: "pub-1", versionNumber: 4 });
  });

  it("hides Freigabe verwalten without manage permission", async () => {
    loadHistory.mockResolvedValueOnce({
      ok: true,
      versions: makeVersions(1, 1),
      hasOlder: false,
      nextCursorVersionNumber: null,
    });

    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FinanceReportingPublicationBar {...baseProps} canRevokeShares={false} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Teilen" })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Freigabe verwalten" })).toBeNull();
  });
});
