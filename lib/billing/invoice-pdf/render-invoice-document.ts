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
import { drawRightAlignedText, META_LABEL_COLOR } from "./pdf-text-layout";

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

  let cursorY = headerBottomY - mmToPt(5);

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
      size: 7,
      font,
      color: META_LABEL_COLOR,
    });
    page.drawText(value, {
      x: metaX,
      y: metaY - mmToPt(6.5),
      size: 8.5,
      font: label === "Rechnungsnummer" ? fontBold : font,
      color: color(INVOICE_PDF_BRAND.text),
    });
    metaY -= mmToPt(8.5);
  }

  cursorY = Math.min(cursorY - mmToPt(8), metaY) - mmToPt(3);

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

  cursorY = Math.min(cursorY - recipientLines.length * mmToPt(4), addrY) - mmToPt(5);

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const colDesc = tableWidth * 0.38;
  const colQty = tableWidth * 0.08;
  const colUnit = tableWidth * 0.14;
  const colNet = tableWidth * 0.14;
  const colVat = tableWidth * 0.1;
  const colGross = tableWidth * 0.16;
  const colQtyRight = tableX + colDesc + colQty - mmToPt(1);
  const colUnitRight = tableX + colDesc + colQty + colUnit - mmToPt(1);
  const colNetRight = tableX + colDesc + colQty + colUnit + colNet - mmToPt(1);
  const colVatRight = tableX + colDesc + colQty + colUnit + colNet + colVat - mmToPt(1);
  const colGrossRight = tableX + tableWidth - mmToPt(1);

  const headerRowHeight = mmToPt(7.5);
  page.drawRectangle({
    x: tableX,
    y: cursorY - headerRowHeight,
    width: tableWidth,
    height: headerRowHeight,
    color: rgb(0.94, 0.95, 0.96),
  });

  const headers = [
    { label: "BESCHREIBUNG", x: tableX + mmToPt(2), right: false },
    { label: "MENGE", x: colQtyRight, right: true },
    { label: "EINZELPREIS (CHF)", x: colUnitRight, right: true },
    { label: "NETTO (CHF)", x: colNetRight, right: true },
    { label: "MWST", x: colVatRight, right: true },
    { label: "BRUTTO (CHF)", x: colGrossRight, right: true },
  ];
  for (const h of headers) {
    const headerColor = rgb(0.42, 0.44, 0.48);
    if (h.right) {
      drawRightAlignedText(page, h.label, h.x, cursorY - mmToPt(5.2), fontBold, 6.2, headerColor);
    } else {
      page.drawText(h.label, {
        x: h.x,
        y: cursorY - mmToPt(5.2),
        size: 6.2,
        font: fontBold,
        color: headerColor,
      });
    }
  }

  cursorY -= headerRowHeight + mmToPt(1);

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

    const rowBaseline = cursorY - mmToPt(4.5);
    const qty = String(line.quantity);
    drawRightAlignedText(
      page,
      qty,
      colQtyRight,
      rowBaseline,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    drawRightAlignedText(
      page,
      formatAmountPlain(line.unitPriceNetMinor),
      colUnitRight,
      rowBaseline,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    drawRightAlignedText(
      page,
      formatAmountPlain(line.lineNetMinor),
      colNetRight,
      rowBaseline,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    drawRightAlignedText(
      page,
      formatVatRateDisplay(line.vatRateBps),
      colVatRight,
      rowBaseline,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    drawRightAlignedText(
      page,
      formatAmountPlain(line.lineGrossMinor),
      colGrossRight,
      rowBaseline,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );

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
    cursorY -= mmToPt(3);
    const totalsX = pageWidth - margin - mmToPt(50);
    const totalsValueRight = pageWidth - margin - mmToPt(1);
    let totalsY = cursorY;

    page.drawText("Netto", {
      x: totalsX,
      y: totalsY,
      size: 8.5,
      font,
      color: META_LABEL_COLOR,
    });
    drawRightAlignedText(
      page,
      `${formatAmountPlain(data.invoice.netTotalMinor)} CHF`,
      totalsValueRight,
      totalsY,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    totalsY -= mmToPt(4.5);

    const vatLabel =
      data.taxSnapshots[0]?.taxLabel ??
      (data.lines[0] ? `MWST ${formatVatRateDisplay(data.lines[0].vatRateBps)}` : "MWST");
    page.drawText(vatLabel, {
      x: totalsX,
      y: totalsY,
      size: 8.5,
      font,
      color: META_LABEL_COLOR,
    });
    drawRightAlignedText(
      page,
      `${formatAmountPlain(data.invoice.vatTotalMinor)} CHF`,
      totalsValueRight,
      totalsY,
      font,
      8.5,
      color(INVOICE_PDF_BRAND.text),
    );
    totalsY -= mmToPt(5.5);

    page.drawRectangle({
      x: totalsX - mmToPt(2),
      y: totalsY - mmToPt(1),
      width: mmToPt(52),
      height: mmToPt(7.5),
      color: color(INVOICE_PDF_BRAND.orangeMuted),
      opacity: 0.92,
    });
    page.drawText("Total brutto", {
      x: totalsX,
      y: totalsY + mmToPt(1.2),
      size: 10,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    drawRightAlignedText(
      page,
      `${formatAmountPlain(data.invoice.grossTotalMinor)} CHF`,
      totalsValueRight,
      totalsY + mmToPt(1.2),
      fontBold,
      10,
      color(INVOICE_PDF_BRAND.text),
    );

    cursorY = totalsY - mmToPt(5);
  }

  if (showFooter) {
    const brandRowY = paymentZoneTop + mmToPt(3.5);
    const thankY = Math.max(cursorY - mmToPt(2), brandRowY + mmToPt(7));

    page.drawRectangle({
      x: margin,
      y: thankY - mmToPt(1),
      width: mmToPt(1.2),
      height: mmToPt(7),
      color: color(INVOICE_PDF_BRAND.orange),
    });
    page.drawText("Vielen Dank für Ihr Vertrauen.", {
      x: margin + mmToPt(3.5),
      y: thankY + mmToPt(1.5),
      size: 8.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });

    const tulipLogo = await embedLogoIfPresent(pdfDoc, TULIP_DIGITAL_LOGO_PATH);
    if (tulipLogo) {
      const h = mmToPt(5);
      const scale = h / tulipLogo.height;
      const logoWidth = tulipLogo.width * scale;
      page.drawImage(tulipLogo, {
        x: margin,
        y: brandRowY,
        width: logoWidth,
        height: h,
      });
    }

    page.drawText(INVOICE_PDF_SITE_URL, {
      x: pageWidth - margin - mmToPt(38),
      y: brandRowY + mmToPt(1),
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
