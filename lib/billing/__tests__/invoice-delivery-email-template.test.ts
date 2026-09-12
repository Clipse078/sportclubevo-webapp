import { describe, expect, it } from "vitest";
import { buildInvoiceDeliveryEmailContent } from "@/lib/billing/invoice-delivery/invoice-delivery-email-template";
import { buildInvoicePdfAttachmentFilename } from "@/lib/billing/invoice-delivery/invoice-pdf-filename";

describe("invoice delivery email template", () => {
  it("uses invoice number in subject and dynamic amount/due date", () => {
    const content = buildInvoiceDeliveryEmailContent({
      locale: "de",
      invoiceNumber: "2026-000002",
      grossTotalMinor: 21512,
      currency: "CHF",
      dueDate: new Date("2026-10-01T00:00:00.000Z"),
    });

    expect(content.subject).toBe("Rechnung 2026-000002 – SportClubEvo");
    expect(content.text).toMatch(/215[.,]12/);
    expect(content.text).toMatch(/CHF|EUR/);
    expect(content.text).toContain("2026-000002");
    expect(content.html).toMatch(/215[.,]12/);
    expect(content.text.length).toBeGreaterThan(50);
    expect(content.html).toContain("<!DOCTYPE html>");
  });

  it("sanitizes attachment filename", () => {
    expect(buildInvoicePdfAttachmentFilename("2026-000002")).toBe(
      "SportClubEvo-Rechnung-2026-000002.pdf",
    );
    expect(buildInvoicePdfAttachmentFilename("bad<>name")).toBe(
      "SportClubEvo-Rechnung-bad-name.pdf",
    );
  });
});
