import type { MailAttachment } from "@/lib/email/mailer";
import { loadSportClubEvoFooterLogoAssetBytesSync } from "@/lib/billing/invoice-pdf/sportclubevo-footer-logo-asset";
import { loadTulipVisibleArtworkPngBytes } from "@/lib/billing/invoice-pdf/tulip-logo-visible-bounds";

/** Content-IDs referenced from the invoice delivery HTML (`cid:…`). */
export const INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID =
  "sportclubevo-invoice-email-logo@sportclubevo.com";
export const INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID =
  "tulip-digital-invoice-email-logo@tulip-digital.ch";

function loadSportClubEvoEmailLogoBytes(): Buffer {
  return Buffer.from(loadSportClubEvoFooterLogoAssetBytesSync());
}

function loadTulipDigitalEmailLogoBytes(): Buffer {
  return loadTulipVisibleArtworkPngBytes().pngBytes;
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
      content: loadSportClubEvoEmailLogoBytes(),
      contentType: "image/png",
      cid: INVOICE_DELIVERY_EMAIL_SCE_LOGO_CID,
      contentDisposition: "inline",
    },
    {
      filename: "tulip-digital-logo.png",
      content: loadTulipDigitalEmailLogoBytes(),
      contentType: "image/png",
      cid: INVOICE_DELIVERY_EMAIL_TULIP_LOGO_CID,
      contentDisposition: "inline",
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
      contentDisposition: "attachment",
    },
  ];
}
