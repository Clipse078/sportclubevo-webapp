/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import deMessages from "@/messages/de.json";
import type { FinanceCommitmentApprovalExplanation } from "@/lib/finance/commitment/finance-commitment-approval-policy-presentation";
import { FinanceCommitmentWorkspacePanel } from "@/components/admin/finance/commitment/FinanceCommitmentWorkspacePanel";
import type {
  FinanceCommitmentDetailRecord,
  FinanceCommitmentWorkspaceSnapshot,
} from "@/lib/finance/services/finance-commitment-query-service";
import {
  createFinanceCommitmentAction,
  loadFinanceCommitmentDetailAction,
} from "@/app/(admin)/dashboard/finance/commitments/actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/(admin)/dashboard/finance/commitments/actions", () => ({
  cancelFinanceCommitmentAction: vi.fn(),
  createFinanceCommitmentAction: vi.fn(),
  deleteDraftFinanceCommitmentAction: vi.fn(),
  loadFinanceCommitmentDetailAction: vi.fn(),
  submitFinanceCommitmentAction: vi.fn(),
  updateFinanceCommitmentAction: vi.fn(),
  approveFinanceCommitmentAction: vi.fn(),
  rejectFinanceCommitmentAction: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const baseSnapshot: FinanceCommitmentWorkspaceSnapshot = {
  capabilities: { canView: true, canManage: true, canSubmit: true, canApprove: false },
  summary: {
    draftCount: 0,
    submittedPendingCount: 0,
    activeCount: 0,
    activeAmountMinor: null,
    activeAmountCurrency: null,
  },
  years: [
    {
      id: "year-1",
      name: "2026",
      startDateIso: "2026-01-01",
      endDateIso: "2026-12-31",
    },
  ],
  selectedYearId: "year-1",
  baseCurrency: "EUR",
  items: [],
  pagination: { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 },
  filters: {
    lifecycleStatus: null,
    approvalStatus: null,
    responsibleUserId: null,
    search: null,
  },
};

function renderPanel(snapshot: FinanceCommitmentWorkspaceSnapshot = baseSnapshot) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <FinanceCommitmentWorkspacePanel
        snapshot={snapshot}
        accounts={[{ id: "acc-1", name: "Operations" }]}
        formattingLocale="en-CH"
      />
    </NextIntlClientProvider>,
  );
}

