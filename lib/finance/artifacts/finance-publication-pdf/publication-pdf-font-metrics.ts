/** Helvetica-like cap height and descender depth for layout (pdf-lib baseline coordinates). */
export function publicationPdfFontCapHeightPt(fontSizePt: number): number {
  return fontSizePt * 0.72;
}

export function publicationPdfFontDescenderPt(fontSizePt: number): number {
  return fontSizePt * 0.22;
}

/** Explicit line height — always strictly greater than font size for body/evidence copy. */
export function publicationPdfLineHeightPt(fontSizePt: number): number {
  return Math.max(fontSizePt * 1.3125, fontSizePt + 2.5);
}

export function publicationPdfTextInkBoundsFromBaseline(
  baselineY: number,
  fontSizePt: number,
): { topY: number; bottomY: number } {
  return {
    topY: baselineY + publicationPdfFontCapHeightPt(fontSizePt),
    bottomY: baselineY - publicationPdfFontDescenderPt(fontSizePt),
  };
}
