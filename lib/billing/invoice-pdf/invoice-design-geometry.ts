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
import type { InvoiceCreativeLayoutPlan } from "./invoice-creative-layout-planner";
import {
  estimateOverflowCreativeHeightMm,
  tryPlanInvoiceCreativeLayout,
} from "./invoice-creative-layout-planner";
import { computeTulipVisibleDrawSizeMm } from "./tulip-logo-visible-bounds";
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
/** Right-column metadata stack (independent of left-column title / invoice number). */
export const METADATA_STACK_TOP_Y_MM = 34;
export const METADATA_LEFT_X_MM = 130;
export const METADATA_BLOCK_WIDTH_MM = 66;
/** @deprecated Use {@link METADATA_GROUP_PITCH_MM}. */
export const METADATA_COMPACT_ROW_STEP_MM = 9;
export const METADATA_GROUP_COUNT = 4;
/** Label baseline → next label baseline (editorial metadata rhythm, SWISS-01E4C2). */
export const METADATA_GROUP_PITCH_MM = 9;
/** Group top → label baseline (~1.8–2.2 mm label→value with value offset below). */
export const METADATA_LABEL_BASELINE_OFFSET_MM = 2.5;
export const METADATA_VALUE_BASELINE_OFFSET_MM = 4.5;
/** Approximate cap height for 10.5 pt values (collision planning). */
export const METADATA_VALUE_CAP_HEIGHT_MM = 3.7;
/** Minimum white space between value ink and next label (mm). */
export const METADATA_MIN_INTER_GROUP_GAP_MM = 3;

export const ADDRESS_SECTION_TOP_Y_MM = 86;
export const ADDRESS_COLUMN_DIVIDER_WIDTH_MM = 0.12;

export const TABLE_SECTION_TOP_Y_MM = 112;

export const THANK_YOU_TOP_Y_MM = 160;
export const OPERATOR_BRAND_ROW_TOP_Y_MM = 171;

export const FOOTER_SCE_LOGO_HEIGHT_MM = 5.5;
/** @deprecated Use visible-content sizing via {@link computeOperatorBrandRowLayoutMm}. */
export const TULIP_LOGO_HEIGHT_MM = 6;
export const FOOTER_BRAND_DIVIDER_GAP_MM = 3.5;
export const FOOTER_BRAND_LOGO_GAP_MM = 3.5;

export const MIN_PAYMENT_BREATHING_ROOM_MM = 8;

/** @deprecated SWISS-01E4C uses OPERATOR_BRAND_ROW_TOP_Y_MM. */
export const FOOTER_BRAND_ROW_OFFSET_ABOVE_PAYMENT_MM = 9;

export const INVOICE_BODY_AREA_HEIGHT_MM = A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM;

/** Y (from page top) where the regulated payment section begins. */
export const PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM = INVOICE_BODY_AREA_HEIGHT_MM;

/** Bottom edge of operator brand row (maintains ≥8 mm above y=192). */
export const FOOTER_BRAND_ROW_BOTTOM_Y_MM =
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - MIN_PAYMENT_BREATHING_ROOM_MM;

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

/** Vertical stroke thickness — matches {@link TITLE_ACCENT_HEIGHT_MM} (Rechnung underline). */
export const ACKNOWLEDGEMENT_ACCENT_BAR_WIDTH_MM = TITLE_ACCENT_HEIGHT_MM;
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
  return computeOperatorBrandRowLayoutMm().rowTopYMm;
}

export type OperatorBrandRowLayoutMm = {
  rowTopYMm: number;
  rowBottomYMm: number;
  rowHeightMm: number;
  tulipVisibleWidthMm: number;
  tulipVisibleHeightMm: number;
  sceLogoHeightMm: number;
};

