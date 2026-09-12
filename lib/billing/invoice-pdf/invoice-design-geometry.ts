/**
 * SWISS-01E4C — World-class light-first invoice layout tokens (mm / pt where noted).
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
export const PAGE_MARGIN_X_MM = 14;

export const INNER_CONTENT_WIDTH_MM = A4_WIDTH_MM - PAGE_MARGIN_X_MM * 2;

/** Compact financial header (SWISS-01E4C). */
export const HEADER_HEIGHT_MM = 21;

export const HEADER_LOGO_WIDTH_MM = 35;
export const HEADER_LOGO_X_MM = PAGE_MARGIN_X_MM;

/** Far-right header accent draw bounds (invoice.jpg crop). */
export const HEADER_ARTWORK_DRAW_WIDTH_MM = 35;
export const HEADER_ARTWORK_DRAW_X_MM = A4_WIDTH_MM - HEADER_ARTWORK_DRAW_WIDTH_MM;

export const TITLE_TOP_Y_MM = 32;
export const TITLE_FONT_SIZE_PT = 28;
export const TITLE_BASELINE_OFFSET_MM = 7;
export const TITLE_ACCENT_WIDTH_MM = 9;
export const TITLE_ACCENT_HEIGHT_MM = 0.8;
export const TITLE_ACCENT_GAP_BELOW_TITLE_MM = 2;

export const IDENTITY_TOP_Y_MM = 32;
export const INVOICE_NUMBER_FONT_SIZE_PT = 15;
export const METADATA_STACK_TOP_Y_MM = 44;
export const METADATA_LEFT_X_MM = 130;
export const METADATA_BLOCK_WIDTH_MM = 66;
export const METADATA_COMPACT_ROW_STEP_MM = 5.5;
export const METADATA_LABEL_BASELINE_OFFSET_MM = 3;
export const METADATA_VALUE_BASELINE_OFFSET_MM = 6;

export const ADDRESS_SECTION_TOP_Y_MM = 72;
export const ADDRESS_COLUMN_DIVIDER_WIDTH_MM = 0.12;

export const TABLE_SECTION_TOP_Y_MM = 110;

export const THANK_YOU_TOP_Y_MM = 160;
export const OPERATOR_BRAND_ROW_TOP_Y_MM = 171;

export const FOOTER_SCE_LOGO_HEIGHT_MM = 5.5;
export const TULIP_LOGO_HEIGHT_MM = 4.5;
export const FOOTER_BRAND_DIVIDER_GAP_MM = 2.5;
export const FOOTER_BRAND_LOGO_GAP_MM = 2.5;

export const MIN_PAYMENT_BREATHING_ROOM_MM = 8;

/** @deprecated SWISS-01E4C uses OPERATOR_BRAND_ROW_TOP_Y_MM. */
export const FOOTER_BRAND_ROW_OFFSET_ABOVE_PAYMENT_MM = 9;

export const INVOICE_BODY_AREA_HEIGHT_MM = A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM;

/** Y (from page top) where the regulated payment section begins. */
export const PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM = INVOICE_BODY_AREA_HEIGHT_MM;

export const CREATIVE_AREA_WIDTH_MM = A4_WIDTH_MM;
export const CREATIVE_AREA_HEIGHT_MM = INVOICE_BODY_AREA_HEIGHT_MM;

/** Gap between header bottom and title block cursor. */
export const TITLE_BLOCK_TOP_GAP_MM = 5;

export const TITLE_TEXT = "Rechnung";

export const METADATA_TOP_OFFSET_MM = 0;
export const METADATA_ROW_STEP_MM = METADATA_COMPACT_ROW_STEP_MM;

export const ADDRESS_GRID_TOP_GAP_MM = 3;
export const ADDRESS_GRID_COLUMN_GAP_MM = 6;
export const ADDRESS_SECTION_LABEL_STEP_MM = 4;
export const ADDRESS_LINE_STEP_MM = 4;
export const ADDRESS_GRID_BOTTOM_GAP_MM = 5;

