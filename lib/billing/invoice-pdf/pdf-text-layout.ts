import type { PDFPage } from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";

export function drawRightAlignedText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
}

export const META_LABEL_COLOR = rgb(0.38, 0.41, 0.46);
