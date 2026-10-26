import {
  publicationPdfCursorYAfterResultRow,
  publicationPdfFontCapHeightPt,
  publicationPdfFontDescenderPt,
  publicationPdfResultRowGeometryFromBandTop,
  publicationPdfResultRowLayout,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-statement-layout";

/** @deprecated Prefer publicationPdfResultRowLayout — kept for R5R1 import stability during R5R2. */
export const PUBLICATION_PDF_RESULT_SEPARATOR_ABOVE_BASELINE_MM = 0;

/** @deprecated R5R2 derives band height from font metrics + padding. */
export const PUBLICATION_PDF_RESULT_SURFACE_BOTTOM_BELOW_BASELINE_MM = 0;

/** @deprecated R5R2 — see PUBLICATION_PDF_RESULT_BAND_HEIGHT_MM. */
export const PUBLICATION_PDF_RESULT_SURFACE_HEIGHT_MM = 8.25;

/** @deprecated R5R2 — padding is symmetric inside the band. */
export const PUBLICATION_PDF_RESULT_BAND_BOTTOM_PADDING_MM = 0;

/** @deprecated R5R2 — use publicationPdfVerticalSpace md token via result row layout. */
export const PUBLICATION_PDF_RESULT_TO_PUBLICATION_SECTION_GAP_MM = 5;

/** @deprecated R5R2 — use minResultEvidenceClearancePt from result row layout. */
export const PUBLICATION_PDF_RESULT_PUBLICATION_MIN_GAP_MM = 2.5;

export type PublicationPdfResultBandLayout = {
  separatorAboveBaselinePt: number;
  surfaceBottomBelowBaselinePt: number;
  surfaceHeightPt: number;
  bottomPaddingPt: number;
  publicationSectionGapPt: number;
  minPublicationClearancePt: number;
  textSizePt: number;
};

/** Legacy adapter — maps R5R2 geometry to R5R1 test field names. */
export function publicationPdfResultBandLayout(): PublicationPdfResultBandLayout {
  const layout = publicationPdfResultRowLayout();
  return {
    separatorAboveBaselinePt: 0,
    surfaceBottomBelowBaselinePt: layout.bandHeightPt - layout.paddingPt,
    surfaceHeightPt: layout.bandHeightPt,
    bottomPaddingPt: 0,
    publicationSectionGapPt: layout.resultToEvidenceGapPt,
    minPublicationClearancePt: layout.minResultEvidenceClearancePt,
    textSizePt: layout.textSizePt,
  };
}

/** pdf-lib baseline Y → bottom edge of the result band. */
export function publicationPdfResultBandBottomYFromBaseline(baselineY: number): number {
  const layout = publicationPdfResultRowLayout();
  const cap = publicationPdfFontCapHeightPt(layout.textSizePt);
  const desc = publicationPdfFontDescenderPt(layout.textSizePt);
  const textBox = cap + desc;
  const inner = layout.bandHeightPt - layout.paddingPt * 2;
  const slack = Math.max(0, inner - textBox);
  return baselineY - layout.paddingPt - desc - slack / 2;
}

/** Band bottom from explicit band-top separator Y (preferred in R5R2). */
export function publicationPdfResultBandBottomYFromBandTop(bandTopY: number): number {
  return publicationPdfResultRowGeometryFromBandTop(bandTopY).bandBottomY;
}

/** Cursor Y after drawing the full result band block. */
export function publicationPdfAdvanceYAfterResultBand(bandTopY: number): number {
  const bandBottomY = publicationPdfResultBandBottomYFromBandTop(bandTopY);
  return publicationPdfCursorYAfterResultRow(bandBottomY);
}

/** Approximate cap height above baseline for collision checks (Helvetica-like). */
export function publicationPdfResultTextCapHeightPt(
  fontSizePt: number = publicationPdfResultRowLayout().textSizePt,
): number {
  return publicationPdfFontCapHeightPt(fontSizePt);
}

export {
  publicationPdfResultRowGeometryFromBandTop,
  publicationPdfResultRowLayout,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-statement-layout";
