import type { PDFPage, PDFFont, RGB } from "pdf-lib";
import { pdfSafeText } from "@/lib/finance/artifacts/finance-publication-pdf/pdf-safe-text";
import {
  publicationPdfFontDescenderPt,
  publicationPdfLineHeightPt,
  publicationPdfTextInkBoundsFromBaseline,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";
import {
  recordPublicationPdfTextDraw,
  type PublicationPdfDrawRecorder,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";

export type PublicationPdfTextLineGeometry = {
  baselineY: number;
  topY: number;
  bottomY: number;
  text: string;
};

export type PublicationPdfTextBlockResult = {
  firstBaselineY: number;
  topY: number;
  bottomY: number;
  lineCount: number;
  /** Cursor for the next block — below ink plus optional trailing gap. */
  nextY: number;
  lines: PublicationPdfTextLineGeometry[];
};

function wrapTextLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = pdfSafeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

/**
 * Draw wrapped or single-line copy and advance by actual ink height.
 * `startBaselineY` is the first line's pdf-lib text baseline.
 */
export function drawPublicationTextBlock(
  page: PDFPage,
  input: {
    text: string;
    x: number;
    startBaselineY: number;
    maxWidth: number;
    fontSize: number;
    font: PDFFont;
    color: RGB;
    lineHeight?: number;
    blockId?: string;
    recorder?: PublicationPdfDrawRecorder | null;
    trailingGapPt?: number;
  },
): PublicationPdfTextBlockResult {
  const lineHeight = input.lineHeight ?? publicationPdfLineHeightPt(input.fontSize);
  if (lineHeight <= input.fontSize) {
    throw new Error("drawPublicationTextBlock: lineHeight must exceed fontSize.");
  }

  const blockId = input.blockId ?? "text";
  const lines = wrapTextLines(input.text, input.font, input.fontSize, input.maxWidth);
  const drawn: PublicationPdfTextLineGeometry[] = [];
  let baselineY = input.startBaselineY;

  for (const line of lines) {
    const safe = pdfSafeText(line);
    page.drawText(safe, {
      x: input.x,
      y: baselineY,
      size: input.fontSize,
      font: input.font,
      color: input.color,
    });
    const bounds = publicationPdfTextInkBoundsFromBaseline(baselineY, input.fontSize);
    drawn.push({ baselineY, topY: bounds.topY, bottomY: bounds.bottomY, text: safe });
    recordPublicationPdfTextDraw(input.recorder, {
      blockId,
      x: input.x,
      baselineY,
      text: safe,
      font: input.font,
      fontSize: input.fontSize,
      lineHeight,
      color: input.color,
    });
    baselineY -= lineHeight;
  }

  const firstBaselineY = input.startBaselineY;
  const topY = Math.max(...drawn.map((l) => l.topY));
  const bottomY = Math.min(...drawn.map((l) => l.bottomY));
  const trailing = input.trailingGapPt ?? 0;

  return {
    firstBaselineY,
    topY,
    bottomY,
    lineCount: drawn.length,
    nextY: bottomY - trailing,
    lines: drawn,
  };
}

/** One physical line; advances by lineHeight plus optional trailing gap. */
export function drawPublicationSingleLine(
  page: PDFPage,
  input: {
    text: string;
    x: number;
    baselineY: number;
    fontSize: number;
    font: PDFFont;
    color: RGB;
    lineHeight?: number;
    blockId?: string;
    recorder?: PublicationPdfDrawRecorder | null;
    trailingGapPt?: number;
  },
): PublicationPdfTextBlockResult {
  const lineHeight = input.lineHeight ?? publicationPdfLineHeightPt(input.fontSize);
  const blockId = input.blockId ?? "text";
  const safe = pdfSafeText(input.text);
  page.drawText(safe, {
    x: input.x,
    y: input.baselineY,
    size: input.fontSize,
    font: input.font,
    color: input.color,
  });
  recordPublicationPdfTextDraw(input.recorder, {
    blockId,
    x: input.x,
    baselineY: input.baselineY,
    text: safe,
    font: input.font,
    fontSize: input.fontSize,
    lineHeight,
    color: input.color,
  });
  const bounds = publicationPdfTextInkBoundsFromBaseline(input.baselineY, input.fontSize);
  const trailing = input.trailingGapPt ?? 0;
  return {
    firstBaselineY: input.baselineY,
    topY: bounds.topY,
    bottomY: bounds.bottomY,
    lineCount: 1,
    nextY: bounds.bottomY - trailing,
    lines: [{ baselineY: input.baselineY, topY: bounds.topY, bottomY: bounds.bottomY, text: safe }],
  };
}

/** Gap between sequential wrapped lines inside one block (visual clearance). */
export function publicationPdfWrappedLineClearancePt(
  lineHeight: number,
  fontSize: number,
): number {
  const ink = publicationPdfFontDescenderPt(fontSize) + fontSize * 0.72;
  return lineHeight - ink;
}
