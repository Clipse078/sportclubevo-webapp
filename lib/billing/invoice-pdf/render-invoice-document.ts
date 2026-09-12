import { PDFDocument, type PDFPage, rgb } from "pdf-lib";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  INVOICE_PDF_BRAND,
  INVOICE_PDF_SITE_URL,
} from "./constants";
import { drawSportClubEvoInvoiceHeader } from "./draw-invoice-header";
import {
  INVOICE_SIDE_MARGIN_MM,
  paymentSectionTopPt,
  splitLineDescription,
} from "./invoice-layout";
import { mmToPt } from "./mm";
import {
  embedLogoIfPresent,
  TULIP_DIGITAL_LOGO_PATH,
} from "./render-swiss-payment-slip";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import type { InvoiceLineRecord } from "../native-billing-commercial-types";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
} from "../native-billing-presentation";

export { shouldUseSinglePageWithPayment } from "./invoice-layout";

function color(c: { r: number; g: number; b: number }) {
  return rgb(c.r, c.g, c.b);
}

function formatAmountPlain(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function formatVatRateDisplay(vatRateBps: number): string {
  return `${(vatRateBps / 100).toFixed(1)} %`;
}

export type InvoiceBodyLayout = {
  contentBottomY: number;
  reservedPaymentSection: boolean;
};

function lineSecondaryText(
  line: InvoiceLineRecord,
  data: InvoicePdfDocumentData,
): string {
  const split = splitLineDescription(line.description);
  if (split.secondaryFromData) {
    return split.secondaryFromData;
  }
  return formatBillingPeriodDisplay(data.invoice.periodStart, data.invoice.periodEnd);
}

export async function drawInvoiceBody(
  pdfDoc: PDFDocument,
  page: PDFPage,
  data: InvoicePdfDocumentData,
  options: { reservePaymentSectionAtBottom: boolean; showTotals?: boolean },
): Promise<InvoiceBodyLayout> {
  const font = await pdfDoc.embedFont("Helvetica");
  const fontBold = await pdfDoc.embedFont("Helvetica-Bold");

  const pageWidth = mmToPt(A4_WIDTH_MM);
  const pageHeight = mmToPt(A4_HEIGHT_MM);
  const margin = mmToPt(INVOICE_SIDE_MARGIN_MM);

  const paymentZoneTop = options.reservePaymentSectionAtBottom
    ? paymentSectionTopPt()
    : mmToPt(12);
  const minY = paymentZoneTop + mmToPt(1);

  const headerBottomY = await drawSportClubEvoInvoiceHeader(
    pdfDoc,
    page,
    pageWidth,
    pageHeight,
  );

  let cursorY = headerBottomY - mmToPt(6);

  if (data.isVoid) {
    page.drawText("STORNIERT", {
      x: margin,
      y: cursorY - mmToPt(5),
      size: 16,
      font: fontBold,
      color: rgb(0.6, 0.1, 0.1),
    });
    cursorY -= mmToPt(10);
  }

  page.drawText("Rechnung", {
    x: margin,
    y: cursorY - mmToPt(7),
    size: 24,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  const metaX = pageWidth - margin - mmToPt(52);
  let metaY = cursorY - mmToPt(1);
  const metaRows: Array<[string, string]> = [
    ["Rechnungsnummer", data.invoice.invoiceNumber ?? "—"],
    ["Rechnungsdatum", formatBillingDateDisplay(data.invoice.invoiceDate)],
    [
      "Leistungszeitraum",
      formatBillingPeriodDisplay(data.invoice.periodStart, data.invoice.periodEnd),
    ],
    [
      "Zahlungsziel",
      data.invoice.paymentTermsDays != null ? `${data.invoice.paymentTermsDays} Tage` : "—",
    ],
    ["Fällig am", formatBillingDateDisplay(data.invoice.dueDate)],
  ];

  for (const [label, value] of metaRows) {
    page.drawText(label, {
      x: metaX,
      y: metaY - mmToPt(3),
      size: 6.5,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });
    page.drawText(value, {
      x: metaX,
      y: metaY - mmToPt(6.5),
      size: 8.5,
      font: label === "Rechnungsnummer" ? fontBold : font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    metaY -= mmToPt(9);
  }

  cursorY = Math.min(cursorY - mmToPt(10), metaY) - mmToPt(4);

  const colGap = mmToPt(6);
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + colGap;

  page.drawText("RECHNUNGSEMPFÄNGER", {
    x: leftX,
    y: cursorY,
    size: 6.5,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });
  page.drawText("RECHNUNGSSTELLER", {
    x: rightX,
    y: cursorY,
    size: 6.5,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });

  cursorY -= mmToPt(4);
  const recipientLines = [
    data.recipient.companyOrName,
    data.recipient.houseNumber
      ? `${data.recipient.street} ${data.recipient.houseNumber}`
      : data.recipient.street,
    `${data.recipient.postalCode} ${data.recipient.city}`,
    data.recipient.countryCode,
  ];
  const issuerLines = [
    data.issuer.displayName,
    data.issuer.legalName,
    data.issuer.houseNumber
      ? `${data.issuer.addressLine1} ${data.issuer.houseNumber}`
      : data.issuer.addressLine1,
    `${data.issuer.postalCode} ${data.issuer.city}`,
    data.issuer.countryCode,
  ];
  if (data.issuer.uid) {
    issuerLines.push(`UID: ${data.issuer.uid}`);
  }
  if (data.issuer.vatId) {
    issuerLines.push(`MWST-Nr.: ${data.issuer.vatId}`);
  }

  let addrY = cursorY;
  for (const line of recipientLines) {
    page.drawText(line, { x: leftX, y: addrY, size: 8.5, font, color: color(INVOICE_PDF_BRAND.text) });
    addrY -= mmToPt(4);
  }
  addrY = cursorY;
  for (const line of issuerLines) {
    page.drawText(line, { x: rightX, y: addrY, size: 8.5, font, color: color(INVOICE_PDF_BRAND.text) });
    addrY -= mmToPt(4);
  }

  cursorY = Math.min(cursorY - recipientLines.length * mmToPt(4), addrY) - mmToPt(7);

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const colDesc = tableWidth * 0.38;
  const colQty = tableWidth * 0.08;
  const colUnit = tableWidth * 0.14;
  const colNet = tableWidth * 0.14;
  const colVat = tableWidth * 0.1;

  const headerRowHeight = mmToPt(7);
  page.drawRectangle({
    x: tableX,
    y: cursorY - headerRowHeight,
    width: tableWidth,
    height: headerRowHeight,
    color: color(INVOICE_PDF_BRAND.tableHeaderBg),
  });

  const headers = [
    { label: "BESCHREIBUNG", x: tableX + mmToPt(2) },
    { label: "MENGE", x: tableX + colDesc },
    { label: "EINZELPREIS (CHF)", x: tableX + colDesc + colQty },
    { label: "NETTO (CHF)", x: tableX + colDesc + colQty + colUnit },
    { label: "MWST", x: tableX + colDesc + colQty + colUnit + colNet },
    { label: "BRUTTO (CHF)", x: tableX + colDesc + colQty + colUnit + colNet + colVat },
  ];
  for (const h of headers) {
    page.drawText(h.label, {
      x: h.x,
      y: cursorY - mmToPt(5),
      size: 6,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.muted),
    });
  }

  cursorY -= headerRowHeight + mmToPt(1.5);

  for (const line of data.lines) {
    const split = splitLineDescription(line.description);
    const rowHeight = mmToPt(split.secondaryFromData ? 11 : 9);
    if (cursorY - rowHeight < minY + mmToPt(28)) {
      break;
    }

    page.drawText(split.primary, {
      x: tableX + mmToPt(2),
      y: cursorY - mmToPt(3.5),
      size: 8.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(lineSecondaryText(line, data), {
      x: tableX + mmToPt(2),
      y: cursorY - mmToPt(7.5),
      size: 7,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });

    const qty = String(line.quantity);
    page.drawText(qty, {
      x: tableX + colDesc,
      y: cursorY - mmToPt(4.5),
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.unitPriceNetMinor), {
      x: tableX + colDesc + colQty,
      y: cursorY - mmToPt(4.5),
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.lineNetMinor), {
      x: tableX + colDesc + colQty + colUnit,
      y: cursorY - mmToPt(4.5),
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatVatRateDisplay(line.vatRateBps), {
      x: tableX + colDesc + colQty + colUnit + colNet,
      y: cursorY - mmToPt(4.5),
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.lineGrossMinor), {
      x: tableX + colDesc + colQty + colUnit + colNet + colVat,
      y: cursorY - mmToPt(4.5),
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });

    page.drawLine({
      start: { x: tableX, y: cursorY - rowHeight },
      end: { x: tableX + tableWidth, y: cursorY - rowHeight },
      thickness: 0.25,
      color: rgb(0.88, 0.89, 0.9),
    });
    cursorY -= rowHeight;
  }

  const showTotals = options.showTotals ?? true;
  const showFooter = options.showTotals ?? true;

  if (showTotals) {
    cursorY -= mmToPt(4);
    const totalsX = pageWidth - margin - mmToPt(50);
    let totalsY = cursorY;

    page.drawText("Netto", {
      x: totalsX,
      y: totalsY,
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });
    page.drawText(`${formatAmountPlain(data.invoice.netTotalMinor)} CHF`, {
      x: totalsX + mmToPt(24),
      y: totalsY,
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    totalsY -= mmToPt(5);

    const vatLabel =
      data.taxSnapshots[0]?.taxLabel ??
      (data.lines[0] ? `MWST ${formatVatRateDisplay(data.lines[0].vatRateBps)}` : "MWST");
    page.drawText(vatLabel, {
      x: totalsX,
      y: totalsY,
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });
    page.drawText(`${formatAmountPlain(data.invoice.vatTotalMinor)} CHF`, {
      x: totalsX + mmToPt(24),
      y: totalsY,
      size: 8.5,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    totalsY -= mmToPt(6);

    page.drawRectangle({
      x: totalsX - mmToPt(2),
      y: totalsY - mmToPt(1),
      width: mmToPt(50),
      height: mmToPt(7),
      color: color(INVOICE_PDF_BRAND.orangeMuted),
      opacity: 0.9,
    });
    page.drawText("Total brutto", {
      x: totalsX,
      y: totalsY + mmToPt(1),
      size: 9.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(`${formatAmountPlain(data.invoice.grossTotalMinor)} CHF`, {
      x: totalsX + mmToPt(24),
      y: totalsY + mmToPt(1),
      size: 9.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });

    cursorY = totalsY - mmToPt(6);
  }

  if (showFooter) {
    cursorY -= mmToPt(3);
    page.drawRectangle({
      x: margin,
      y: cursorY - mmToPt(1),
      width: mmToPt(1.2),
      height: mmToPt(7),
      color: color(INVOICE_PDF_BRAND.orange),
    });
    page.drawText("Vielen Dank für Ihr Vertrauen.", {
      x: margin + mmToPt(3.5),
      y: cursorY + mmToPt(1.5),
      size: 8.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });

    const footerY = Math.max(cursorY - mmToPt(1), minY);
    const tulipLogo = await embedLogoIfPresent(pdfDoc, TULIP_DIGITAL_LOGO_PATH);
    if (tulipLogo) {
      const h = mmToPt(5.5);
      const scale = h / tulipLogo.height;
      page.drawImage(tulipLogo, {
        x: margin,
        y: footerY - mmToPt(5),
        width: tulipLogo.width * scale,
        height: h,
      });
    }

    page.drawText(INVOICE_PDF_SITE_URL, {
      x: pageWidth - margin - mmToPt(38),
      y: footerY - mmToPt(4),
      size: 7.5,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });
  }

  if (options.reservePaymentSectionAtBottom) {
    page.drawLine({
      start: { x: 0, y: paymentZoneTop },
      end: { x: pageWidth, y: paymentZoneTop },
      thickness: 0.35,
      color: rgb(0.82, 0.83, 0.85),
    });
  }

  return {
    contentBottomY: paymentZoneTop,
    reservedPaymentSection: options.reservePaymentSectionAtBottom,
  };
}

export async function drawInvoiceBodyPaginated(
  pdfDoc: PDFDocument,
  data: InvoicePdfDocumentData,
  singlePageWithPayment: boolean,
): Promise<{ pages: PDFPage[]; lastPage: PDFPage }> {
  const pageSize: [number, number] = [mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)];

  if (singlePageWithPayment) {
    const page = pdfDoc.addPage(pageSize);
    await drawInvoiceBody(pdfDoc, page, data, { reservePaymentSectionAtBottom: true });
    return { pages: [page], lastPage: page };
  }

  const maxLinesFirstPage = 6;
  const maxLinesContinuation = 14;
  const pages: PDFPage[] = [];

  const firstChunk = data.lines.slice(0, maxLinesFirstPage);
  const remaining = data.lines.slice(maxLinesFirstPage);

  const page1 = pdfDoc.addPage(pageSize);
  const hasContinuation = remaining.length > 0;
  await drawInvoiceBody(pdfDoc, page1, { ...data, lines: firstChunk }, {
    reservePaymentSectionAtBottom: false,
    showTotals: !hasContinuation,
  });
  pages.push(page1);

  let lineOffset = maxLinesFirstPage;
  while (lineOffset < data.lines.length) {
    const chunk = data.lines.slice(lineOffset, lineOffset + maxLinesContinuation);
    lineOffset += maxLinesContinuation;
    const isLastChunk = lineOffset >= data.lines.length;
    const continuationPage = pdfDoc.addPage(pageSize);
    await drawInvoiceBody(pdfDoc, continuationPage, { ...data, lines: chunk }, {
      reservePaymentSectionAtBottom: false,
      showTotals: isLastChunk,
    });
    pages.push(continuationPage);
  }

  const lastPage = pages[pages.length - 1]!;
  return { pages, lastPage };
}
