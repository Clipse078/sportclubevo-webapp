/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVOICE_PAYMENT_ERROR_CODES,
  PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE,
} from "@/lib/billing/invoice-payments/invoice-payment-errors";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import NativeBillingInvoiceSettlementsSection from "../NativeBillingInvoiceSettlementsSection";

const baseSummary = {
  grossTotalMinor: 21512,
  grossTotalFormatted: "215,12 CHF",
  paidTotalMinor: 10000,
  paidTotalFormatted: "100,00 CHF",
  outstandingMinor: 11512,
  outstandingFormatted: "115,12 CHF",
  isFullyPaid: false,
  lastPaymentDate: null,
  lastPaymentDateDisplay: null,
  payments: [
    {
      key: "pay-1",
      amountMinor: 10000,
      amountFormatted: "100,00 CHF",
      currency: "CHF",
      paymentDate: "2026-09-12",
      paymentDateDisplay: "12.09.2026",
      method: "BANK_TRANSFER_MANUAL",
      methodLabel: "Banküberweisung",
      source: "MANUAL",
      sourceLabel: "Manuell erfasst",
      status: "CONFIRMED",
      statusLabel: "Verbucht",
      reference: null,
      note: null,
      createdAt: "2026-09-12T10:00:00.000Z",
      createdAtDisplay: "12.09.2026, 10:00",
      createdByUserId: "u-1",
      reversedAt: null,
      reversalReason: null,
    },
  ],
};

describe("NativeBillingInvoiceSettlementsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshMock.mockReset();
  });

  it("shows inline overpayment error from API and keeps the form open", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE,
          code: INVOICE_PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
        }),
      }),
    );

    render(
      <NativeBillingInvoiceSettlementsSection
        invoiceKey="inv-sce-test-01g"
        invoiceNumber="2026-000003"
        customerName="SCE Billing Test Club"
        canManage={true}
        initialSummary={baseSummary}
        defaultReference={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zahlung erfassen" }));
    fireEvent.change(screen.getByLabelText(/Betrag/i), { target: { value: "115.12" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zahlung verbuchen" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE,
      );
    });
    expect(screen.getByRole("button", { name: "Zahlung verbuchen" })).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("blocks obvious client-side overpayment before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NativeBillingInvoiceSettlementsSection
        invoiceKey="inv-sce-test-01g"
        invoiceNumber="2026-000003"
        customerName="SCE Billing Test Club"
        canManage={true}
        initialSummary={baseSummary}
        defaultReference={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zahlung erfassen" }));
    fireEvent.change(screen.getByLabelText(/Betrag/i), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Zahlung verbuchen" }));

    expect(screen.getByRole("alert")).toHaveTextContent(PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a corrected valid amount after an overpayment rejection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: INVOICE_PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
          error: PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          paymentSummary: {
            ...baseSummary,
            paidTotalMinor: 21512,
            outstandingMinor: 0,
            isFullyPaid: true,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NativeBillingInvoiceSettlementsSection
        invoiceKey="inv-sce-test-01g"
        invoiceNumber="2026-000003"
        customerName="SCE Billing Test Club"
        canManage={true}
        initialSummary={baseSummary}
        defaultReference={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zahlung erfassen" }));
    const amountInput = screen.getByLabelText(/Betrag/i);

    fireEvent.change(amountInput, { target: { value: "115.12" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zahlung verbuchen" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    fireEvent.change(amountInput, { target: { value: "115.12" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zahlung verbuchen" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
