import { PDFDocument, type PDFPage, rgb } from "pdf-lib";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  INVOICE_PDF_BRAND,
  INVOICE_PDF_SITE_URL,
  SPORTCLUBEVO_FOOTER_LOGO_PATH,
} from "./constants";
import { drawSportClubEvoInvoiceHeader } from "./draw-invoice-header";
import {
  ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM,
  ACKNOWLEDGEMENT_ACCENT_BAR_WIDTH_MM,
  ACKNOWLEDGEMENT_MIN_GAP_ABOVE_BRAND_MM,
  ACKNOWLEDGEMENT_TEXT_X_OFFSET_MM,
  ADDRESS_COLUMN_DIVIDER_WIDTH_MM,
  ADDRESS_GRID_BOTTOM_GAP_MM,
  ADDRESS_GRID_COLUMN_GAP_MM,
  ADDRESS_SECTION_LABEL_STEP_MM,
  FOOTER_BRAND_DIVIDER_GAP_MM,
  FOOTER_BRAND_LOGO_GAP_MM,
  FOOTER_SCE_LOGO_HEIGHT_MM,
  computeOperatorBrandRowLayoutMm,
  IDENTITY_TOP_Y_MM,
  INVOICE_NUMBER_FONT_SIZE_PT,
  METADATA_LEFT_X_MM,
  METADATA_BLOCK_WIDTH_MM,
  METADATA_LABEL_BASELINE_OFFSET_MM,
  METADATA_ROW_STEP_MM,
  PAGE_MARGIN_X_MM,
  PAYMENT_BOUNDARY_LINE_ABOVE_MM,
  TABLE_AFTER_ROWS_GAP_MM,
  TABLE_COL_DESC_FRACTION,
  TABLE_COL_NET_FRACTION,
  TABLE_COL_QTY_FRACTION,
  TABLE_COL_UNIT_FRACTION,
  TABLE_COL_VAT_FRACTION,
  TABLE_HEADER_ROW_HEIGHT_MM,
  TABLE_ROW_HEIGHT_MULTI_MM,
  TABLE_ROW_HEIGHT_SINGLE_MM,
  TABLE_SECTION_TOP_Y_MM,
  TITLE_ACCENT_GAP_BELOW_TITLE_MM,
  TITLE_ACCENT_HEIGHT_MM,
  TITLE_ACCENT_WIDTH_MM,
  TITLE_BASELINE_OFFSET_MM,
  TITLE_FONT_SIZE_PT,
  TITLE_BLOCK_TOP_GAP_MM,
  TITLE_TOP_Y_MM,
  TOTALS_AFTER_BLOCK_GAP_MM,
  TOTALS_BLOCK_WIDTH_MM,
  TOTALS_HIGHLIGHT_WIDTH_MM,
  TOTALS_HIGHLIGHT_X_INSET_MM,
  TOTALS_VALUE_INSET_MM,
  WEBSITE_TEXT_BLOCK_WIDTH_MM,
} from "./invoice-design-geometry";
import {
  paymentSectionTopPt,
  splitLineDescription,
} from "./invoice-layout";
import {
  METADATA_LABEL_FONT_PT,
  METADATA_VALUE_FONT_PT,
  tryPlanInvoiceCreativeLayout,
  InvoiceCreativeLayoutOverflowError,
  TOTALS_BLOCK_TOP_CONTENT_OFFSET_MM,
} from "./invoice-creative-layout-planner";
import { mmToPt } from "./mm";
import { embedLogoIfPresent } from "./render-swiss-payment-slip";
import { loadTulipVisibleArtworkPngBytes } from "./tulip-logo-visible-bounds";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import type { InvoiceLineRecord } from "../native-billing-commercial-types";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
} from "../native-billing-presentation";
import { drawRightAlignedText, META_LABEL_COLOR } from "./pdf-text-layout";
import { planAddressBlockLayout } from "./invoice-address-layout";
import {
  TOTALS_GROSS_FONT_SIZE_PT,
  TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM,
  TOTALS_GROSS_TEXT_INSET_MM,
  TOTALS_NET_ROW_STEP_MM,
  TOTALS_VAT_TO_GROSS_GAP_MM,
} from "./invoice-totals-layout";

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

