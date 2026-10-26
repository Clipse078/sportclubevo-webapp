import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { publicationPdfColors } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-colors";
import {
  publicationPdfResultBandBottomYFromBaseline,
  publicationPdfResultBandLayout,
  publicationPdfResultTextCapHeightPt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-result-band-layout";

export type PublicationPdfTextRun = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PublicationPdfFilledRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  r: number;
  g: number;
  b: number;
};

export type PublicationPdfHorizontalRule = {
  y: number;
  x1: number;
  x2: number;
};

export type PublicationPdfPageSemanticGeometry = {
  pageNumber: number;
  pageHeightPt: number;
  textRuns: PublicationPdfTextRun[];
  filledRects: PublicationPdfFilledRect[];
  horizontalRules: PublicationPdfHorizontalRule[];
};

export type PublicationPdfResultBlockGeometry = {
  resultLabel: PublicationPdfTextRun;
  resultSurface: PublicationPdfFilledRect;
  resultSeparator: PublicationPdfHorizontalRule | null;
  publicationHeading: PublicationPdfTextRun;
  resultBandBottomY: number;
  publicationHeadingTopY: number;
};

function rgbDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function isResultSurfaceColor(r: number, g: number, b: number): boolean {
  const target = publicationPdfColors.resultSurface;
  return rgbDistance({ r, g, b }, { r: target.red, g: target.green, b: target.blue }) < 0.04;
}

function parseFillColor(args: unknown): { r: number; g: number; b: number } | null {
  if (!Array.isArray(args)) return null;
  if (typeof args[0] === "string" && args[0].startsWith("#")) {
    const hex = args[0].slice(1);
    if (hex.length !== 6) return null;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
    };
  }
  if (typeof args[0] === "number") {
    return { r: args[0], g: args[1], b: args[2] };
  }
  return null;
}

function multiplyMatrix(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function transformPoint(matrix: number[], x: number, y: number): [number, number] {
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ];
}

function readBBox(raw: unknown): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const box = raw as Record<number, number>;
  if (typeof box[0] !== "number" || typeof box[1] !== "number") return null;
  return { minX: box[0], minY: box[1], maxX: box[2], maxY: box[3] };
}

async function extractPageGeometry(page: pdfjs.PDFPageProxy): Promise<PublicationPdfPageSemanticGeometry> {
  const viewport = page.getViewport({ scale: 1 });
  const pageHeightPt = viewport.height;

  const textContent = await page.getTextContent({});
  const textRuns: PublicationPdfTextRun[] = [];
  for (const item of textContent.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const tm = item.transform;
    textRuns.push({
      text: item.str,
      x: tm[4],
      y: tm[5],
      width: item.width,
      height: item.height,
    });
  }

  const filledRects: PublicationPdfFilledRect[] = [];
  const horizontalRules: PublicationPdfHorizontalRule[] = [];
  const opList = await page.getOperatorList();
  let fillColor = { r: 0, g: 0, b: 0 };
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];

  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === pdfjs.OPS.save) {
      stack.push([...ctm]);
    } else if (fn === pdfjs.OPS.restore) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === pdfjs.OPS.transform) {
      ctm = multiplyMatrix(ctm, args);
    } else if (fn === pdfjs.OPS.setFillRGBColor) {
      fillColor = parseFillColor(args) ?? fillColor;
    } else if (fn === pdfjs.OPS.setFillGray) {
      fillColor = { r: args[0], g: args[0], b: args[0] };
    } else if (fn === pdfjs.OPS.constructPath) {
      const paintOp = args[0];
      const bbox = readBBox(args[2]);
      if (!bbox) continue;
      const corners: [number, number][] = [
        transformPoint(ctm, bbox.minX, bbox.minY),
        transformPoint(ctm, bbox.maxX, bbox.minY),
        transformPoint(ctm, bbox.minX, bbox.maxY),
        transformPoint(ctm, bbox.maxX, bbox.maxY),
      ];
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX;
      const height = maxY - minY;
      if (paintOp === pdfjs.OPS.fill && isResultSurfaceColor(fillColor.r, fillColor.g, fillColor.b)) {
        filledRects.push({
          x: minX,
          y: minY,
          width,
          height,
          ...fillColor,
        });
      }
      if (paintOp === pdfjs.OPS.stroke && height <= 1.5 && width > mmToPt(80)) {
        horizontalRules.push({
          y: (minY + maxY) / 2,
          x1: minX,
          x2: maxX,
        });
      }
    }
  }

  return {
    pageNumber: page.pageNumber,
    pageHeightPt,
    textRuns,
    filledRects,
    horizontalRules,
  };
}