describe("FinanceCommitmentWorkspacePanel create form (FIN-07B R4/R6)", () => {
  it("exposes canonical visible controls for every intended create field", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);

    const dialog = screen.getByRole("dialog", { name: "New commitment" });
    expect(dialog.querySelector("[data-finance-commitment-form]")).toBeTruthy();

    expect(within(dialog).getByLabelText(/^Title/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Amount/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Supplier \/ recipient/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Reference/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Description/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Commitment date/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/^Expected payment/)).toBeTruthy();
    expect(within(dialog).getByTestId("finance-base-currency-select")).toBeTruthy();
    expect(within(dialog).getByTestId("static-option-searchable-picker")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Save draft" })).toBeTruthy();

    const titleInput = within(dialog).getByLabelText(/^Title/) as HTMLInputElement;
    expect(titleInput.className).toContain("fca-input");
    expect(titleInput).not.toHaveAttribute("type", "hidden");
  });

  it("uses min-w-0 responsive grid on the create form to avoid modal horizontal overflow", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);
    const form = document.querySelector("[data-finance-commitment-form]");
    expect(form?.className).toContain("min-w-0");
  });

  it("shows validation feedback inside the create dialog instead of failing silently", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);
    const dialog = screen.getByRole("dialog", { name: "New commitment" });
    await user.click(within(dialog).getByRole("button", { name: "Save draft" }));
    expect(within(dialog).getByText("Enter a title.")).toBeTruthy();
    expect(within(dialog).getByTestId("finance-commitment-form-feedback")).toBeTruthy();
  });

  it("persists a valid draft and closes the create dialog", async () => {
    const user = userEvent.setup();
    vi.mocked(createFinanceCommitmentAction).mockResolvedValue({
      ok: true,
      commitmentId: "new-draft-1",
    });
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);
    const dialog = screen.getByRole("dialog", { name: "New commitment" });
    await user.type(within(dialog).getByLabelText(/^Title/), "Test 2");
    await user.type(within(dialog).getByLabelText(/^Amount/), "1000");
    fireEvent.change(within(dialog).getByLabelText(/^Commitment date/), {
      target: { value: "2026-02-14" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(vi.mocked(createFinanceCommitmentAction)).toHaveBeenCalled();
    });
    expect(screen.queryByRole("dialog", { name: "New commitment" })).toBeNull();
  });

  it("surfaces commitment date outside selected financial year in the create dialog", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);
    const dialog = screen.getByRole("dialog", { name: "New commitment" });
    await user.type(within(dialog).getByLabelText(/^Title/), "Test 2");
    await user.type(within(dialog).getByLabelText(/^Amount/), "1000");
    fireEvent.change(within(dialog).getByLabelText(/^Commitment date/), {
      target: { value: "2027-02-14" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Save draft" }));
    expect(
      within(dialog).getByText(/Commitment date must fall within 2026/i),
    ).toBeTruthy();
    expect(vi.mocked(createFinanceCommitmentAction)).not.toHaveBeenCalled();
  });

  it("groups create fields into primary, secondary, and optional sections", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getAllByRole("button", { name: "New commitment" })[0]!);
    expect(document.querySelector('[data-finance-commitment-form-section="primary"]')).toBeTruthy();
    expect(document.querySelector('[data-finance-commitment-form-section="secondary"]')).toBeTruthy();
    expect(document.querySelector('[data-finance-commitment-form-section="optional"]')).toBeTruthy();
    expect(document.querySelector("[data-finance-commitment-create-dialog]")).toBeTruthy();
  });

});

const uatDetail: FinanceCommitmentDetailRecord = {
  id: "commit-uat-1",
  title: "UAT — Hallenturniere Winter",
  amountMinor: 24_000,
  currency: "CHF",
  partyName: "OB",
  lifecycleStatus: "DRAFT",
  approvalStatus: "NOT_REQUIRED",
  responsibleUserId: null,
  responsibleDisplayName: null,
  expectedPaymentDateIso: "2027-01-14",
  commitmentDateIso: "2026-12-31",
  financialAccountName: "Betrieb",
  financeYearId: "year-1",
  financeYearName: "2026",
  updatedAtIso: "2026-10-27T12:00:00.000Z",
  financialAccountId: "acc-1",
  description: null,
  externalReference: null,
  costCenterName: null,
  expectedEvidenceDateIso: null,
  submittedAtIso: null,
  cancelledAtIso: null,
  canEdit: true,
  canSubmit: true,
  canCancel: true,
  canApprove: false,
  canReject: false,
  approvalDecidedAtIso: null,
  approvalDecidedByDisplayName: null,
  approvalDecisionHistory: [],
  approvalExplanation: null,
};

function renderPanelDe(
  snapshot: FinanceCommitmentWorkspaceSnapshot = baseSnapshot,
  formattingLocale = "de-CH",
) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <FinanceCommitmentWorkspacePanel
        snapshot={snapshot}
        accounts={[{ id: "acc-1", name: "Betrieb" }]}
        formattingLocale={formattingLocale}
      />
    </NextIntlClientProvider>,
  );
}

function draftUatDetail(
  amountMinor: number,
  explanation: FinanceCommitmentApprovalExplanation,
): FinanceCommitmentDetailRecord {
  return {
    ...uatDetail,
    amountMinor,
    title: `UAT FIN-07D ${amountMinor / 100} CHF`,
    approvalExplanation: explanation,
  };
}

