import type { PDFFont, RGB } from "pdf-lib";
import {
  publicationPdfTextInkBoundsFromBaseline,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";

export type PublicationPdfRecordedDrawKind = "text" | "rect" | "line";

export type PublicationPdfRecordedTextDraw = {
  kind: "text";
  blockId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  topY: number;
  bottomY: number;
  text: string;
  fontSize: number;
  lineHeight: number;
};

export type PublicationPdfRecordedRectDraw = {
  kind: "rect";
  blockId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PublicationPdfRecordedLineDraw = {
  kind: "line";
  blockId: string;
  pageIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PublicationPdfRecordedDraw =
  | PublicationPdfRecordedTextDraw
  | PublicationPdfRecordedRectDraw
  | PublicationPdfRecordedLineDraw;

export type PublicationPdfDrawRecorder = {
  pageIndex: number;
  operations: PublicationPdfRecordedDraw[];
};

export function createPublicationPdfDrawRecorder(initialPageIndex = 0): PublicationPdfDrawRecorder {
  return { pageIndex: initialPageIndex, operations: [] };
}

export function recordPublicationPdfTextDraw(
  recorder: PublicationPdfDrawRecorder | null | undefined,
  input: {
    blockId: string;
    x: number;
    baselineY: number;
    text: string;
    font: PDFFont;
    fontSize: number;
    lineHeight: number;
    color: RGB;
  },
): void {
  if (!recorder) return;
  const width = input.font.widthOfTextAtSize(input.text, input.fontSize);
  const { topY, bottomY } = publicationPdfTextInkBoundsFromBaseline(input.baselineY, input.fontSize);
  recorder.operations.push({
    kind: "text",
    blockId: input.blockId,
    pageIndex: recorder.pageIndex,
    x: input.x,
    y: input.baselineY,
    width,
    topY,
    bottomY,
    text: input.text,
    fontSize: input.fontSize,
    lineHeight: input.lineHeight,
  });
}

export function recordPublicationPdfRectDraw(
  recorder: PublicationPdfDrawRecorder | null | undefined,
  input: {
    blockId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  },
): void {
  if (!recorder) return;
  recorder.operations.push({
    kind: "rect",
    pageIndex: recorder.pageIndex,
    ...input,
  });
}

export function recordPublicationPdfLineDraw(
  recorder: PublicationPdfDrawRecorder | null | undefined,
  input: {
    blockId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  },
): void {
  if (!recorder) return;
  recorder.operations.push({
    kind: "line",
    pageIndex: recorder.pageIndex,
    ...input,
  });
}

export function publicationPdfRecordedTextDraws(
  recorder: PublicationPdfDrawRecorder,
): PublicationPdfRecordedTextDraw[] {
  return recorder.operations.filter((op): op is PublicationPdfRecordedTextDraw => op.kind === "text");
}