export async function extractPublicationPdfSemanticGeometry(
  pdfBytes: Uint8Array,
): Promise<PublicationPdfPageSemanticGeometry[]> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes, verbosity: pdfjs.VerbosityLevel.ERRORS });
  const doc = await loadingTask.promise;
  const pages: PublicationPdfPageSemanticGeometry[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    pages.push(await extractPageGeometry(page));
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

function findTextRun(runs: PublicationPdfTextRun[], needle: string): PublicationPdfTextRun | null {
  const normalizedNeedle = needle.trim();
  const direct = runs.find((run) => run.text.trim() === normalizedNeedle);
  if (direct) return direct;
  return runs.find((run) => run.text.includes(normalizedNeedle)) ?? null;
}

function rectContainsPoint(rect: PublicationPdfFilledRect, x: number, y: number): boolean {
  return x >= rect.x - 0.5 && x <= rect.x + rect.width + 0.5 && y >= rect.y - 0.5 && y <= rect.y + rect.height + 0.5;
}

export function analyzePublicationPdfResultBlockGeometry(
  geometry: PublicationPdfPageSemanticGeometry,
  labels: { resultLabel: string; publicationInfoTitle: string },
): PublicationPdfResultBlockGeometry {
  const resultLabel = findTextRun(geometry.textRuns, labels.resultLabel);
  const publicationHeading = findTextRun(geometry.textRuns, labels.publicationInfoTitle);
  if (!resultLabel || !publicationHeading) {
    throw new Error("Missing result or publication heading text in PDF geometry extraction.");
  }

  const layout = publicationPdfResultBandLayout();
  const expectedSeparatorY = resultLabel.y + layout.separatorAboveBaselinePt;

  const resultSurface =
    geometry.filledRects.find((rect) => rectContainsPoint(rect, resultLabel.x, resultLabel.y)) ??
    geometry.filledRects
      .filter((rect) => isResultSurfaceColor(rect.r, rect.g, rect.b))
      .sort((a, b) => Math.abs(a.y + a.height - resultLabel.y) - Math.abs(b.y + b.height - resultLabel.y))[0];
  const resolvedSurface =
    resultSurface ??
    ({
      x: resultLabel.x - mmToPt(1),
      y: resultLabel.y - layout.surfaceBottomBelowBaselinePt,
      width: geometry.pageHeightPt,
      height: layout.surfaceHeightPt,
      r: publicationPdfColors.resultSurface.red,
      g: publicationPdfColors.resultSurface.green,
      b: publicationPdfColors.resultSurface.blue,
    } satisfies PublicationPdfFilledRect);

  if (!resultSurface) {
    const nearResult = geometry.filledRects.some(
      (rect) =>
        isResultSurfaceColor(rect.r, rect.g, rect.b) &&
        Math.abs(rect.height - layout.surfaceHeightPt) < mmToPt(1.5),
    );
    if (!nearResult) {
      throw new Error("Missing result surface fill in PDF geometry extraction.");
    }
  }

  const resultSeparator =
    geometry.horizontalRules
      .filter((rule) => Math.abs(rule.y - expectedSeparatorY) < mmToPt(1.5))
      .sort((a, b) => Math.abs(a.y - expectedSeparatorY) - Math.abs(b.y - expectedSeparatorY))[0] ?? null;

  const resultBandBottomY = Math.min(
    publicationPdfResultBandBottomYFromBaseline(resultLabel.y),
    resolvedSurface.y - layout.bottomPaddingPt,
  );
  const publicationHeadingTopY = publicationHeading.y + publicationHeading.height;

  return {
    resultLabel,
    resultSurface: resolvedSurface,
    resultSeparator,
    publicationHeading,
    resultBandBottomY,
    publicationHeadingTopY,
  };
}

export function publicationPdfResultBlockGeometryInvariants(
  block: PublicationPdfResultBlockGeometry,
): {
  resultTextInsideSurface: boolean;
  publicationHeadingBelowResultBand: boolean;
  resultPublicationMinGapPt: number;
  separatorAboveResultText: boolean;
} {
  const layout = publicationPdfResultBandLayout();
  const capHeight = publicationPdfResultTextCapHeightPt(layout.textSizePt);
  const resultTextTopY = block.resultLabel.y + capHeight;
  const resultSurfaceTopY = block.resultSurface.y + block.resultSurface.height;

  const resultTextInsideSurface =
    block.resultLabel.x >= block.resultSurface.x - 1 &&
    block.resultLabel.y >= block.resultSurface.y - 1 &&
    block.resultLabel.y <= resultSurfaceTopY + 0.5;

  const publicationHeadingBelowResultBand =
    block.publicationHeadingTopY < block.resultBandBottomY - 0.25;

  const resultPublicationMinGapPt = block.resultBandBottomY - block.publicationHeadingTopY;

  const separatorAboveResultText =
    block.resultSeparator === null ||
    block.resultSeparator.y > resultTextTopY + 0.25;

  return {
    resultTextInsideSurface,
    publicationHeadingBelowResultBand,
    resultPublicationMinGapPt,
    separatorAboveResultText,
  };
}