describe("FinanceCommitmentWorkspacePanel detail sheet (FIN-07B R5)", () => {
  it("shows locale-formatted calendar dates instead of raw ISO in detail and list", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue(uatDetail);

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: uatDetail.lifecycleStatus,
          approvalStatus: uatDetail.approvalStatus,
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    expect(screen.getByText("14.01.2027")).toBeTruthy();
    expect(screen.queryByText("2027-01-14")).toBeNull();

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));

    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-detail]")).toBeTruthy();
    });
    const detail = document.querySelector("[data-finance-commitment-detail]");
    expect(detail).toBeTruthy();
    expect(within(detail as HTMLElement).getByText("31.12.2026")).toBeTruthy();
    expect(within(detail as HTMLElement).getByText("14.01.2027")).toBeTruthy();
    expect(within(detail as HTMLElement).queryByText("2026-12-31")).toBeNull();
    expect(within(detail as HTMLElement).queryByText("2027-01-14")).toBeNull();
  });

  it("orders submit before edit and places destructive lifecycle actions in overflow menu", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue(uatDetail);

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: uatDetail.lifecycleStatus,
          approvalStatus: uatDetail.approvalStatus,
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));

    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-detail-actions]")).toBeTruthy();
    });
    const actions = document.querySelector("[data-finance-commitment-detail-actions]");
    expect(actions).toBeTruthy();
    const buttons = within(actions as HTMLElement).getAllByRole("button");
    expect(buttons[0]?.textContent).toContain("Submit for review");
    expect(buttons[1]?.textContent).toContain("Edit");
    expect(document.querySelector("[data-finance-commitment-lifecycle-menu]")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete draft" })).toBeNull();
  });

  it("requires confirmation before deleting a never-submitted draft", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue(uatDetail);

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: uatDetail.lifecycleStatus,
          approvalStatus: uatDetail.approvalStatus,
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));
    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-lifecycle-menu]")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete draft" }));

    const deleteDialog = screen.getByRole("dialog", { name: "Delete draft" });
    expect(
      within(deleteDialog).getByText(/UAT — Hallenturniere Winter/),
    ).toBeTruthy();
  });

  it("opens overflow menu above sheet layer and exposes cancel for submitted commitments", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue({
      ...uatDetail,
      lifecycleStatus: "SUBMITTED",
      approvalStatus: "PENDING",
      canEdit: false,
      canSubmit: false,
      canCancel: true,
      submittedAtIso: "2026-10-27T12:00:00.000Z",
    });

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: "SUBMITTED",
          approvalStatus: "PENDING",
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));
    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-lifecycle-menu]")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await waitFor(() => {
      expect(document.querySelector('[data-floating-layer="composer"]')).toBeTruthy();
    });
    expect(screen.getByRole("menuitem", { name: "Cancel commitment" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Delete draft" })).toBeNull();
  });

  it("keeps edit as a primary action for drafts and opens delete from overflow", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue(uatDetail);

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: uatDetail.lifecycleStatus,
          approvalStatus: uatDetail.approvalStatus,
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Delete draft" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Cancel commitment" })).toBeNull();
  });

  it("explains when edit is blocked for submitted commitments", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue({
      ...uatDetail,
      lifecycleStatus: "SUBMITTED",
      approvalStatus: "PENDING",
      canEdit: false,
      canSubmit: false,
      submittedAtIso: "2026-10-27T12:00:00.000Z",
    });

    renderPanel({
      ...baseSnapshot,
      items: [
        {
          id: uatDetail.id,
          title: uatDetail.title,
          amountMinor: uatDetail.amountMinor,
          currency: uatDetail.currency,
          partyName: uatDetail.partyName,
          lifecycleStatus: "SUBMITTED",
          approvalStatus: "PENDING",
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: uatDetail.expectedPaymentDateIso,
          commitmentDateIso: uatDetail.commitmentDateIso,
          financialAccountName: uatDetail.financialAccountName,
          financeYearId: uatDetail.financeYearId,
          financeYearName: uatDetail.financeYearName,
          updatedAtIso: uatDetail.updatedAtIso,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /UAT — Hallenturniere Winter/ }));
    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-edit-blocked]")).toBeTruthy();
    });
  });
});

