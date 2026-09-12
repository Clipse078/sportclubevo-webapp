import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFPage, rgb, type RGB, type PDFFont } from "pdf-lib";
import {
  A4_WIDTH_MM,
  INVOICE_PDF_BRAND,
  SPORTCLUBEVO_LOGO_PATH,
  SWISS_CROSS_SIZE_MM,
  SWISS_PAYMENT_PART_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
  SWISS_QR_CODE_SIZE_MM,
  SWISS_RECEIPT_WIDTH_MM,
  TULIP_DIGITAL_LOGO_PATH,
} from "./constants";
import { mmToPt } from "./mm";
import { renderSwissQrCodePng, SWISS_QR_RENDER_PIXEL_SIZE } from "./swiss-qr-code-image";
import type { InvoicePaymentInstructionRecord } from "../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceRecipientSnapshotRecord,
} from "../native-billing-commercial-types";
import { formatPaymentReferenceDisplay } from "../invoice-payment-instruction-serializers";
import { formatBillingMoney } from "../format-billing-money";

export type SwissPaymentSlipRenderInput = {
  spcPayload: string;
  instruction: InvoicePaymentInstructionRecord;
  issuer: InvoiceIssuerSnapshotRecord;
  recipient: InvoiceRecipientSnapshotRecord;
  creditorAccount: string;
};

function color(c: { r: number; g: number; b: number }): RGB {
  return rgb(c.r, c.g, c.b);
}

function formatStructuredAddressLines(input: {
  name: string;
  street: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
}): string[] {
  const streetLine = input.houseNumber
    ? `${input.street} ${input.houseNumber}`
    : input.street;
  return [input.name, streetLine, `${input.postalCode} ${input.city}`, input.countryCode];
}

