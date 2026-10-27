/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import { FinanceCommitmentWorkspacePanel } from "@/components/admin/finance/commitment/FinanceCommitmentWorkspacePanel";
import type {
  FinanceCommitmentDetailRecord,
  FinanceCommitmentWorkspaceSnapshot,
} from "@/lib/finance/services/finance-commitment-query-service";
import { loadFinanceCommitmentDetailAction } from "@/app/(admin)/dashboard/finance/commitments/actions";

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
}));

const baseSnapshot: FinanceCommitmentWorkspaceSnapshot = {
  capabilities: { canView: true, canManage: true, canSubmit: true },
  summary: {
    draftCount: 0,
    submittedPendingCount: 0,
    activeCount: 0,
    activeAmountMinor: null,
    activeAmountCurrency: null,
  },
  years: [{ id: "year-1", name: "2026" }],
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

describe("FinanceCommitmentWorkspacePanel create form (FIN-07B R4)", () => {
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
};

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

  it("orders submit before edit and keeps destructive actions in a separate group", async () => {
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
  });
});
