import { describe, expect, it } from "vitest";
import { buildInvoiceDeliveryEmailContent } from "@/lib/billing/invoice-delivery/invoice-delivery-email-template";
import {
  INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID,
  INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID,
  buildInvoiceDeliveryEmailAttachments,
} from "@/lib/billing/invoice-delivery/invoice-delivery-email-inline-logos";
import { buildInvoiceDeliveryBillingTransportPayload } from "@/lib/billing/invoice-delivery/invoice-delivery-transport-payload";
import { compileInvoiceDeliveryNodemailerMessage } from "@/lib/billing/invoice-delivery/compile-invoice-delivery-nodemailer-message";
import { PLATFORM_INVOICE_EMAIL_BCC } from "@/lib/billing/invoice-delivery/billing-invoice-email-policy";

function extractContentIdBlocks(raw: string, cid: string): string[] {
  const escaped = cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `[\\s\\S]*?Content-ID:\\s*<${escaped}>[\\s\\S]*?(?=\\r?\\n--|$)`,
    "gi",
  );
  return raw.match(pattern) ?? [];
}

describe("invoice delivery email MIME (BILLING-MAIL-02)", () => {
  const emailContent = buildInvoiceDeliveryEmailContent({
    locale: "de",
    invoiceNumber: "2026-000002",
    grossTotalMinor: 21512,
    currency: "CHF",
    dueDate: new Date("2026-10-01T00:00:00.000Z"),
  });

  const pdfAttachment = {
    filename: "SportClubEvo-Rechnung-2026-000002.pdf",
    content: Buffer.from("%PDF-1.4 invoice"),
  };

  it("embeds SportClubEvo and Tulip logos inline with matching HTML cid references", async () => {
    const attachments = buildInvoiceDeliveryEmailAttachments(pdfAttachment);
    const payload = buildInvoiceDeliveryBillingTransportPayload({
      deliveryIntent: "normal",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      to: "customer@fcallschwil.ch",
      replyTo: "billing@sportclubevo.com",
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments,
    });

    const raw = await compileInvoiceDeliveryNodemailerMessage(payload);

    expect(emailContent.html).toContain(`cid:${INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID}`);
    expect(emailContent.html).toContain(`cid:${INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID}`);
    expect(emailContent.text.length).toBeGreaterThan(50);
    expect(emailContent.text).not.toContain(PLATFORM_INVOICE_EMAIL_BCC);
    expect(emailContent.html).not.toContain(PLATFORM_INVOICE_EMAIL_BCC);

    const sceBlocks = extractContentIdBlocks(raw, INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID);
    const tulipBlocks = extractContentIdBlocks(raw, INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID);
    expect(sceBlocks.length).toBeGreaterThan(0);
    expect(tulipBlocks.length).toBeGreaterThan(0);
    expect(sceBlocks[0]).toMatch(/Content-Type: image\/png/i);
    expect(tulipBlocks[0]).toMatch(/Content-Type: image\/png/i);
    expect(sceBlocks[0]).toMatch(/Content-Disposition: inline/i);
    expect(tulipBlocks[0]).toMatch(/Content-Disposition: inline/i);

    expect(raw).toMatch(/Content-Type: application\/pdf/i);
    expect(raw).toMatch(/Content-Disposition: attachment/i);
    expect(raw).not.toMatch(/Content-ID:.*\.pdf/i);
  }, 30_000);

  it("BCCs Tulip Digital on real customer delivery only", async () => {
    const attachments = buildInvoiceDeliveryEmailAttachments(pdfAttachment);

    const customerPayload = buildInvoiceDeliveryBillingTransportPayload({
      deliveryIntent: "normal",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      to: "customer@fcallschwil.ch",
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments,
    });

    expect(customerPayload.bcc).toBe(PLATFORM_INVOICE_EMAIL_BCC);
    expect(customerPayload.to).toBe("customer@fcallschwil.ch");

    const customerRaw = await compileInvoiceDeliveryNodemailerMessage(customerPayload);
    expect(customerRaw).toMatch(new RegExp(`^Bcc:.*${PLATFORM_INVOICE_EMAIL_BCC}`, "im"));

    const testPayload = buildInvoiceDeliveryBillingTransportPayload({
      deliveryIntent: "protected-test",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      to: "billing-test@sportclubevo.test",
      subject: `[TEST DELIVERY] ${emailContent.subject}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments,
    });

    expect(testPayload.bcc).toBeUndefined();
    const testRaw = await compileInvoiceDeliveryNodemailerMessage(testPayload);
    expect(testRaw).not.toMatch(new RegExp(`^Bcc:.*${PLATFORM_INVOICE_EMAIL_BCC}`, "im"));
  }, 30_000);
});
