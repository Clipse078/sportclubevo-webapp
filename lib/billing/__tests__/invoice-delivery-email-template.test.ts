import { describe, expect, it } from "vitest";
import { buildInvoiceDeliveryEmailContent } from "@/lib/billing/invoice-delivery/invoice-delivery-email-template";
import { buildInvoiceDeliveryEmailAttachments } from "@/lib/billing/invoice-delivery/invoice-delivery-email-inline-logos";
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
    expect(content.html).toContain('alt="SportClubEvo"');
    expect(content.html).toContain('alt="Tulip Digital"');
    expect(content.html).toContain("cid:sportclubevo-invoice-email-logo@sportclubevo.com");
    expect(content.html).toContain("cid:tulip-digital-invoice-email-logo@tulip-digital.ch");
    expect(content.html).not.toMatch(/src="https?:\/\//);
    expect(content.html).not.toContain("localhost");
    expect(content.html).not.toContain("vercel.app");
    expect(content.html).toContain("Rechnungsbetrag");
    expect(content.html).toContain("Fällig am");
  });

  it("includes inline logo CID attachments before the PDF", () => {
    const attachments = buildInvoiceDeliveryEmailAttachments({
      filename: "SportClubEvo-Rechnung-2026-000002.pdf",
      content: Buffer.from("%PDF"),
    });

    expect(attachments).toHaveLength(3);
    expect(attachments[0].contentType).toBe("image/png");
    expect(attachments[0].cid).toBe("sportclubevo-invoice-email-logo@sportclubevo.com");
    expect(attachments[0].contentDisposition).toBe("inline");
    expect(attachments[1].contentType).toBe("image/png");
    expect(attachments[1].cid).toBe("tulip-digital-invoice-email-logo@tulip-digital.ch");
    expect(attachments[1].contentDisposition).toBe("inline");
    expect(attachments[2].contentType).toBe("application/pdf");
    expect(attachments[2].contentDisposition).toBe("attachment");
    expect(attachments[2].filename).toBe("SportClubEvo-Rechnung-2026-000002.pdf");
    expect(attachments[0].content.byteLength).toBeGreaterThan(1000);
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
