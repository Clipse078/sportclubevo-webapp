/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import { FinanceCommitmentWorkspacePanel } from "@/components/admin/finance/commitment/FinanceCommitmentWorkspacePanel";
import type { FinanceCommitmentWorkspaceSnapshot } from "@/lib/finance/services/finance-commitment-query-service";

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
