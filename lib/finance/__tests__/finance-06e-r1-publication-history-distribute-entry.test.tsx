/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FinanceReportingPublicationBar } from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";
import { FINANCE_06E_PUBLICATION_HISTORY_CONTRACT } from "@/lib/finance/publishing/finance-publication-distribution-contract";

const loadHistory = vi.fn();
const loadDistributionHistory = vi.fn();
const sendDistribution = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-actions", () => ({
  publishFinanceManagementPnlAction: vi.fn(),
  loadFinancePublicationInspectionAction: vi.fn(),
  loadFinancePublicationVersionHistoryAction: (...args: unknown[]) => loadHistory(...args),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-share-actions", () => ({
  getDefaultFinancePublicationShareStatusAction: vi.fn(),
  ensureDefaultFinancePublicationShareAction: vi.fn(),
  listFinancePublicationSharesAction: vi.fn(),
}));

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-distribution-actions", () => ({
  loadFinancePublicationDistributionHistoryAction: (...args: unknown[]) =>
    loadDistributionHistory(...args),
  sendFinancePublicationDistributionAction: (...args: unknown[]) => sendDistribution(...args),
  loadFinancePublicationDistributionDetailAction: vi.fn(),
}));

const publicationSummary: SerializedFinancePublicationSummaryReadModel = {
  availability: "AVAILABLE",
  canPublish: true,
  publications: [
    {
      publicationId: "pub-version-4",
      financeYearId: "fy-2026",
      title: "Erfolgsrechnung",
      currentVersionNumber: 4,
      versionCount: 4,
      versions: [],
    },
  ],
};

const distributionLabels = {
  sendAction: "Versenden",
  dialogTitle: "Veröffentlichung versenden",
  historyAction: "Versandverlauf",
  historyTitle: "Versandverlauf",
  historyEmpty: "Noch keine Versendungen.",
  optionalMessageLabel: "Nachricht",
  optionalMessagePlaceholder: "Optional",
  reviewHeading: "Prüfen",
  reviewVersion: "Version {version}",
  reviewRecipients: "Empfänger",
  reviewMessage: "Nachricht",
  reviewMessageEmpty: "Keine Nachricht",
  sendConfirm: "Senden",
  sending: "Senden…",
  sendSuccess: "Gesendet",
  sendPartial: "Teilweise gesendet",
  sendFailed: "Fehlgeschlagen",
  loadingHistory: "Laden…",
  distributionSummary: "Zusammenfassung",
  viewRecipients: "Empfänger anzeigen",
  recipientSent: "Gesendet",
  recipientFailed: "Fehlgeschlagen",
  externalRecipient: "Extern",
  statusCompleted: "COMPLETED",
  statusPartial: "PARTIAL",
  statusFailed: "FAILED",
  recipientPicker: {
    recipientsLabel: "Empfänger",
    addPerson: "Person hinzufügen",
    personDialogTitle: "Person wählen",
    searchPlaceholder: "Suchen",
    searchLoading: "Suchen…",
    searchEmpty: "Keine Treffer",
    externalEmailLabel: "E-Mail",
    externalEmailPlaceholder: "email@example.com",
    addExternal: "Extern hinzufügen",
    externalBadge: "Extern",
    invalidEmail: "Ungültige E-Mail",
  },
};

const sharedHistoryLabels = {
  historyAction: "Veröffentlichungen",
  historyTitle: "Veröffentlichungen",
  openVersion: "Ansehen",
  versionLabel: "Version {version}",
  publishedAtLabel: "Published",
  statusPublished: "VERÖFFENTLICHT",
  statusSuperseded: "Ersetzt",
  downloadPdf: "PDF herunterladen",
  close: "Schließen",
  loading: "Laden…",
  loadingMore: "Mehr laden…",
  loadOlder: "Ältere Versionen laden",
  empty: "Leer",
};

function minimalPnlLabels() {
  return {
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
  };
}

