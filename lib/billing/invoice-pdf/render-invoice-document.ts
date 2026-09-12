import { PDFDocument, type PDFPage, rgb } from "pdf-lib";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  INVOICE_PDF_BRAND,
  INVOICE_PDF_SITE_URL,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "./constants";
import { mmToPt } from "./mm";
import {
  embedLogoIfPresent,
  SPORTCLUBEVO_LOGO_PATH,
  TULIP_DIGITAL_LOGO_PATH,
} from "./render-swiss-payment-slip";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
} from "../native-billing-presentation";

const PAGE_MARGIN_MM = 15;
const HEADER_HEIGHT_MM = 28;

function color(c: { r: number; g: number; b: number }) {
  return rgb(c.r, c.g, c.b);
}

function formatAmountPlain(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function formatVatRateDisplay(vatRateBps: number): string {
  return `${(vatRateBps / 100).toFixed(1).replace(".", ".")} %`;
}

export type InvoiceBodyLayout = {
  contentBottomY: number;
  reservedPaymentSection: boolean;
};

export function estimateInvoiceBodyHeightMm(lineCount: number): number {
  const headerBlock = 95;
  const tableHeader = 10;
  const rowHeight = 14;
  const totals = 35;
  const footer = 18;
  const thankYou = 12;
  return headerBlock + tableHeader + lineCount * rowHeight + totals + footer + thankYou;
}

export function shouldUseSinglePageWithPayment(lineCount: number): boolean {
  const bodyMm = estimateInvoiceBodyHeightMm(lineCount);
  const available = A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM - PAGE_MARGIN_MM;
  return bodyMm <= available;
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
  const margin = mmToPt(PAGE_MARGIN_MM);
  const paymentReserve = options.reservePaymentSectionAtBottom
    ? mmToPt(SWISS_PAYMENT_SECTION_HEIGHT_MM)
    : 0;
  const contentBottom = margin + paymentReserve;

  const headerHeight = mmToPt(HEADER_HEIGHT_MM);
  page.drawRectangle({
    x: 0,
    y: pageHeight - headerHeight,
    width: pageWidth,
    height: headerHeight,
    color: color(INVOICE_PDF_BRAND.headerNavy),
  });

  page.drawRectangle({
    x: pageWidth - mmToPt(70),
    y: pageHeight - headerHeight,
    width: mmToPt(70),
    height: headerHeight,
    color: color(INVOICE_PDF_BRAND.orange),
    opacity: 0.35,
  });

  const logo = await embedLogoIfPresent(pdfDoc, SPORTCLUBEVO_LOGO_PATH);
  if (logo) {
    const logoHeight = mmToPt(14);
    const scale = logoHeight / logo.height;
    const logoWidth = logo.width * scale;
    page.drawImage(logo, {
      x: margin,
      y: pageHeight - headerHeight + (headerHeight - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    page.drawText("SportClubEvo", {
      x: margin,
      y: pageHeight - headerHeight + mmToPt(8),
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  let cursorY = pageHeight - headerHeight - mmToPt(10);

  if (data.isVoid) {
    page.drawText("STORNIERT", {
      x: margin,
      y: cursorY - mmToPt(6),
      size: 18,
      font: fontBold,
      color: rgb(0.6, 0.1, 0.1),
    });
    cursorY -= mmToPt(14);
  }

  page.drawText("Rechnung", {
    x: margin,
    y: cursorY - mmToPt(8),
    size: 26,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  const metaX = pageWidth - margin - mmToPt(55);
  let metaY = cursorY;
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
      y: metaY - mmToPt(3.5),
      size: 7,
      font,
      color: color(INVOICE_PDF_BRAND.muted),
    });
    page.drawText(value, {
      x: metaX,
      y: metaY - mmToPt(7.5),
      size: 9,
      font: label === "Rechnungsnummer" ? fontBold : font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    metaY -= mmToPt(11);
  }

  cursorY = Math.min(cursorY - mmToPt(12), metaY) - mmToPt(8);

  const colGap = mmToPt(8);
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + colGap;

  page.drawText("RECHNUNGSEMPFÄNGER", {
    x: leftX,
    y: cursorY,
    size: 7,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });
  page.drawText("RECHNUNGSSTELLER", {
    x: rightX,
    y: cursorY,
    size: 7,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });

  cursorY -= mmToPt(5);
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
    page.drawText(line, {
      x: leftX,
      y: addrY,
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    addrY -= mmToPt(4.5);
  }
  addrY = cursorY;
  for (const line of issuerLines) {
    page.drawText(line, {
      x: rightX,
      y: addrY,
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    addrY -= mmToPt(4.5);
  }

  cursorY = Math.min(cursorY - recipientLines.length * mmToPt(4.5), addrY) - mmToPt(10);

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const colDesc = tableWidth * 0.38;
  const colQty = tableWidth * 0.08;
  const colUnit = tableWidth * 0.14;
  const colNet = tableWidth * 0.14;
  const colVat = tableWidth * 0.1;
  const colGross = tableWidth * 0.16;

  const headerRowHeight = mmToPt(8);
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
      y: cursorY - mmToPt(5.5),
      size: 6.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.muted),
    });
  }

  cursorY -= headerRowHeight + mmToPt(2);

  for (const line of data.lines) {
    const rowHeight = mmToPt(12);
    if (cursorY - rowHeight < contentBottom + mmToPt(20)) {
      break;
    }
    page.drawText(line.description, {
      x: tableX + mmToPt(2),
      y: cursorY - mmToPt(4),
      size: 9,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(
      formatBillingPeriodDisplay(data.invoice.periodStart, data.invoice.periodEnd),
      {
        x: tableX + mmToPt(2),
        y: cursorY - mmToPt(8),
        size: 7.5,
        font,
        color: color(INVOICE_PDF_BRAND.muted),
      },
    );

    const qty = String(line.quantity);
    page.drawText(qty, {
      x: tableX + colDesc,
      y: cursorY - mmToPt(5),
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.unitPriceNetMinor), {
      x: tableX + colDesc + colQty,
      y: cursorY - mmToPt(5),
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.lineNetMinor), {
      x: tableX + colDesc + colQty + colUnit,
      y: cursorY - mmToPt(5),
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatVatRateDisplay(line.vatRateBps), {
      x: tableX + colDesc + colQty + colUnit + colNet,
      y: cursorY - mmToPt(5),
      size: 9,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    page.drawText(formatAmountPlain(line.lineGrossMinor), {
      x: tableX + colDesc + colQty + colUnit + colNet + colVat,
      y: cursorY - mmToPt(5),
      size: 9,
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
  const totalsX = pageWidth - margin - mmToPt(55);
  let totalsY = Math.max(cursorY - mmToPt(6), contentBottom + mmToPt(35));

  page.drawText("Netto", {
    x: totalsX,
    y: totalsY,
    size: 9,
    font,
    color: color(INVOICE_PDF_BRAND.muted),
  });
  page.drawText(`${formatAmountPlain(data.invoice.netTotalMinor)} CHF`, {
    x: totalsX + mmToPt(25),
    y: totalsY,
    size: 9,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });
  totalsY -= mmToPt(6);

  const vatLabel =
    data.taxSnapshots[0]?.taxLabel ??
    (data.lines[0] ? `MWST ${formatVatRateDisplay(data.lines[0].vatRateBps)}` : "MWST");
  page.drawText(vatLabel.replace("MWST", "MWST").replace("%", " %"), {
    x: totalsX,
    y: totalsY,
    size: 9,
    font,
    color: color(INVOICE_PDF_BRAND.muted),
  });
  page.drawText(`${formatAmountPlain(data.invoice.vatTotalMinor)} CHF`, {
    x: totalsX + mmToPt(25),
    y: totalsY,
    size: 9,
    font,
    color: color(INVOICE_PDF_BRAND.text),
  });
  totalsY -= mmToPt(8);

  const totalHighlightHeight = mmToPt(8);
  page.drawRectangle({
    x: totalsX - mmToPt(2),
    y: totalsY - mmToPt(1),
    width: mmToPt(52),
    height: totalHighlightHeight,
    color: color(INVOICE_PDF_BRAND.orangeMuted),
    opacity: 0.85,
  });
  page.drawText("Total brutto", {
    x: totalsX,
    y: totalsY + mmToPt(1.5),
    size: 10,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  page.drawText(`${formatAmountPlain(data.invoice.grossTotalMinor)} CHF`, {
    x: totalsX + mmToPt(25),
    y: totalsY + mmToPt(1.5),
    size: 10,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });
  }

  if (showFooter) {
  const thankY = contentBottom + mmToPt(8);
  page.drawRectangle({
    x: margin,
    y: thankY - mmToPt(1),
    width: mmToPt(1.5),
    height: mmToPt(8),
    color: color(INVOICE_PDF_BRAND.orange),
  });
  page.drawText("Vielen Dank für Ihr Vertrauen.", {
    x: margin + mmToPt(4),
    y: thankY + mmToPt(2),
    size: 9,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  const tulipLogo = await embedLogoIfPresent(pdfDoc, TULIP_DIGITAL_LOGO_PATH);
  if (tulipLogo) {
    const h = mmToPt(6);
    const scale = h / tulipLogo.height;
    page.drawImage(tulipLogo, {
      x: margin,
      y: contentBottom + mmToPt(1),
      width: tulipLogo.width * scale,
      height: h,
    });
  }

  page.drawText(INVOICE_PDF_SITE_URL, {
    x: pageWidth - margin - mmToPt(40),
    y: contentBottom + mmToPt(2),
    size: 8,
    font,
    color: color(INVOICE_PDF_BRAND.muted),
  });
  }

  return {
    contentBottomY: contentBottom,
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