export function computeOperatorBrandRowLayoutMm(): OperatorBrandRowLayoutMm {
  const { visibleWidthMm, visibleHeightMm } = computeTulipVisibleDrawSizeMm();
  const rowHeightMm = Math.max(FOOTER_SCE_LOGO_HEIGHT_MM, visibleHeightMm);
  const rowBottomYMm = FOOTER_BRAND_ROW_BOTTOM_Y_MM;
  return {
    rowTopYMm: rowBottomYMm - rowHeightMm,
    rowBottomYMm,
    rowHeightMm,
    tulipVisibleWidthMm: visibleWidthMm,
    tulipVisibleHeightMm: visibleHeightMm,
    sceLogoHeightMm: FOOTER_SCE_LOGO_HEIGHT_MM,
  };
}

export function paymentBreathingRoomMm(data: InvoicePdfDocumentData): number {
  const creative = loadCreativeLayoutPlan(data);
  const brandBottomYm =
    creative?.regions.find((entry) => entry.id === "operator_brand_row")?.bottomYMm ??
    computeOperatorBrandRowLayoutMm().rowBottomYMm;
  return PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - brandBottomYm;
}

function loadCreativeLayoutPlan(data: InvoicePdfDocumentData): InvoiceCreativeLayoutPlan | null {
  return tryPlanInvoiceCreativeLayout(data);
}

function planOverflowEstimateRegions(data: InvoicePdfDocumentData): MmRect[] {
  const estimatedBodyBottomMm = estimateOverflowCreativeHeightMm(data);
  return [
    {
      id: "overflow_content_estimate",
      xMm: PAGE_MARGIN_X_MM,
      yMm: 0,
      widthMm: innerTableWidthMm(),
      heightMm: estimatedBodyBottomMm,
      note: "Fallback height when creative layout cannot fit on one page",
    },
  ];
}

export function planInvoiceBodyLayoutRegions(data: InvoicePdfDocumentData): InvoiceLayoutPlan {
  const creative = loadCreativeLayoutPlan(data);
  const regions: MmRect[] = [];

  if (!creative) {
    regions.push({
      id: "header_bar",
      xMm: 0,
      yMm: 0,
      widthMm: A4_WIDTH_MM,
      heightMm: HEADER_HEIGHT_MM,
    });
    regions.push(...planOverflowEstimateRegions(data));
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
    id: "title_accent_line",
    xMm: PAGE_MARGIN_X_MM,
    yMm: TITLE_TOP_Y_MM + TITLE_BASELINE_OFFSET_MM + TITLE_ACCENT_GAP_BELOW_TITLE_MM,
    widthMm: TITLE_ACCENT_WIDTH_MM,
    heightMm: TITLE_ACCENT_HEIGHT_MM,
  });

  for (const region of creative.regions) {
    regions.push({
      id: region.id,
      xMm: region.xMm,
      yMm: region.yMm,
      widthMm: region.widthMm,
      heightMm: region.heightMm,
      note: region.note,
    });
  }

  const addressTopY = creative.regions.find((entry) => entry.id === "address_labels")!.yMm;
  const colWidth = (innerTableWidthMm() - ADDRESS_GRID_COLUMN_GAP_MM) / 2;
  const leftX = PAGE_MARGIN_X_MM;
  const recipient = creative.regions.find((entry) => entry.id === "recipient_block")!;
  regions.push({
    id: "address_column_divider",
    xMm: leftX + colWidth + ADDRESS_GRID_COLUMN_GAP_MM / 2,
    yMm: addressTopY,
    widthMm: ADDRESS_COLUMN_DIVIDER_WIDTH_MM,
    heightMm: ADDRESS_SECTION_LABEL_STEP_MM + (recipient.bottomYMm - recipient.yMm),
  });

  regions.push({
    id: "website_url",
    xMm: A4_WIDTH_MM - PAGE_MARGIN_X_MM - WEBSITE_TEXT_BLOCK_WIDTH_MM,
    yMm: creative.regions.find((entry) => entry.id === "operator_brand_row")!.yMm,
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
