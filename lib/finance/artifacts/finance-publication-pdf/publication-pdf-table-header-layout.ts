import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import {
  publicationPdfFontCapHeightPt,
  publicationPdfFontDescenderPt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";

/** Grey header band height (unchanged from R5R2 grid). */
export const PUBLICATION_PDF_TABLE_HEADER_BAND_HEIGHT_MM = 6;

/**
 * Legacy flow anchor: band bottom sits this far below `anchorY` (pre-R5R3R1 `ctx.y` at header draw).
 * Keeps header band position stable relative to section titles.
 */
export const PUBLICATION_PDF_TABLE_HEADER_BAND_BOTTOM_OFFSET_MM = 5.5;

/** Minimum visual clearance between header band bottom and first data row ink top (pdf-lib Y). */
export const TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT = mmToPt(1.25);

export type PublicationPdfTableHeaderBandGeometry = {
  anchorY: number;
  bandTopY: number;
  bandBottomY: number;
  bandHeightPt: number;
  headerTextBaselineY: number;
  firstRowBaselineY: number;
};

export function publicationPdfTableHeaderBandHeightPt(): number {
  return mmToPt(PUBLICATION_PDF_TABLE_HEADER_BAND_HEIGHT_MM);
}

export function publicationPdfTableHeaderGeometryFromAnchor(anchorY: number): PublicationPdfTableHeaderBandGeometry {
  const bandHeightPt = publicationPdfTableHeaderBandHeightPt();
  const bandBottomY = anchorY - mmToPt(PUBLICATION_PDF_TABLE_HEADER_BAND_BOTTOM_OFFSET_MM);
  const bandTopY = bandBottomY + bandHeightPt;
  const headerSize = TYPE.tableHeader;
  const cap = publicationPdfFontCapHeightPt(headerSize);
  const desc = publicationPdfFontDescenderPt(headerSize);
  const textBoxHeight = cap + desc;
  const slack = Math.max(0, bandHeightPt - textBoxHeight);
  const headerTextBaselineY = bandBottomY + desc + slack / 2;

  const rowCap = publicationPdfFontCapHeightPt(TYPE.tableRow);
  const firstRowTopY = bandBottomY - TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT;
  const firstRowBaselineY = firstRowTopY - rowCap;

  return {
    anchorY,
    bandTopY,
    bandBottomY,
    bandHeightPt,
    headerTextBaselineY,
    firstRowBaselineY,
  };
}

/** Flow cursor Y after the full header block (first ordinary row baseline). */
export function publicationPdfCursorYAfterTableHeader(anchorY: number): number {
  return publicationPdfTableHeaderGeometryFromAnchor(anchorY).firstRowBaselineY;
}
