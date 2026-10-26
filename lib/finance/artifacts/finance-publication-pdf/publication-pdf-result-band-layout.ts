import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";

/** Vertical offset from result text baseline to top separator (pdf-lib Y, upward). */
export const PUBLICATION_PDF_RESULT_SEPARATOR_ABOVE_BASELINE_MM = 3;

/** Distance from result text baseline down to the bottom edge of the pale result surface. */
export const PUBLICATION_PDF_RESULT_SURFACE_BOTTOM_BELOW_BASELINE_MM = 6;

/** Height of the filled result surface band. */
export const PUBLICATION_PDF_RESULT_SURFACE_HEIGHT_MM = 7;

/** Padding below the result surface before the layout cursor advances. */
export const PUBLICATION_PDF_RESULT_BAND_BOTTOM_PADDING_MM = 2;

/** White-space gap between result band and publication-information heading. */
export const PUBLICATION_PDF_RESULT_TO_PUBLICATION_SECTION_GAP_MM = 7;

/** Minimum clearance enforced in semantic geometry tests (mm). */
export const PUBLICATION_PDF_RESULT_PUBLICATION_MIN_GAP_MM = 3;

export type PublicationPdfResultBandLayout = {
  separatorAboveBaselinePt: number;
  surfaceBottomBelowBaselinePt: number;
  surfaceHeightPt: number;
  bottomPaddingPt: number;
  publicationSectionGapPt: number;
  minPublicationClearancePt: number;
  textSizePt: number;
};

export function publicationPdfResultBandLayout(): PublicationPdfResultBandLayout {
  return {
    separatorAboveBaselinePt: mmToPt(PUBLICATION_PDF_RESULT_SEPARATOR_ABOVE_BASELINE_MM),
    surfaceBottomBelowBaselinePt: mmToPt(PUBLICATION_PDF_RESULT_SURFACE_BOTTOM_BELOW_BASELINE_MM),
    surfaceHeightPt: mmToPt(PUBLICATION_PDF_RESULT_SURFACE_HEIGHT_MM),
    bottomPaddingPt: mmToPt(PUBLICATION_PDF_RESULT_BAND_BOTTOM_PADDING_MM),
    publicationSectionGapPt: mmToPt(PUBLICATION_PDF_RESULT_TO_PUBLICATION_SECTION_GAP_MM),
    minPublicationClearancePt: mmToPt(PUBLICATION_PDF_RESULT_PUBLICATION_MIN_GAP_MM),
    textSizePt: TYPE.tableResult,
  };
}

/** pdf-lib baseline Y → bottom edge of the result band (including bottom padding). */
export function publicationPdfResultBandBottomYFromBaseline(baselineY: number): number {
  const layout = publicationPdfResultBandLayout();
  const surfaceBottomY = baselineY - layout.surfaceBottomBelowBaselinePt;
  return surfaceBottomY - layout.bottomPaddingPt;
}

/** Cursor Y after drawing the full result band block (separator + surface + text + padding). */
export function publicationPdfAdvanceYAfterResultBand(
  baselineY: number,
  labelEndY: number,
): number {
  const bandBottomY = publicationPdfResultBandBottomYFromBaseline(baselineY);
  const textClearY = labelEndY - mmToPt(1);
  return Math.min(bandBottomY, textClearY);
}

/** Approximate cap height above baseline for collision checks (Helvetica-like). */
export function publicationPdfResultTextCapHeightPt(fontSizePt: number = TYPE.tableResult): number {
  return fontSizePt * 0.72;
}
