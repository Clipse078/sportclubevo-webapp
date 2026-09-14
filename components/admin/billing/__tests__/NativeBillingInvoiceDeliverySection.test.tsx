/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import NativeBillingInvoiceDeliverySection from "../NativeBillingInvoiceDeliverySection";
import type { SerializedInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";

const sentDelivery: SerializedInvoiceDeliverySummary = {
  aggregateStatus: "SENT",
  aggregateStatusLabel: "Gesendet",
  latestRecipientEmail: "billing@example.com",
  latestSentAt: "2026-09-10T12:00:00.000Z",
  lastSuccessfulAttemptNumber: 1,
  attempts: [
    {
      key: "del-1",
      attemptNumber: 1,
      status: "SENT",
      statusLabel: "Gesendet",
      recipientEmail: "billing@example.com",
      sentAt: "2026-09-10T12:00:00.000Z",
      failedAt: null,
      createdAt: "2026-09-10T12:00:00.000Z",
      errorMessage: null,
      attachmentFilename: "Rechnung-2026-000002.pdf",
    },
  ],
};

const notSentDelivery: SerializedInvoiceDeliverySummary = {
  aggregateStatus: "NOT_SENT",
  aggregateStatusLabel: "Noch nicht gesendet",
  latestRecipientEmail: "billing@example.com",
  latestSentAt: null,
  lastSuccessfulAttemptNumber: null,
  attempts: [],
};

const baseProps = {
  invoiceKey: "inv-fca-2026-001-2",
  invoiceNumber: "2026-000002",
  grossTotalFormatted: "215,12 CHF",
  dueDateFormatted: "30.09.2026",
  recipientEmail: "billing@example.com",
  canManage: true,
  status: "FINALIZED",
};

describe("NativeBillingInvoiceDeliverySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows first-send action when unsent and hideSendActions is false", () => {
    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        initialDelivery={notSentDelivery}
        hideSendActions={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Rechnung senden" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
  });

  it("hides first-send in Versand when hideSendActions is true (header owns first send)", () => {
    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        initialDelivery={notSentDelivery}
        hideSendActions
      />,
    );

    expect(screen.queryByRole("button", { name: "Rechnung senden" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
  });

  it("shows Erneut senden for sent finalized invoice even when hideSendActions is true", () => {
    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        initialDelivery={sentDelivery}
        hideSendActions
      />,
    );

    expect(screen.getByRole("button", { name: "Erneut senden" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechnung senden" })).not.toBeInTheDocument();
  });

  it("opens resend review and posts resend: true on confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {
          ...sentDelivery,
          attempts: [
            ...sentDelivery.attempts,
            {
              key: "del-2",
              attemptNumber: 2,
              status: "SENT",
              statusLabel: "Gesendet",
              recipientEmail: "billing@example.com",
              sentAt: "2026-09-14T12:00:00.000Z",
              failedAt: null,
              createdAt: "2026-09-14T12:00:00.000Z",
              errorMessage: null,
              attachmentFilename: "Rechnung-2026-000002.pdf",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        initialDelivery={sentDelivery}
        hideSendActions
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erneut senden" }));

    expect(screen.getByText("Rechnung erneut senden", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("2026-000002")).toBeInTheDocument();
    expect(screen.getAllByText("billing@example.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("215,12 CHF")).toBeInTheDocument();
    expect(screen.getByText("Rechnung-2026-000002.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rechnung erneut senden" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/billing/invoices/inv-fca-2026-001-2/send",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ resend: true, simulateFailure: false }),
        }),
      );
    });
  });

  it("does not show resend when user cannot manage billing", () => {
    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        canManage={false}
        initialDelivery={sentDelivery}
        hideSendActions
      />,
    );

    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
  });

  it("keeps delivery history attempts after resend response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {
          ...sentDelivery,
          attempts: [
            sentDelivery.attempts[0],
            {
              key: "del-2",
              attemptNumber: 2,
              status: "SENT",
              statusLabel: "Gesendet",
              recipientEmail: "billing@example.com",
              sentAt: "2026-09-14T12:00:00.000Z",
              failedAt: null,
              createdAt: "2026-09-14T12:00:00.000Z",
              errorMessage: null,
              attachmentFilename: "Rechnung-2026-000002.pdf",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NativeBillingInvoiceDeliverySection
        {...baseProps}
        initialDelivery={sentDelivery}
        hideSendActions
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erneut senden" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechnung erneut senden" }));

    await waitFor(() => {
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
    });
  });
});
