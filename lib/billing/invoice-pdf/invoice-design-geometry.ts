/**
 * SWISS-01E4A — Invoice creative-area layout tokens (mm / pt where noted).
 *
 * Coordinates in handoff helpers use origin top-left, Y increases downward.
 * pdf-lib uses bottom-left origin; conversion via {@link mmFromPageTopToPdfY}.
 *
 * Visual redesign applies ONLY above the protected 105 mm SIX payment section.
 */

import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "./constants";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";

export function splitLineDescription(description: string): {
  primary: string;
  secondaryFromData: string | null;
} {
  const parts = description
    .split(/\n|(?:\s\|\s)/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { primary: description.trim(), secondaryFromData: null };
  }
  if (parts.length === 1) {
    return { primary: parts[0]!, secondaryFromData: null };
  }
  return {
    primary: parts[0]!,
    secondaryFromData: parts.slice(1).join(" | "),
  };
}

/** Horizontal content margin (both sides). */
export const PAGE_MARGIN_X_MM = 12;

/** Navy header bar height. */
export const HEADER_HEIGHT_MM = 34;

/** SportClubEvo logo in header. */
export const HEADER_LOGO_HEIGHT_MM = 16;
export const HEADER_LOGO_X_MM = PAGE_MARGIN_X_MM;

/** Decorative ribbon artwork (right side of header). */
export const HEADER_RIBBON_ACCENT_WIDTH_MM = 118;

export const INVOICE_BODY_AREA_HEIGHT_MM = A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM;

/** Y (from page top) where the regulated payment section begins. */
export const PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM = INVOICE_BODY_AREA_HEIGHT_MM;

export const CREATIVE_AREA_WIDTH_MM = A4_WIDTH_MM;
export const CREATIVE_AREA_HEIGHT_MM = INVOICE_BODY_AREA_HEIGHT_MM;

/** Gap between header bottom and title block cursor. */
export const TITLE_BLOCK_TOP_GAP_MM = 5;

export const TITLE_TEXT = "Rechnung";
export const TITLE_FONT_SIZE_PT = 24;
export const TITLE_BASELINE_OFFSET_MM = 7;

export const METADATA_BLOCK_WIDTH_MM = 52;
export const METADATA_TOP_OFFSET_MM = 1;
export const METADATA_ROW_STEP_MM = 8.5;
export const METADATA_LABEL_BASELINE_OFFSET_MM = 3;
export const METADATA_VALUE_BASELINE_OFFSET_MM = 6.5;

export const ADDRESS_GRID_TOP_GAP_MM = 3;
export const ADDRESS_GRID_COLUMN_GAP_MM = 6;
export const ADDRESS_SECTION_LABEL_STEP_MM = 4;
export const ADDRESS_LINE_STEP_MM = 4;
export const ADDRESS_GRID_BOTTOM_GAP_MM = 5;

export const TABLE_HEADER_ROW_HEIGHT_MM = 7.5;
export const TABLE_TOP_GAP_MM = 0;
export const TABLE_ROW_HEIGHT_SINGLE_MM = 9;
export const TABLE_ROW_HEIGHT_MULTI_MM = 11;
export const TABLE_AFTER_ROWS_GAP_MM = 3;

/** Table column width fractions (of inner table width). */
export const TABLE_COL_DESC_FRACTION = 0.38;
export const TABLE_COL_QTY_FRACTION = 0.08;
export const TABLE_COL_UNIT_FRACTION = 0.14;
export const TABLE_COL_NET_FRACTION = 0.14;
export const TABLE_COL_VAT_FRACTION = 0.1;
/** Gross column uses remainder. */

export const TOTALS_BLOCK_WIDTH_MM = 50;
export const TOTALS_VALUE_INSET_MM = 1;
export const TOTALS_HIGHLIGHT_WIDTH_MM = 52;
export const TOTALS_HIGHLIGHT_X_INSET_MM = 2;
export const TOTALS_AFTER_BLOCK_GAP_MM = 4;

export const ACKNOWLEDGEMENT_ACCENT_BAR_WIDTH_MM = 1.2;
export const ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM = 7;
export const ACKNOWLEDGEMENT_TEXT_X_OFFSET_MM = 3.5;
export const ACKNOWLEDGEMENT_MIN_GAP_ABOVE_BRAND_MM = 2;

export const FOOTER_BRAND_ROW_OFFSET_ABOVE_PAYMENT_MM = 3.5;
export const TULIP_LOGO_HEIGHT_MM = 5;
export const WEBSITE_TEXT_BLOCK_WIDTH_MM = 38;

export const PAYMENT_BOUNDARY_LINE_ABOVE_MM = 1;

