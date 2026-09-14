import { readFileSync } from "node:fs";
import path from "node:path";
import type { MailAttachment } from "@/lib/email/mailer";
import {
  SPORTCLUBEVO_FOOTER_LOGO_PATH,
  TULIP_DIGITAL_LOGO_PATH,
} from "@/lib/billing/invoice-pdf/constants";

/** Content-IDs referenced from the invoice delivery HTML (`cid:…`). */
export const INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID = "sportclubevo-invoice-email-logo";
export const INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID = "tulip-digital-invoice-email-logo";

function readBrandingAsset(relativePath: string): Buffer {
  const absolutePath = path.join(process.cwd(), relativePath);
  return readFileSync(absolutePath);
}

let cachedLogoAttachments: MailAttachment[] | null = null;

export function getInvoiceDeliveryEmailInlineLogoAttachments(): MailAttachment[] {
  if (cachedLogoAttachments) {
    return cachedLogoAttachments.map((attachment) => ({
      ...attachment,
      content: Buffer.from(attachment.content),
    }));
  }

  cachedLogoAttachments = [
    {
      filename: "sportclubevo-logo.png",
      content: readBrandingAsset(SPORTCLUBEVO_FOOTER_LOGO_PATH),
      contentType: "image/png",
      cid: INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID,
    },
    {
      filename: "tulip-digital-logo.png",
      content: readBrandingAsset(TULIP_DIGITAL_LOGO_PATH),
      contentType: "image/png",
      cid: INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID,
    },
  ];

  return cachedLogoAttachments.map((attachment) => ({
    ...attachment,
    content: Buffer.from(attachment.content),
  }));
}

export function buildInvoiceDeliveryEmailAttachments(pdf: {
  filename: string;
  content: Buffer;
}): MailAttachment[] {
  return [
    ...getInvoiceDeliveryEmailInlineLogoAttachments(),
    {
      filename: pdf.filename,
      content: pdf.content,
      contentType: "application/pdf",
    },
  ];
}
