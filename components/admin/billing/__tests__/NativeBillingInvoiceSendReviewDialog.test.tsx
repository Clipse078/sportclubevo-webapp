/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import NativeBillingInvoiceSendReviewDialog from "../NativeBillingInvoiceSendReviewDialog";
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

describe("NativeBillingInvoiceSendReviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows first-send in header for unsent invoice", () => {
    render(
      <NativeBillingInvoiceSendReviewDialog
        invoiceKey="inv-1"
        invoiceNumber="2026-000003"
        grossTotalFormatted="100,00 CHF"
        dueDateFormatted="30.09.2026"
        recipientEmail="billing@example.com"
        canManage={true}
        status="FINALIZED"
        initialDelivery={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Rechnung senden" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PDF anzeigen" })).toBeInTheDocument();
  });

  it("does not duplicate first-send for already-sent invoice (PDF actions only)", () => {
    render(
      <NativeBillingInvoiceSendReviewDialog
        invoiceKey="inv-fca-2026-001-2"
        invoiceNumber="2026-000002"
        grossTotalFormatted="215,12 CHF"
        dueDateFormatted="30.09.2026"
        recipientEmail="billing@example.com"
        canManage={true}
        status="FINALIZED"
        initialDelivery={sentDelivery}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rechnung senden" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PDF anzeigen" })).toBeInTheDocument();
  });
});