function formatIbanDisplay(iban: string): string {
  const normalized = iban.replace(/\s+/g, "").toUpperCase();
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function drawLabelValueBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  yTop: number,
  lineHeight: number,
  blocks: Array<{ label: string; lines: string[] }>,
): number {
  let y = yTop;
  for (const block of blocks) {
    page.drawText(block.label, {
      x,
      y: y - lineHeight,
      size: 6,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    y -= lineHeight + 1;
    for (const line of block.lines) {
      page.drawText(line, {
        x,
        y: y - lineHeight,
        size: 8,
        font,
        color: color(INVOICE_PDF_BRAND.text),
      });
      y -= lineHeight + 1;
    }
    y -= 2;
  }
  return y;
}

function drawSwissCrossOverlay(
  page: PDFPage,
  qrX: number,
  qrY: number,
  qrSizePt: number,
): void {
  const crossSizePt = mmToPt(SWISS_CROSS_SIZE_MM);
  const crossX = qrX + (qrSizePt - crossSizePt) / 2;
  const crossY = qrY + (qrSizePt - crossSizePt) / 2;

  page.drawRectangle({
    x: crossX,
    y: crossY,
    width: crossSizePt,
    height: crossSizePt,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  const armWidth = mmToPt(1.4);
  const armLength = crossSizePt;
  const cx = crossX + crossSizePt / 2;
  const cy = crossY + crossSizePt / 2;

  page.drawRectangle({
    x: cx - armWidth / 2,
    y: crossY,
    width: armWidth,
    height: armLength,
    color: rgb(0, 0, 0),
  });
  page.drawRectangle({
    x: crossX,
    y: cy - armWidth / 2,
    width: armLength,
    height: armWidth,
    color: rgb(0, 0, 0),
  });
}

export type SwissPaymentSlipMetrics = {
  sectionWidthPt: number;
  sectionHeightPt: number;
  receiptWidthPt: number;
  paymentPartWidthPt: number;
  qrSizePt: number;
};

export function getSwissPaymentSlipMetrics(): SwissPaymentSlipMetrics {
  return {
    sectionWidthPt: mmToPt(A4_WIDTH_MM),
    sectionHeightPt: mmToPt(SWISS_PAYMENT_SECTION_HEIGHT_MM),
    receiptWidthPt: mmToPt(SWISS_RECEIPT_WIDTH_MM),
    paymentPartWidthPt: mmToPt(SWISS_PAYMENT_PART_WIDTH_MM),
    qrSizePt: mmToPt(SWISS_QR_CODE_SIZE_MM),
  };
}

export async function drawSwissPaymentSlipOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  bottomLeftY: number,
  input: SwissPaymentSlipRenderInput,
): Promise<SwissPaymentSlipMetrics> {
  const metrics = getSwissPaymentSlipMetrics();
  const font = await pdfDoc.embedFont("Helvetica");
  const fontBold = await pdfDoc.embedFont("Helvetica-Bold");

  const sectionX = 0;
  const sectionY = bottomLeftY;
  const sectionWidth = metrics.sectionWidthPt;
  const sectionHeight = metrics.sectionHeightPt;

  page.drawLine({
    start: { x: sectionX, y: sectionY + sectionHeight },
    end: { x: sectionWidth, y: sectionY + sectionHeight },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
    dashArray: [2, 2],
  });

  page.drawLine({
    start: { x: metrics.receiptWidthPt, y: sectionY },
    end: { x: metrics.receiptWidthPt, y: sectionY + sectionHeight },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });

  const paymentPartX = metrics.receiptWidthPt;
  const contentTop = sectionY + sectionHeight - mmToPt(5);

  const creditorLines = formatStructuredAddressLines({
    name: input.issuer.legalName,
    street: input.issuer.addressLine1,
    houseNumber: input.issuer.houseNumber,
    postalCode: input.issuer.postalCode,
    city: input.issuer.city,
    countryCode: input.issuer.countryCode,
  });

  const debtorLines = formatStructuredAddressLines({
    name: input.recipient.companyOrName,
    street: input.recipient.street,
    houseNumber: input.recipient.houseNumber,
    postalCode: input.recipient.postalCode,
    city: input.recipient.city,
    countryCode: input.recipient.countryCode,
  });

  const referenceDisplay =
    formatPaymentReferenceDisplay(input.instruction.referenceType, input.instruction.reference) ??
    "—";

  const amountFormatted = formatBillingMoney(
    input.instruction.amountMinor,
    input.instruction.currency,
    "de-CH",
  );

  const receiptBlocks = [
    {
      label: "Konto / Zahlbar an",
      lines: [formatIbanDisplay(input.creditorAccount), ...creditorLines],
    },
    { label: "Referenz", lines: [referenceDisplay] },
    { label: "Zahlbar durch", lines: debtorLines },
  ];

  const paymentBlocks = [
    {
      label: "Konto / Zahlbar an",
      lines: [formatIbanDisplay(input.creditorAccount), ...creditorLines],
    },
    { label: "Referenz", lines: [referenceDisplay] },
    { label: "Zahlbar durch", lines: debtorLines },
  ];

  page.drawText("Empfangsschein", {
    x: mmToPt(5),
    y: contentTop,
    size: 11,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  drawLabelValueBlock(
    page,
    font,
    fontBold,
    mmToPt(5),
    contentTop - mmToPt(6),
    mmToPt(3.5),
    receiptBlocks,
  );

  page.drawText("Währung", {
    x: mmToPt(5),
    y: sectionY + mmToPt(12),
    size: 6,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText("Betrag", {
    x: mmToPt(5) + mmToPt(14),
    y: sectionY + mmToPt(12),
    size: 6,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText(input.instruction.currency, {
    x: mmToPt(5),
    y: sectionY + mmToPt(8),
    size: 8,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText(amountFormatted.replace(/\s/g, " "), {
    x: mmToPt(5) + mmToPt(14),
    y: sectionY + mmToPt(8),
    size: 8,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });

  page.drawText("Annahmestelle", {
    x: mmToPt(5),
    y: sectionY + mmToPt(3),
    size: 6,
    font,
    color: color(INVOICE_PDF_BRAND.muted),
  });

  page.drawText("Zahlteil", {
    x: paymentPartX + mmToPt(5),
    y: contentTop,
    size: 11,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  const qrPng = await renderSwissQrCodePng(input.spcPayload, SWISS_QR_RENDER_PIXEL_SIZE);
  const qrImage = await pdfDoc.embedPng(qrPng);
  const qrX = paymentPartX + mmToPt(5);
  const qrY = sectionY + mmToPt(24);
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: metrics.qrSizePt,
    height: metrics.qrSizePt,
  });
  drawSwissCrossOverlay(page, qrX, qrY, metrics.qrSizePt);

  const paymentTextX = qrX + metrics.qrSizePt + mmToPt(5);
  drawLabelValueBlock(
    page,
    font,
    fontBold,
    paymentTextX,
    contentTop - mmToPt(6),
    mmToPt(3.5),
    paymentBlocks,
  );

  page.drawText("Währung", {
    x: paymentTextX,
    y: sectionY + mmToPt(12),
    size: 6,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText("Betrag", {
    x: paymentTextX + mmToPt(14),
    y: sectionY + mmToPt(12),
    size: 6,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText(input.instruction.currency, {
    x: paymentTextX,
    y: sectionY + mmToPt(8),
    size: 8,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText(amountFormatted.replace(/\s/g, " "), {
    x: paymentTextX + mmToPt(14),
    y: sectionY + mmToPt(8),
    size: 8,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });

  return metrics;
}

export async function loadBrandingAsset(relativePath: string): Promise<Uint8Array | null> {
  const absolute = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  try {
    const buf = await readFile(absolute);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function embedLogoIfPresent(
  pdfDoc: PDFDocument,
  relativePath: string,
): Promise<Awaited<ReturnType<PDFDocument["embedPng"]>> | null> {
  const bytes = await loadBrandingAsset(relativePath);
  if (!bytes) {
    return null;
  }
  return pdfDoc.embedPng(bytes);
}

export { SPORTCLUBEVO_LOGO_PATH, TULIP_DIGITAL_LOGO_PATH };