export const TABLE_HEADER_ROW_HEIGHT_MM = 8.5;
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
export const ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM = 6;
export const ACKNOWLEDGEMENT_MIN_GAP_ABOVE_BRAND_MM = 4;

export const WEBSITE_TEXT_BLOCK_WIDTH_MM = 40;

export const ACKNOWLEDGEMENT_TEXT_X_OFFSET_MM = 3.5;

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
export function footerBrandRowYFromTopMm(): number {
  return OPERATOR_BRAND_ROW_TOP_Y_MM;
}

export function paymentBreathingRoomMm(data: InvoicePdfDocumentData): number {
  const plan = planInvoiceBodyLayoutRegions(data);
  const lowerIds = new Set([
    "operator_branding_sce",
    "operator_branding_tulip",
    "website_url",
    "acknowledgement",
  ]);
  let maxBottom = 0;
  for (const region of plan.regions) {
    if (lowerIds.has(region.id)) {
      maxBottom = Math.max(maxBottom, region.yMm + region.heightMm);
    }
  }
  maxBottom = Math.max(
    maxBottom,
    OPERATOR_BRAND_ROW_TOP_Y_MM + FOOTER_SCE_LOGO_HEIGHT_MM,
  );
  return CREATIVE_AREA_HEIGHT_MM - maxBottom;
}

