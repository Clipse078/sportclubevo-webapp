/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NativeBillingInvoiceCommunicationTimeline from "../NativeBillingInvoiceCommunicationTimeline";
import type { SerializedBillingCommunicationTimelineItem } from "@/lib/billing/billing-communication/billing-communication-timeline-types";

const outboundItem: SerializedBillingCommunicationTimelineItem = {
  id: "out-1",
  direction: "OUTBOUND",
  directionLabel: "Ausgehend",
  isOutbound: true,
  channel: "EMAIL",
  status: "SENT",
  statusLabel: "Gesendet",
  statusTone: "success",
  subject: "Rechnung 2026-000002",
  fromAddress: "billing@sportclubevo.com",
  toAddresses: ["finanzen@example.test"],
  ccAddresses: [],
  bccAddresses: [],
  occurredAt: "2026-09-14T19:41:00.000Z",
  occurredAtFormatted: "14.09.2026, 21:41",
  internetMessageId: null,
  providerMessageId: "provider-1",
  parentCommunicationId: null,
  hasThreadParent: false,
  invoiceDeliveryId: "del-1",
  deliveryStatusLabel: "Versand erfolgreich",
  deliveryStatusTone: "success",
  attachments: [],
};

describe("NativeBillingInvoiceCommunicationTimeline", () => {
  it("renders empty state copy", () => {
    render(<NativeBillingInvoiceCommunicationTimeline items={[]} />);
    expect(screen.getByText("Noch keine Kommunikation vorhanden.")).toBeInTheDocument();
  });

  it("renders attachment metadata compactly", () => {
    render(
      <NativeBillingInvoiceCommunicationTimeline
        items={[
          {
            ...outboundItem,
            attachments: [
              {
                id: "att-1",
                filename: "rechnungskopie.pdf",
                contentType: "application/pdf",
                sizeBytes: 188_416,
                downloadUrl: "/api/platform/billing/invoices/inv-key/communications/attachments/att-1",
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Anhänge")).toBeInTheDocument();
    expect(screen.getByText(/rechnungskopie\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/184 KB/)).toBeInTheDocument();
  });

  it("renders outbound route, subject, and status", () => {
    render(<NativeBillingInvoiceCommunicationTimeline items={[outboundItem]} />);
    expect(screen.getByText("AUSGEHEND")).toBeInTheDocument();
    expect(
      screen.getByText("billing@sportclubevo.com → finanzen@example.test"),
    ).toBeInTheDocument();
    expect(screen.getByText("Rechnung 2026-000002")).toBeInTheDocument();
    expect(screen.getByText("Gesendet")).toBeInTheDocument();
  });

  it("shows Antworten when reply handler and external recipient exist", () => {
    render(
      <NativeBillingInvoiceCommunicationTimeline
        items={[outboundItem]}
        canManage
        onReply={() => {}}
        canReplyToItem={() => true}
      />,
    );
    expect(screen.getByRole("button", { name: "Antworten" })).toBeInTheDocument();
  });

  it("wraps long subjects and addresses without clipping", () => {
    const longSubject = `${"Sehr lange Betreffzeile ".repeat(8)}Ende`;
    const longEmail = `${"very-long-mailbox-name".repeat(4)}@example.test`;
    render(
      <NativeBillingInvoiceCommunicationTimeline
        items={[
          {
            ...outboundItem,
            subject: longSubject,
            fromAddress: longEmail,
            toAddresses: [longEmail],
          },
        ]}
      />,
    );
    const subject = screen.getByText(longSubject);
    expect(subject.className).toMatch(/break-words/);
  });
});