function pageTopMmFromPdfY(pageHeightPt: number, yPt: number): number {
  return (pageHeightPt - yPt) / mmToPt(1);
}

function pdfYFromPageTop(pageHeightPt: number, yFromTopMm: number): number {
  return pageHeightPt - mmToPt(yFromTopMm);
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
  const margin = mmToPt(PAGE_MARGIN_X_MM);

  const paymentZoneTop = options.reservePaymentSectionAtBottom
    ? paymentSectionTopPt()
    : mmToPt(PAGE_MARGIN_X_MM);
  const minY = paymentZoneTop + mmToPt(PAYMENT_BOUNDARY_LINE_ABOVE_MM);

  const headerBottomY = await drawSportClubEvoInvoiceHeader(
    pdfDoc,
    page,
    pageWidth,
    pageHeight,
  );

  const useVisualMasterAnchors = options.reservePaymentSectionAtBottom;
  const layoutPlan = useVisualMasterAnchors ? tryPlanInvoiceCreativeLayout(data) : null;
  if (useVisualMasterAnchors && !layoutPlan) {
    throw new InvoiceCreativeLayoutOverflowError(
      "Single-page invoice layout could not be planned safely.",
    );
  }

  let titleTopMm = TITLE_TOP_Y_MM;
  if (data.isVoid) {
    page.drawText("STORNIERT", {
      x: margin,
      y: pdfYFromPageTop(pageHeight, titleTopMm + 2) - mmToPt(5),
      size: 16,
      font: fontBold,
      color: rgb(0.6, 0.1, 0.1),
    });
    titleTopMm += 10;
  }

  const titleBaselineY = useVisualMasterAnchors
    ? pdfYFromPageTop(pageHeight, titleTopMm + TITLE_BASELINE_OFFSET_MM)
    : headerBottomY - mmToPt(TITLE_BLOCK_TOP_GAP_MM + TITLE_BASELINE_OFFSET_MM);

  page.drawText("Rechnung", {
    x: margin,
    y: titleBaselineY,
    size: TITLE_FONT_SIZE_PT,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.text),
  });

  const accentTopMm =
    titleTopMm + TITLE_BASELINE_OFFSET_MM + TITLE_ACCENT_GAP_BELOW_TITLE_MM;
  page.drawRectangle({
    x: margin,
    y: pdfYFromPageTop(pageHeight, accentTopMm + TITLE_ACCENT_HEIGHT_MM),
    width: mmToPt(TITLE_ACCENT_WIDTH_MM),
    height: mmToPt(TITLE_ACCENT_HEIGHT_MM),
    color: color(INVOICE_PDF_BRAND.orange),
  });

  const metaX = useVisualMasterAnchors
    ? mmToPt(METADATA_LEFT_X_MM)
    : pageWidth - margin - mmToPt(METADATA_BLOCK_WIDTH_MM);

  if (useVisualMasterAnchors) {
    page.drawText("RECHNUNGSNUMMER", {
      x: metaX,
      y: pdfYFromPageTop(pageHeight, IDENTITY_TOP_Y_MM + METADATA_LABEL_BASELINE_OFFSET_MM),
      size: 8,
      font,
      color: META_LABEL_COLOR,
    });
    page.drawText(data.invoice.invoiceNumber ?? "—", {
      x: metaX,
      y: pdfYFromPageTop(pageHeight, IDENTITY_TOP_Y_MM + 8),
      size: INVOICE_NUMBER_FONT_SIZE_PT,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
  }

  if (useVisualMasterAnchors && layoutPlan) {
    for (const group of layoutPlan.metadataGroups) {
      page.drawText(group.label, {
        x: metaX,
        y: pdfYFromPageTop(pageHeight, group.labelBaselineYMm),
        size: METADATA_LABEL_FONT_PT,
        font,
        color: META_LABEL_COLOR,
      });
      page.drawText(group.value, {
        x: metaX,
        y: pdfYFromPageTop(pageHeight, group.valueBaselineYMm),
        size: METADATA_VALUE_FONT_PT,
        font,
        color: color(INVOICE_PDF_BRAND.text),
      });
    }
  } else {
    let metaRowTopMm = titleTopMm + 12;
    const metaRows: Array<[string, string]> = [
      ["Rechnungsdatum", formatBillingDateDisplay(data.invoice.invoiceDate)],
      ["Fällig am", formatBillingDateDisplay(data.invoice.dueDate)],
      [
        "Leistungszeitraum",
        formatBillingPeriodDisplay(data.invoice.periodStart, data.invoice.periodEnd),
      ],
      [
        "Zahlungsziel",
        data.invoice.paymentTermsDays != null ? `${data.invoice.paymentTermsDays} Tage` : "—",
      ],
    ];

    for (const [label, value] of metaRows) {
      page.drawText(label, {
        x: metaX,
        y: pdfYFromPageTop(pageHeight, metaRowTopMm + METADATA_LABEL_BASELINE_OFFSET_MM),
        size: 8.5,
        font,
        color: META_LABEL_COLOR,
      });
      page.drawText(value, {
        x: metaX,
        y: pdfYFromPageTop(pageHeight, metaRowTopMm + 6),
        size: 10.5,
        font,
        color: color(INVOICE_PDF_BRAND.text),
      });
      metaRowTopMm += METADATA_ROW_STEP_MM;
    }
  }

  const addressTopMm = layoutPlan
    ? layoutPlan.regions.find((entry) => entry.id === "address_labels")!.yMm
    : Math.min(titleTopMm + 8, titleTopMm + 12) + 3;

  const colGap = mmToPt(ADDRESS_GRID_COLUMN_GAP_MM);
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + colGap;

  const addressLabelY = pdfYFromPageTop(pageHeight, addressTopMm);
  page.drawText("RECHNUNGSEMPFÄNGER", {
    x: leftX,
    y: addressLabelY,
    size: 8.5,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });
  page.drawText("RECHNUNGSSTELLER", {
    x: rightX,
    y: addressLabelY,
    size: 8.5,
    font: fontBold,
    color: color(INVOICE_PDF_BRAND.orange),
  });

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

  const tableTopMmForAddress =
    layoutPlan?.regions.find((entry) => entry.id === "line_items_table")?.yMm ??
    addressTopMm + ADDRESS_SECTION_LABEL_STEP_MM + 40;
  const addressBlockLayout =
    layoutPlan?.addressLayout ??
    planAddressBlockLayout({
      labelBaselineYm: addressTopMm,
      labelToBodyGapMm: ADDRESS_SECTION_LABEL_STEP_MM,
      recipientLineCount: recipientLines.length,
      issuerLineCount: issuerLines.length,
      maxIssuerInkBottomYm: tableTopMmForAddress - 7,
    });

  for (let index = 0; index < recipientLines.length; index++) {
    const baselineMm = addressBlockLayout.recipient.baselinesYMm[index]!;
    page.drawText(recipientLines[index]!, {
      x: leftX,
      y: pdfYFromPageTop(pageHeight, baselineMm),
      size: addressBlockLayout.recipient.fontSizePt,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
  }
  for (let index = 0; index < issuerLines.length; index++) {
    const baselineMm = addressBlockLayout.issuer.baselinesYMm[index]!;
    page.drawText(issuerLines[index]!, {
      x: rightX,
      y: pdfYFromPageTop(pageHeight, baselineMm),
      size: addressBlockLayout.issuer.fontSizePt,
      font,
      color: color(INVOICE_PDF_BRAND.text),
    });
  }

  const addressBlockBottomMm = addressBlockLayout.sectionInkBottomYMm;
  const dividerX = leftX + colWidth + colGap / 2;
  page.drawLine({
    start: { x: dividerX, y: addressLabelY - mmToPt(1) },
    end: {
      x: dividerX,
      y: pdfYFromPageTop(pageHeight, addressBlockBottomMm),
    },
    thickness: mmToPt(ADDRESS_COLUMN_DIVIDER_WIDTH_MM),
    color: rgb(0.9, 0.91, 0.93),
  });

  const tableTopMm = layoutPlan
    ? layoutPlan.regions.find((entry) => entry.id === "line_items_table")!.yMm
    : addressBlockBottomMm + ADDRESS_GRID_BOTTOM_GAP_MM;
  let cursorY = pdfYFromPageTop(pageHeight, tableTopMm);

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const colDesc = tableWidth * TABLE_COL_DESC_FRACTION;
  const colQty = tableWidth * TABLE_COL_QTY_FRACTION;
  const colUnit = tableWidth * TABLE_COL_UNIT_FRACTION;
  const colNet = tableWidth * TABLE_COL_NET_FRACTION;
  const colVat = tableWidth * TABLE_COL_VAT_FRACTION;
  const colQtyRight = tableX + colDesc + colQty - mmToPt(1);
  const colUnitRight = tableX + colDesc + colQty + colUnit - mmToPt(1);
  const colNetRight = tableX + colDesc + colQty + colUnit + colNet - mmToPt(1);
  const colVatRight = tableX + colDesc + colQty + colUnit + colNet + colVat - mmToPt(1);
  const colGrossRight = tableX + tableWidth - mmToPt(1);

  const headerRowHeight = mmToPt(TABLE_HEADER_ROW_HEIGHT_MM);
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
    const rowHeight = mmToPt(split.secondaryFromData ? TABLE_ROW_HEIGHT_MULTI_MM : TABLE_ROW_HEIGHT_SINGLE_MM);
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
    if (layoutPlan) {
      const totalsRegion = layoutPlan.regions.find((entry) => entry.id === "totals_block")!;
      cursorY = pdfYFromPageTop(pageHeight, totalsRegion.yMm + TOTALS_BLOCK_TOP_CONTENT_OFFSET_MM);
    } else {
      cursorY -= mmToPt(TABLE_AFTER_ROWS_GAP_MM);
    }
    const totalsX = pageWidth - margin - mmToPt(TOTALS_BLOCK_WIDTH_MM);
    const totalsValueRight = pageWidth - margin - mmToPt(TOTALS_VALUE_INSET_MM);
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
    totalsY -= mmToPt(TOTALS_NET_ROW_STEP_MM);

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

    const vatBaselineY = totalsY;
    const highlightHeight = mmToPt(TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM);
    const clearGap = mmToPt(TOTALS_VAT_TO_GROSS_GAP_MM);
    const highlightBottom = vatBaselineY - clearGap - highlightHeight - mmToPt(1.5);
    const highlightTop = highlightBottom + highlightHeight;
    const dividerY = highlightTop + mmToPt(1.5);

    page.drawLine({
      start: { x: totalsX - mmToPt(1), y: dividerY },
      end: { x: totalsValueRight, y: dividerY },
      thickness: 0.35,
      color: rgb(0.86, 0.87, 0.89),
    });

    page.drawRectangle({
      x: totalsX - mmToPt(TOTALS_HIGHLIGHT_X_INSET_MM),
      y: highlightBottom,
      width: mmToPt(TOTALS_HIGHLIGHT_WIDTH_MM),
      height: highlightHeight,
      color: color(INVOICE_PDF_BRAND.orangeMuted),
      opacity: 0.92,
    });
    const grossTextY = highlightBottom + mmToPt(TOTALS_GROSS_TEXT_INSET_MM);
    page.drawText("Total brutto", {
      x: totalsX,
      y: grossTextY,
      size: 10,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });
    drawRightAlignedText(
      page,
      `${formatAmountPlain(data.invoice.grossTotalMinor)} CHF`,
      totalsValueRight,
      grossTextY,
      fontBold,
      TOTALS_GROSS_FONT_SIZE_PT,
      color(INVOICE_PDF_BRAND.text),
    );

    cursorY = highlightBottom - mmToPt(TOTALS_AFTER_BLOCK_GAP_MM);
  }

  if (showFooter) {
    const brandRow = computeOperatorBrandRowLayoutMm();
    const brandRowBottomMm = brandRow.rowBottomYMm;
    const brandRowY = pdfYFromPageTop(pageHeight, brandRowBottomMm);
    const thankTopMm = layoutPlan
      ? layoutPlan.regions.find((entry) => entry.id === "acknowledgement")!.yMm
      : Math.min(
          pageTopMmFromPdfY(pageHeight, cursorY) - ACKNOWLEDGEMENT_MIN_GAP_ABOVE_BRAND_MM,
          brandRow.rowTopYMm - ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM - 2,
        );
    const thankY = pdfYFromPageTop(pageHeight, thankTopMm);

    page.drawRectangle({
      x: margin,
      y: thankY - mmToPt(ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM),
      width: mmToPt(ACKNOWLEDGEMENT_ACCENT_BAR_WIDTH_MM),
      height: mmToPt(ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM),
      color: color(INVOICE_PDF_BRAND.orange),
    });
    page.drawText("Vielen Dank für Ihr Vertrauen.", {
      x: margin + mmToPt(ACKNOWLEDGEMENT_TEXT_X_OFFSET_MM),
      y: thankY - mmToPt(ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM) + mmToPt(2),
      size: 10.5,
      font: fontBold,
      color: color(INVOICE_PDF_BRAND.text),
    });

    let brandCursorX = margin;
    const sceLogo = await embedLogoIfPresent(pdfDoc, SPORTCLUBEVO_FOOTER_LOGO_PATH);
    if (sceLogo) {
      const sceHeight = mmToPt(FOOTER_SCE_LOGO_HEIGHT_MM);
      const sceScale = sceHeight / sceLogo.height;
      const sceWidth = sceLogo.width * sceScale;
      page.drawImage(sceLogo, {
        x: brandCursorX,
        y: brandRowY,
        width: sceWidth,
        height: sceHeight,
      });
      brandCursorX += sceWidth + mmToPt(FOOTER_BRAND_LOGO_GAP_MM);
    }

    const tulipArtwork = loadTulipVisibleArtworkPngBytes();
    const tulipEmbedded = await pdfDoc.embedPng(tulipArtwork.pngBytes);
    if (sceLogo && tulipEmbedded) {
      page.drawLine({
        start: { x: brandCursorX, y: brandRowY + mmToPt(0.5) },
        end: {
          x: brandCursorX,
          y: brandRowY + mmToPt(brandRow.rowHeightMm - 0.5),
        },
        thickness: 0.35,
        color: rgb(0.82, 0.84, 0.86),
      });
      brandCursorX += mmToPt(FOOTER_BRAND_DIVIDER_GAP_MM);
    }

    if (tulipEmbedded) {
      const drawWidthPt = mmToPt(brandRow.tulipVisibleWidthMm);
      const drawHeightPt = mmToPt(brandRow.tulipVisibleHeightMm);
      const tulipY =
        brandRowY + mmToPt((FOOTER_SCE_LOGO_HEIGHT_MM - brandRow.tulipVisibleHeightMm) / 2);
      page.drawImage(tulipEmbedded, {
        x: brandCursorX,
        y: tulipY,
        width: drawWidthPt,
        height: drawHeightPt,
      });
    }

    page.drawText(INVOICE_PDF_SITE_URL, {
      x: pageWidth - margin - mmToPt(WEBSITE_TEXT_BLOCK_WIDTH_MM),
      y: brandRowY + mmToPt(1.5),
      size: 8,
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