export function planInvoiceBodyLayoutRegions(data: InvoicePdfDocumentData): InvoiceLayoutPlan {
  const regions: MmRect[] = [];

  regions.push({
    id: "header_bar",
    xMm: 0,
    yMm: 0,
    widthMm: A4_WIDTH_MM,
    heightMm: HEADER_HEIGHT_MM,
  });

  const headerLogoHeightMm = HEADER_LOGO_WIDTH_MM / 4.97;
  regions.push({
    id: "header_logo",
    xMm: HEADER_LOGO_X_MM,
    yMm: (HEADER_HEIGHT_MM - headerLogoHeightMm) / 2,
    widthMm: HEADER_LOGO_WIDTH_MM,
    heightMm: headerLogoHeightMm,
    note: "Width-led placement; height from asset aspect",
  });

  regions.push({
    id: "header_jpg_artwork",
    xMm: HEADER_ARTWORK_DRAW_X_MM,
    yMm: 0,
    widthMm: HEADER_ARTWORK_DRAW_WIDTH_MM,
    heightMm: HEADER_HEIGHT_MM,
    note: "Far-right crop from invoice.jpg",
  });

  if (data.isVoid) {
    regions.push({
      id: "void_banner",
      xMm: PAGE_MARGIN_X_MM,
      yMm: HEADER_HEIGHT_MM + 2,
      widthMm: innerTableWidthMm(),
      heightMm: 10,
    });
  }

  regions.push({
    id: "title",
    xMm: PAGE_MARGIN_X_MM,
    yMm: TITLE_TOP_Y_MM,
    widthMm: INNER_CONTENT_WIDTH_MM * 0.45,
    heightMm: TITLE_BASELINE_OFFSET_MM + TITLE_ACCENT_GAP_BELOW_TITLE_MM + TITLE_ACCENT_HEIGHT_MM,
  });

  regions.push({
    id: "title_accent_line",
    xMm: PAGE_MARGIN_X_MM,
    yMm: TITLE_TOP_Y_MM + TITLE_BASELINE_OFFSET_MM + TITLE_ACCENT_GAP_BELOW_TITLE_MM,
    widthMm: TITLE_ACCENT_WIDTH_MM,
    heightMm: TITLE_ACCENT_HEIGHT_MM,
  });

  regions.push({
    id: "invoice_number_hero",
    xMm: METADATA_LEFT_X_MM,
    yMm: IDENTITY_TOP_Y_MM,
    widthMm: METADATA_BLOCK_WIDTH_MM,
    heightMm: 10,
  });

  regions.push({
    id: "metadata_block",
    xMm: METADATA_LEFT_X_MM,
    yMm: METADATA_STACK_TOP_Y_MM,
    widthMm: METADATA_BLOCK_WIDTH_MM,
    heightMm: METADATA_COMPACT_ROW_STEP_MM * 4,
  });

  const colWidth = (innerTableWidthMm() - ADDRESS_GRID_COLUMN_GAP_MM) / 2;
  const leftX = PAGE_MARGIN_X_MM;
  const rightX = PAGE_MARGIN_X_MM + colWidth + ADDRESS_GRID_COLUMN_GAP_MM;
  const recipientLines = 4;
  const issuerLines =
    4 + (data.issuer.uid ? 1 : 0) + (data.issuer.vatId ? 1 : 0);
  const addrRows = Math.max(recipientLines, issuerLines);
  const addressTopY = ADDRESS_SECTION_TOP_Y_MM;

  regions.push({
    id: "recipient_block",
    xMm: leftX,
    yMm: addressTopY + ADDRESS_SECTION_LABEL_STEP_MM,
    widthMm: colWidth,
    heightMm: addrRows * ADDRESS_LINE_STEP_MM,
  });
  regions.push({
    id: "issuer_block",
    xMm: rightX,
    yMm: addressTopY + ADDRESS_SECTION_LABEL_STEP_MM,
    widthMm: colWidth,
    heightMm: addrRows * ADDRESS_LINE_STEP_MM,
  });
  regions.push({
    id: "address_labels",
    xMm: leftX,
    yMm: addressTopY,
    widthMm: innerTableWidthMm(),
    heightMm: ADDRESS_SECTION_LABEL_STEP_MM,
  });
  regions.push({
    id: "address_column_divider",
    xMm: leftX + colWidth + ADDRESS_GRID_COLUMN_GAP_MM / 2,
    yMm: addressTopY,
    widthMm: ADDRESS_COLUMN_DIVIDER_WIDTH_MM,
    heightMm: ADDRESS_SECTION_LABEL_STEP_MM + addrRows * ADDRESS_LINE_STEP_MM,
  });

  let cursorY = TABLE_SECTION_TOP_Y_MM;
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

  const totalsHeight = 5 + 5 + 7 + 9 + TOTALS_AFTER_BLOCK_GAP_MM;
  const totalsX = A4_WIDTH_MM - PAGE_MARGIN_X_MM - TOTALS_BLOCK_WIDTH_MM;
  regions.push({
    id: "totals_block",
    xMm: totalsX - TOTALS_HIGHLIGHT_X_INSET_MM,
    yMm: cursorY,
    widthMm: TOTALS_HIGHLIGHT_WIDTH_MM,
    heightMm: totalsHeight,
  });

  regions.push({
    id: "acknowledgement",
    xMm: PAGE_MARGIN_X_MM,
    yMm: THANK_YOU_TOP_Y_MM,
    widthMm: INNER_CONTENT_WIDTH_MM * 0.55,
    heightMm: ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM + 3,
  });

  regions.push({
    id: "operator_branding_sce",
    xMm: PAGE_MARGIN_X_MM,
    yMm: OPERATOR_BRAND_ROW_TOP_Y_MM,
    widthMm: FOOTER_SCE_LOGO_HEIGHT_MM * 3.2,
    heightMm: FOOTER_SCE_LOGO_HEIGHT_MM,
  });

  regions.push({
    id: "operator_branding_tulip",
    xMm: PAGE_MARGIN_X_MM + FOOTER_SCE_LOGO_HEIGHT_MM * 3.2 + FOOTER_BRAND_DIVIDER_GAP_MM * 2,
    yMm: OPERATOR_BRAND_ROW_TOP_Y_MM + (FOOTER_SCE_LOGO_HEIGHT_MM - TULIP_LOGO_HEIGHT_MM) / 2,
    widthMm: TULIP_LOGO_HEIGHT_MM * 4,
    heightMm: TULIP_LOGO_HEIGHT_MM,
  });

  regions.push({
    id: "website_url",
    xMm: A4_WIDTH_MM - PAGE_MARGIN_X_MM - WEBSITE_TEXT_BLOCK_WIDTH_MM,
    yMm: OPERATOR_BRAND_ROW_TOP_Y_MM,
    widthMm: WEBSITE_TEXT_BLOCK_WIDTH_MM,
    heightMm: 4,
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