describe("FinanceCommitmentWorkspacePanel detail sheet (FIN-07D R2 UAT UX)", () => {
  const thresholdMinor = 1_000_00;

  async function openDraftDetail(
    user: ReturnType<typeof userEvent.setup>,
    detail: FinanceCommitmentDetailRecord,
  ) {
    vi.mocked(loadFinanceCommitmentDetailAction).mockResolvedValue(detail);
    renderPanelDe({
      ...baseSnapshot,
      baseCurrency: "CHF",
      items: [
        {
          id: detail.id,
          title: detail.title,
          amountMinor: detail.amountMinor,
          currency: detail.currency,
          partyName: detail.partyName,
          lifecycleStatus: detail.lifecycleStatus,
          approvalStatus: detail.approvalStatus,
          responsibleUserId: null,
          responsibleDisplayName: null,
          expectedPaymentDateIso: detail.expectedPaymentDateIso,
          commitmentDateIso: detail.commitmentDateIso,
          financialAccountName: detail.financialAccountName,
          financeYearId: detail.financeYearId,
          financeYearName: detail.financeYearName,
          updatedAtIso: detail.updatedAtIso,
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: new RegExp(detail.title) }));
    await waitFor(() => {
      expect(document.querySelector("[data-finance-commitment-detail]")).toBeTruthy();
    });
  }

  it("999 CHF draft — below-threshold copy, de-CH threshold, direct submit CTA", async () => {
    const user = userEvent.setup();
    const detail = draftUatDetail(999_00, {
      kind: "NOT_REQUIRED_BELOW_THRESHOLD",
      thresholdAmountMinor: thresholdMinor,
      thresholdCurrency: "CHF",
      isDraftPreview: true,
      approvalRequired: false,
    });
    await openDraftDetail(user, detail);
    const root = document.querySelector("[data-finance-commitment-detail]") as HTMLElement;
    expect(within(root).getByText(/Voraussichtlich keine Freigabe — Betrag unter 1'000 CHF\./)).toBeTruthy();
    const submit = within(root).getByRole("button", { name: "Einreichen" });
    expect(submit).toHaveAttribute("data-finance-commitment-submit-action");
  });

  it("1'000 CHF draft — inclusive boundary copy and review submit CTA", async () => {
    const user = userEvent.setup();
    const detail = draftUatDetail(1_000_00, {
      kind: "REQUIRED_AT_OR_ABOVE_THRESHOLD",
      thresholdAmountMinor: thresholdMinor,
      thresholdCurrency: "CHF",
      isDraftPreview: true,
      approvalRequired: true,
    });
    await openDraftDetail(user, detail);
    const root = document.querySelector("[data-finance-commitment-detail]") as HTMLElement;
    expect(within(root).getByText(/Voraussichtlich Freigabe nötig — Betrag ab 1'000 CHF\./)).toBeTruthy();
    expect(within(root).getByRole("button", { name: "Zur Prüfung einreichen" })).toBeTruthy();
  });

  it("1'001 CHF draft — approval-required CTA matches preview", async () => {
    const user = userEvent.setup();
    const detail = draftUatDetail(1_001_00, {
      kind: "REQUIRED_AT_OR_ABOVE_THRESHOLD",
      thresholdAmountMinor: thresholdMinor,
      thresholdCurrency: "CHF",
      isDraftPreview: true,
      approvalRequired: true,
    });
    await openDraftDetail(user, detail);
    const root = document.querySelector("[data-finance-commitment-detail]") as HTMLElement;
    expect(within(root).getByText(/Voraussichtlich Freigabe nötig — Betrag ab 1'000 CHF\./)).toBeTruthy();
    expect(within(root).getByRole("button", { name: "Zur Prüfung einreichen" })).toBeTruthy();
  });
});