/** Legacy aliases used across modules (01E4A baseline). */
export const INVOICE_HEADER_HEIGHT_MM = HEADER_HEIGHT_MM;
export const INVOICE_SIDE_MARGIN_MM = PAGE_MARGIN_X_MM;

export type MmRect = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  note?: string;
};

export type InvoiceLayoutPlan = {
  pageWidthMm: number;
  pageHeightMm: number;
  creativeArea: MmRect;
  paymentSection: MmRect;
  regions: MmRect[];
};

function innerTableWidthMm(): number {
  return A4_WIDTH_MM - PAGE_MARGIN_X_MM * 2;
}

function tableColumnRightsMm(): number[] {
  const tableWidth = innerTableWidthMm();
  const colDesc = tableWidth * TABLE_COL_DESC_FRACTION;
  const colQty = tableWidth * TABLE_COL_QTY_FRACTION;
  const colUnit = tableWidth * TABLE_COL_UNIT_FRACTION;
  const colNet = tableWidth * TABLE_COL_NET_FRACTION;
  const colVat = tableWidth * TABLE_COL_VAT_FRACTION;
  const tableX = PAGE_MARGIN_X_MM;
  return [
    tableX + colDesc + colQty - 1,
    tableX + colDesc + colQty + colUnit - 1,
    tableX + colDesc + colQty + colUnit + colNet - 1,
    tableX + colDesc + colQty + colUnit + colNet + colVat - 1,
    tableX + tableWidth - 1,
  ];
}