function renderBar(input: { canDistribute: boolean }) {
  return render(
    <ToastProvider>
      <FinanceReportingPublicationBar
        financeYearId="fy-2026"
        financeYearName="FY 2026"
        formattingLocale="de-CH"
        canPublish={false}
        canShare={true}
        canRevokeShares={true}
        canDistribute={input.canDistribute}
        distributionLabels={input.canDistribute ? distributionLabels : undefined}
        reportPublishable={true}
        publicationSummary={publicationSummary}
        publicationLabels={{
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
        }}
        inspectionLabels={{
          sheetTitle: "Sheet",
          frozenNotice: "Frozen",
          versionHeading: "Version",
          versionLabel: "Version {version}",
          publishedAtLabel: "Published",
          contentTypeLabel: "Erfolgsrechnung",
          statusPublished: "VERÖFFENTLICHT",
          statusSuperseded: "Ersetzt",
          downloadPdf: "PDF",
          close: "Close",
          shareableHint: "Hint",
          loading: "Loading",
        }}
        historyLabels={sharedHistoryLabels}
        fastShareLabels={{
          shareAction: "Teilen",
          copyLink: "Link kopieren",
          openLink: "Link öffnen",
          linkCopiedTitle: "Copied",
          linkCreatedTitle: "Created",
          linkCopiedBody: "Body",
          linkCopySuccess: "Copied",
          createFailed: "Failed",
          manageAction: "Freigabe verwalten",
        }}
        shareManagementLabels={{
          sectionTitle: "Freigaben",
          dialogTitle: "Freigabe verwalten · Version {version}",
          empty: "Empty",
          noActiveShare: "No active",
          createDefaultLink: "Create",
          statusActive: "Active",
          statusExpired: "Expired",
          statusRevoked: "Revoked",
          createdLabel: "Created",
          expiresLabel: "Expires",
          expiresNone: "None",
          creatorLabel: "By",
          revoke: "Revoke",
          revoking: "Revoking",
          revokeFailed: "Failed",
          revokeConfirmTitle: "Confirm",
          revokeConfirmDescription: "Desc",
          revokeSuccess: "Done",
          copyLink: "Copy",
          openLink: "Open",
          linkCopied: "Copied",
          loadFailed: "Failed",
          advancedTitle: "Advanced",
          expirySection: "Expiry",
          expiryNone: "None",
          expiryDate: "Date",
          expiryDateLabel: "Until",
          createAdvancedShare: "Create",
          creating: "Creating",
          createFailed: "Failed",
          manageAction: "Freigabe verwalten",
          cancel: "Cancel",
        }}
        pnlLabels={minimalPnlLabels()}
      />
    </ToastProvider>,
  );
}

describe("FIN-06E-R1 publication history Versenden entry point", () => {
  beforeEach(() => {
    loadHistory.mockReset();
    loadDistributionHistory.mockReset();
    sendDistribution.mockReset();
    loadHistory.mockResolvedValue({
      ok: true,
      versions: [
        { versionNumber: 4, lifecycleStatus: "PUBLISHED", publishedAt: "2026-10-26T10:00:00.000Z" },
        { versionNumber: 3, lifecycleStatus: "SUPERSEDED", publishedAt: "2026-10-25T10:00:00.000Z" },
      ],
      hasOlder: false,
      nextCursorVersionNumber: null,
    });
    loadDistributionHistory.mockResolvedValue({ ok: true, distributions: [] });
  });

  it("does not preload distribution data when opening publication history", async () => {
    expect(FINANCE_06E_PUBLICATION_HISTORY_CONTRACT.PUBLICATION_HISTORY_DEPENDS_ON_DISTRIBUTION).toBe(
      false,
    );
    const user = userEvent.setup();
    renderBar({ canDistribute: true });

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() => expect(loadHistory).toHaveBeenCalled());
    expect(loadDistributionHistory).not.toHaveBeenCalled();
  });

  it("shows Versenden for Version 4 when canDistributePublication is true", async () => {
    const user = userEvent.setup();
    renderBar({ canDistribute: true });

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-finance-publication-history-version="4"]'),
      ).toBeTruthy(),
    );

    const versionRow = document.querySelector('[data-finance-publication-history-version="4"]');
    expect(versionRow?.querySelector("[data-finance-publication-distribute-trigger]")).toBeTruthy();
  });

  it("hides Versenden when user lacks finance.reporting.distribute capability", async () => {
    const user = userEvent.setup();
    renderBar({ canDistribute: false });

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-finance-publication-history-version="4"]'),
      ).toBeTruthy(),
    );

    expect(screen.queryByRole("button", { name: "Versenden" })).toBeNull();
    expect(
      document.querySelector("[data-finance-publication-distribute-trigger]"),
    ).toBeNull();
  });

  it("opens distribution dialog for the exact version after Versenden click", async () => {
    const user = userEvent.setup();
    renderBar({ canDistribute: true });

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() =>
      document.querySelector('[data-finance-publication-history-version="4"]'),
    );

    const version4Send = document
      .querySelector('[data-finance-publication-history-version="4"]')
      ?.querySelector("[data-finance-publication-distribute-trigger]") as HTMLButtonElement;
    expect(version4Send).toBeTruthy();
    await user.click(version4Send);
    expect(screen.getByText("Veröffentlichung versenden")).toBeTruthy();
    expect(loadDistributionHistory).not.toHaveBeenCalled();
  });

  it("allows Versenden on superseded immutable versions", async () => {
    const user = userEvent.setup();
    renderBar({ canDistribute: true });

    await user.click(screen.getByRole("button", { name: "Veröffentlichungen" }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-finance-publication-history-version="3"]'),
      ).toBeTruthy(),
    );

    const supersededRow = document.querySelector('[data-finance-publication-history-version="3"]');
    expect(supersededRow?.querySelector("[data-finance-publication-distribute-trigger]")).toBeTruthy();
  });
});
