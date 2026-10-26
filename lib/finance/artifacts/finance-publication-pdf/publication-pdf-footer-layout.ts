import type { PDFFont } from "pdf-lib";

/** Horizontal bands for publication PDF footer (points, left edge x). */
export type PublicationPdfFooterZones = {
  left: { x: number; maxWidth: number };
  center: { x: number; maxWidth: number };
  right: { x: number; maxWidth: number };
};

export function computePublicationPdfFooterZones(
  pageWidthPt: number,
  marginXPt: number,
): PublicationPdfFooterZones {
  const contentWidth = pageWidthPt - marginXPt * 2;
  const third = contentWidth / 3;
  const gutter = 4;
  return {
    left: { x: marginXPt, maxWidth: third - gutter },
    center: { x: marginXPt + third, maxWidth: third },
    right: { x: marginXPt + third * 2, maxWidth: third - gutter },
  };
}

export function truncateTextToMaxWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "...";
  let trimmed = text;
  while (trimmed.length > 1 && font.widthOfTextAtSize(`${trimmed}${ellipsis}`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length < text.length ? `${trimmed}${ellipsis}` : trimmed;
}

export function publicationPdfFooterTextWidthsFitZones(input: {
  leftTextWidth: number;
  centerTextWidth: number;
  rightTextWidth: number;
  zones: PublicationPdfFooterZones;
}): boolean {
  const { leftTextWidth, centerTextWidth, rightTextWidth, zones } = input;
  const leftEnd = zones.left.x + leftTextWidth;
  const centerStart = zones.center.x;
  const centerEnd = zones.center.x + centerTextWidth;
  const rightStart = zones.right.x;
  const rightEnd = zones.right.x + rightTextWidth;
  const pageRight = zones.right.x + zones.right.maxWidth;

  if (leftEnd > centerStart) return false;
  if (centerEnd > rightStart) return false;
  if (rightEnd > pageRight + 0.5) return false;
  return true;
}