/** Deterministic region plan for handoff (matches renderer spacing constants). */
export function planInvoiceBodyLayoutRegions(data: InvoicePdfDocumentData): InvoiceLayoutPlan {
  const regions: MmRect[] = [];

  regions.push({
    id: "header_bar",
    xMm: 0,
    yMm: 0,
    widthMm: A4_WIDTH_MM,
    heightMm: HEADER_HEIGHT_MM,
  });

  regions.push({
    id: "header_logo",
    xMm: HEADER_LOGO_X_MM,
    yMm: (HEADER_HEIGHT_MM - HEADER_LOGO_HEIGHT_MM) / 2,
    widthMm: HEADER_LOGO_HEIGHT_MM * 2.8,
    heightMm: HEADER_LOGO_HEIGHT_MM,
    note: "Width approximate from asset aspect; height fixed",
  });

  regions.push({
    id: "header_ribbon_artwork",
    xMm: A4_WIDTH_MM - HEADER_RIBBON_ACCENT_WIDTH_MM,
    yMm: 0,
    widthMm: HEADER_RIBBON_ACCENT_WIDTH_MM,
    heightMm: HEADER_HEIGHT_MM,
    note: "Decorative only; asset may clip to header height",
  });

  let cursorY = HEADER_HEIGHT_MM + TITLE_BLOCK_TOP_GAP_MM;

  if (data.isVoid) {
    regions.push({
      id: "void_banner",
      xMm: PAGE_MARGIN_X_MM,
      yMm: cursorY,
      widthMm: innerTableWidthMm(),
      heightMm: 10,
    });
    cursorY += 10;
  }

  const titleTopY = cursorY;
  regions.push({
    id: "title",
    xMm: PAGE_MARGIN_X_MM,
    yMm: titleTopY,
    widthMm: innerTableWidthMm() * 0.5,
    heightMm: TITLE_BASELINE_OFFSET_MM + 4,
  });

  const metaX = A4_WIDTH_MM - PAGE_MARGIN_X_MM - METADATA_BLOCK_WIDTH_MM;
  const metaY = titleTopY + METADATA_TOP_OFFSET_MM;
  regions.push({
    id: "metadata_block",
    xMm: metaX,
    yMm: metaY,
    widthMm: METADATA_BLOCK_WIDTH_MM,
    heightMm: METADATA_ROW_STEP_MM * 5,
  });

  cursorY = Math.min(titleTopY + 8, metaY + METADATA_ROW_STEP_MM * 5) + ADDRESS_GRID_TOP_GAP_MM;

  const colWidth = (innerTableWidthMm() - ADDRESS_GRID_COLUMN_GAP_MM) / 2;
  const leftX = PAGE_MARGIN_X_MM;
  const rightX = PAGE_MARGIN_X_MM + colWidth + ADDRESS_GRID_COLUMN_GAP_MM;
  const recipientLines = 4;
  const issuerLines =
    4 + (data.issuer.uid ? 1 : 0) + (data.issuer.vatId ? 1 : 0);
  const addrRows = Math.max(recipientLines, issuerLines);

  regions.push({
    id: "recipient_block",
    xMm: leftX,
    yMm: cursorY + ADDRESS_SECTION_LABEL_STEP_MM,
    widthMm: colWidth,
    heightMm: addrRows * ADDRESS_LINE_STEP_MM,
  });
  regions.push({
    id: "issuer_block",
    xMm: rightX,
    yMm: cursorY + ADDRESS_SECTION_LABEL_STEP_MM,
    widthMm: colWidth,
    heightMm: addrRows * ADDRESS_LINE_STEP_MM,
  });
  regions.push({
    id: "address_labels",
    xMm: leftX,
    yMm: cursorY,
    widthMm: innerTableWidthMm(),
    heightMm: ADDRESS_SECTION_LABEL_STEP_MM,
  });

  cursorY =
    cursorY +
    ADDRESS_SECTION_LABEL_STEP_MM +
    addrRows * ADDRESS_LINE_STEP_MM +
    ADDRESS_GRID_BOTTOM_GAP_MM;

  const tableHeight =
    TABLE_HEADER_ROW_HEIGHT_MM +
    TABLE_TOP_GAP_MM +
    data.lines.reduce((sum, line) => {
      const split = splitLineDescription(line.description);
      return sum + (split.secondaryFromData ? TABLE_ROW_HEIGHT_MULTI_MM : TABLE_ROW_HEIGHT_SINGLE_MM);
    }, 0);

  regions.push({
    id: "line_items_table",
    xMm: PAGE_MARGIN_X_MM,
    yMm: cursorY,
    widthMm: innerTableWidthMm(),
    heightMm: tableHeight,
    note: `Column right edges (mm from left): ${tableColumnRightsMm().map((x) => x.toFixed(1)).join(", ")}`,
  });

  cursorY += tableHeight + TABLE_AFTER_ROWS_GAP_MM;

  const totalsHeight =
    4.5 +
    4.5 +
    6 +
    1.5 +
    8 +
    TOTALS_AFTER_BLOCK_GAP_MM;
  const totalsX = A4_WIDTH_MM - PAGE_MARGIN_X_MM - TOTALS_BLOCK_WIDTH_MM;
  regions.push({
    id: "totals_block",
    xMm: totalsX - TOTALS_HIGHLIGHT_X_INSET_MM,
    yMm: cursorY,
    widthMm: TOTALS_HIGHLIGHT_WIDTH_MM,
    heightMm: totalsHeight,
  });

  cursorY += totalsHeight;

  const brandRowYFromPageBottomMm =
    SWISS_PAYMENT_SECTION_HEIGHT_MM + FOOTER_BRAND_ROW_OFFSET_ABOVE_PAYMENT_MM;
  const brandRowYFromTop = A4_HEIGHT_MM - brandRowYFromPageBottomMm;

  regions.push({
    id: "operator_branding_tulip",
    xMm: PAGE_MARGIN_X_MM,
    yMm: brandRowYFromTop,
    widthMm: TULIP_LOGO_HEIGHT_MM * 4,
    heightMm: TULIP_LOGO_HEIGHT_MM,
    note: "Asset path configured; file may be absent until PO delivery",
  });

  regions.push({
    id: "website_url",
    xMm: A4_WIDTH_MM - PAGE_MARGIN_X_MM - WEBSITE_TEXT_BLOCK_WIDTH_MM,
    yMm: brandRowYFromTop,
    widthMm: WEBSITE_TEXT_BLOCK_WIDTH_MM,
    heightMm: 4,
  });

  const cursorYFromPageBottomMm = A4_HEIGHT_MM - cursorY;
  const thankYFromPageBottomMm = Math.max(
    cursorYFromPageBottomMm - ACKNOWLEDGEMENT_MIN_GAP_ABOVE_BRAND_MM,
    brandRowYFromPageBottomMm + 7,
  );
  const thankYFromTop = A4_HEIGHT_MM - thankYFromPageBottomMm;

  regions.push({
    id: "acknowledgement",
    xMm: PAGE_MARGIN_X_MM,
    yMm: thankYFromTop,
    widthMm: innerTableWidthMm() * 0.55,
    heightMm: ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM + 2,
  });

  return {
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    creativeArea: {
      id: "creative_area",
      xMm: 0,
      yMm: 0,
      widthMm: CREATIVE_AREA_WIDTH_MM,
      heightMm: CREATIVE_AREA_HEIGHT_MM,
    },
    paymentSection: {
      id: "protected_six_payment_section",
      xMm: 0,
      yMm: PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
      widthMm: A4_WIDTH_MM,
      heightMm: SWISS_PAYMENT_SECTION_HEIGHT_MM,
    },
    regions,
  };
}

export function mmFromPageTopToPdfY(yFromTopMm: number): number {
  return A4_HEIGHT_MM - yFromTopMm;
}
