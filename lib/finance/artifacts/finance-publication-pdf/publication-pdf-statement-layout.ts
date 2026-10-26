import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import {
  publicationPdfFontCapHeightPt,
  publicationPdfFontDescenderPt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";
import {
  publicationPdfStatementRowAdvancePt,
  publicationPdfVerticalSpacePt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-vertical-spacing";

export { publicationPdfFontCapHeightPt, publicationPdfFontDescenderPt };

/** Symmetric padding inside the result band (above/below text cap box). */
export const PUBLICATION_PDF_RESULT_BAND_PADDING_MM = 1.35;

/** Target band height ≈ 1.5× an ordinary statement row. */
export const PUBLICATION_PDF_RESULT_BAND_HEIGHT_MM = 8.25;

export type PublicationPdfResultRowLayout = {
  bandHeightPt: number;
  paddingPt: number;
  separatorStrokePt: number;
  textSizePt: number;
  rowAdvancePt: number;
  /** Gap after result band before publication evidence block. */
  resultToEvidenceGapPt: number;
  /** Minimum gap enforced in semantic geometry (may be smaller than visual gap). */
  minResultEvidenceClearancePt: number;
};

export function publicationPdfResultRowLayout(): PublicationPdfResultRowLayout {
  return {
    bandHeightPt: mmToPt(PUBLICATION_PDF_RESULT_BAND_HEIGHT_MM),
    paddingPt: mmToPt(PUBLICATION_PDF_RESULT_BAND_PADDING_MM),
    separatorStrokePt: 0.45,
    textSizePt: TYPE.tableResult,
    rowAdvancePt: publicationPdfStatementRowAdvancePt(),
    resultToEvidenceGapPt: publicationPdfVerticalSpacePt("md"),
    minResultEvidenceClearancePt: publicationPdfVerticalSpacePt("xs"),
  };
}

/**
 * Given the top edge of the result band (separator line Y), compute fill bounds and
 * optically centred text baseline.
 */
export function publicationPdfResultRowGeometryFromBandTop(bandTopY: number): {
  bandTopY: number;
  bandBottomY: number;
  separatorY: number;
  baselineY: number;
  surfaceHeightPt: number;
} {
  const layout = publicationPdfResultRowLayout();
  const bandBottomY = bandTopY - layout.bandHeightPt;
  const cap = publicationPdfFontCapHeightPt(layout.textSizePt);
  const desc = publicationPdfFontDescenderPt(layout.textSizePt);
  const textBoxHeight = cap + desc;
  const innerHeight = layout.bandHeightPt - layout.paddingPt * 2;
  const slack = Math.max(0, innerHeight - textBoxHeight);
  const baselineY = bandBottomY + layout.paddingPt + desc + slack / 2;
  return {
    bandTopY,
    bandBottomY,
    separatorY: bandTopY,
    baselineY,
    surfaceHeightPt: layout.bandHeightPt,
  };
}

/** Cursor Y after the full result row (band + trailing whitespace before evidence). */
export function publicationPdfCursorYAfterResultRow(bandBottomY: number): number {
  const layout = publicationPdfResultRowLayout();
  return bandBottomY - layout.resultToEvidenceGapPt;
}

/** Band bottom from explicit band-top separator Y. */
export function publicationPdfResultBandBottomYFromBandTop(bandTopY: number): number {
  return publicationPdfResultRowGeometryFromBandTop(bandTopY).bandBottomY;
}

/** Cursor Y after drawing the full result band block. */
export function publicationPdfAdvanceYAfterResultBand(bandTopY: number): number {
  const bandBottomY = publicationPdfResultBandBottomYFromBandTop(bandTopY);
  return publicationPdfCursorYAfterResultRow(bandBottomY);
}

export function publicationPdfResultTextCapHeightPt(
  fontSizePt: number = publicationPdfResultRowLayout().textSizePt,
): number {
  return publicationPdfFontCapHeightPt(fontSizePt);
}

/** Approved compact height range (~1.4–1.6 ordinary rows). */
export function publicationPdfResultBandHeightBoundsPt(): { min: number; max: number } {
  const row = publicationPdfStatementRowAdvancePt();
  return { min: row * 1.35, max: row * 1.65 };
}
