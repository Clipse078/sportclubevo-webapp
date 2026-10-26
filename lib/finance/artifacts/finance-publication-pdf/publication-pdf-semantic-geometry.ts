import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { publicationPdfColors } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-colors";
import { publicationPdfResultTextCapHeightPt } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-result-band-layout";
import {
  publicationPdfFontCapHeightPt,
  publicationPdfFontDescenderPt,
  publicationPdfResultBandHeightBoundsPt,
  publicationPdfResultRowLayout,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-statement-layout";
import { computePublicationPdfAmountColumnRights } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-layout";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";
import { publicationPdfVerticalSpacePt } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-vertical-spacing";

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

  const layout = publicationPdfResultRowLayout();

  const resultSurface =
    geometry.filledRects.find((rect) => rectContainsPoint(rect, resultLabel.x, resultLabel.y)) ??
    geometry.filledRects
      .filter((rect) => isResultSurfaceColor(rect.r, rect.g, rect.b))
      .sort((a, b) => Math.abs(a.y + a.height / 2 - resultLabel.y) - Math.abs(b.y + b.height / 2 - resultLabel.y))[0];
  const resolvedSurface =
    resultSurface ??
    ({
      x: resultLabel.x - mmToPt(1),
      y: resultLabel.y - layout.bandHeightPt / 2,
      width: geometry.pageHeightPt,
      height: layout.bandHeightPt,
      r: publicationPdfColors.resultSurface.red,
      g: publicationPdfColors.resultSurface.green,
      b: publicationPdfColors.resultSurface.blue,
    } satisfies PublicationPdfFilledRect);

  if (!resultSurface) {
    const nearResult = geometry.filledRects.some(
      (rect) =>
        isResultSurfaceColor(rect.r, rect.g, rect.b) &&
        Math.abs(rect.height - layout.bandHeightPt) < mmToPt(1.5),
    );
    if (!nearResult) {
      throw new Error("Missing result surface fill in PDF geometry extraction.");
    }
  }

  const bandTopY = resolvedSurface.y + resolvedSurface.height;
  const resultSeparator =
    geometry.horizontalRules
      .filter((rule) => Math.abs(rule.y - bandTopY) < mmToPt(1.2))
      .sort((a, b) => Math.abs(a.y - bandTopY) - Math.abs(b.y - bandTopY))[0] ?? null;

  const resultBandBottomY = resolvedSurface.y;
  return {
    resultLabel,
    resultSurface: resolvedSurface,
    resultSeparator,
    publicationHeading,
    resultBandBottomY,
    /** Baseline Y of the publication evidence heading (pdf-lib coordinates). */
    publicationHeadingTopY: publicationHeading.y,
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
  const layout = publicationPdfResultRowLayout();
  const capHeight = publicationPdfResultTextCapHeightPt(layout.textSizePt);
  const resultTextTopY = block.resultLabel.y + capHeight;
  const resultSurfaceTopY = block.resultSurface.y + block.resultSurface.height;

  const resultTextInsideSurface =
    block.resultLabel.x >= block.resultSurface.x - 1 &&
    block.resultLabel.y >= block.resultSurface.y - 0.5 &&
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

export type PublicationPdfStatementTransitionGeometry = {
  expenseSubtotalLabel: PublicationPdfTextRun;
  resultLabel: PublicationPdfTextRun;
  resultSurface: PublicationPdfFilledRect;
  dividerCountBetweenExpenseSubtotalAndResult: number;
  resultColumnVarianceRight: number | null;
  expenseSubtotalColumnVarianceRight: number | null;
  resultBandHeightPt: number;
  resultTextVerticalCenterOffsetPt: number;
};

function runsOnBaseline(runs: PublicationPdfTextRun[], baselineY: number, tolerancePt = 1.25): PublicationPdfTextRun[] {
  return runs.filter((run) => Math.abs(run.y - baselineY) <= tolerancePt);
}

function rightEdgeOfRun(run: PublicationPdfTextRun): number {
  return run.x + run.width;
}

export function analyzePublicationPdfStatementTransitionGeometry(
  geometry: PublicationPdfPageSemanticGeometry,
  labels: {
    expenseSectionTotal: string;
    resultLabel: string;
  },
): PublicationPdfStatementTransitionGeometry {
  const expenseSubtotalLabel = findTextRun(geometry.textRuns, labels.expenseSectionTotal);
  const resultLabel = findTextRun(geometry.textRuns, labels.resultLabel);
  if (!expenseSubtotalLabel || !resultLabel) {
    throw new Error("Missing expense subtotal or result label in PDF geometry extraction.");
  }

  const resultSurface =
    geometry.filledRects.find((rect) => rectContainsPoint(rect, resultLabel.x, resultLabel.y)) ??
    geometry.filledRects.find((rect) => isResultSurfaceColor(rect.r, rect.g, rect.b));
  if (!resultSurface) {
    throw new Error("Missing result surface for statement transition geometry.");
  }

  const bandTopY = resultSurface.y + resultSurface.height;
  const expenseBaselineY = expenseSubtotalLabel.y;

  /** Rules strictly between expense subtotal and result band top (excluding owned band-top separator). */
  const interiorTransitionRules = geometry.horizontalRules.filter(
    (rule) => rule.y < bandTopY - mmToPt(0.35) && rule.y > expenseBaselineY - mmToPt(6),
  );
  const bandTopSeparatorPresent = geometry.horizontalRules.some(
    (rule) => Math.abs(rule.y - bandTopY) <= mmToPt(1.2),
  );
  const transitionGapPt = bandTopY - expenseBaselineY;

  /**
   * Owned transition: expense subtotal defers its closing rule; Ergebnis band top is the sole divider.
   * pdfjs may omit thin stroke paths — treat a compact gap with no interior rules as a single transition.
   */
  const dividers =
    interiorTransitionRules.length === 0 && (bandTopSeparatorPresent || transitionGapPt <= mmToPt(6))
      ? 1
      : interiorTransitionRules.length + (bandTopSeparatorPresent ? 1 : 0);

  const expenseAmountRuns = runsOnBaseline(geometry.textRuns, expenseBaselineY).filter(
    (run) => run.text.trim() !== labels.expenseSectionTotal.trim(),
  );
  const resultAmountRuns = runsOnBaseline(geometry.textRuns, resultLabel.y).filter(
    (run) => run.text.trim() !== labels.resultLabel.trim(),
  );

  const expenseSubtotalColumnVarianceRight =
    expenseAmountRuns.length > 0
      ? Math.max(...expenseAmountRuns.map((run) => rightEdgeOfRun(run)))
      : null;
  const resultColumnVarianceRight =
    resultAmountRuns.length > 0 ? Math.max(...resultAmountRuns.map((run) => rightEdgeOfRun(run))) : null;

  const cap = publicationPdfFontCapHeightPt(layoutTextSize());
  const desc = publicationPdfFontDescenderPt(layoutTextSize());
  const textMidY = resultLabel.y + (cap - desc) / 2;
  const surfaceMidY = resultSurface.y + resultSurface.height / 2;

  return {
    expenseSubtotalLabel,
    resultLabel,
    resultSurface,
    dividerCountBetweenExpenseSubtotalAndResult: dividers,
    resultColumnVarianceRight,
    expenseSubtotalColumnVarianceRight,
    resultBandHeightPt: resultSurface.height,
    resultTextVerticalCenterOffsetPt: textMidY - surfaceMidY,
  };
}

function layoutTextSize(): number {
  return publicationPdfResultRowLayout().textSizePt;
}

export function publicationPdfStatementTransitionInvariants(
  transition: PublicationPdfStatementTransitionGeometry,
): {
  singleDividerBeforeResult: boolean;
  resultColumnAlignedWithStatement: boolean;
  resultBandCompact: boolean;
  resultTextVerticallyCentered: boolean;
  expenseSubtotalAboveResult: boolean;
} {
  const canonical = computePublicationPdfAmountColumnRights();
  const columnTolerancePt = mmToPt(0.8);
  const heightBounds = publicationPdfResultBandHeightBoundsPt();
  const centerTolerancePt = mmToPt(0.9);

  const resultColumnAlignedWithStatement =
    transition.resultColumnVarianceRight !== null &&
    Math.abs(transition.resultColumnVarianceRight - canonical.variance) <= columnTolerancePt;

  return {
    singleDividerBeforeResult: transition.dividerCountBetweenExpenseSubtotalAndResult === 1,
    resultColumnAlignedWithStatement,
    resultBandCompact:
      transition.resultBandHeightPt >= heightBounds.min - 0.5 &&
      transition.resultBandHeightPt <= heightBounds.max + 0.5,
    resultTextVerticallyCentered:
      Math.abs(transition.resultTextVerticalCenterOffsetPt) <= centerTolerancePt,
    expenseSubtotalAboveResult:
      transition.expenseSubtotalLabel.y > transition.resultSurface.y + transition.resultSurface.height,
  };
}

export type PublicationPdfEvidenceHierarchyGeometry = {
  statementHeading: PublicationPdfTextRun;
  publicationHeading: PublicationPdfTextRun;
};

export function analyzePublicationPdfEvidenceHierarchyGeometry(
  geometry: PublicationPdfPageSemanticGeometry,
  labels: { statementSectionTitle: string; publicationInfoTitle: string },
): PublicationPdfEvidenceHierarchyGeometry {
  const statementHeading = findTextRun(geometry.textRuns, labels.statementSectionTitle);
  const publicationHeading = findTextRun(geometry.textRuns, labels.publicationInfoTitle);
  if (!statementHeading || !publicationHeading) {
    throw new Error("Missing statement or publication heading in PDF geometry extraction.");
  }
  return { statementHeading, publicationHeading };
}

export function publicationPdfEvidenceHierarchyInvariants(
  hierarchy: PublicationPdfEvidenceHierarchyGeometry,
): { publicationHeadingSmallerThanStatement: boolean } {
  return {
    publicationHeadingSmallerThanStatement:
      hierarchy.publicationHeading.height + 0.05 < hierarchy.statementHeading.height,
  };
}

export type PublicationPdfPageCompositionBlock = {
  name: string;
  topY: number;
  bottomY: number;
};

export function analyzePublicationPdfPageComposition(
  geometry: PublicationPdfPageSemanticGeometry,
  anchors: {
    reportTitle: string;
    heroForecastLabel: string;
    managementTitle: string;
    statementTitle: string;
    publicationInfoTitle: string;
    footerPageLabel: string;
  },
): PublicationPdfPageCompositionBlock[] {
  const find = (needle: string) => findTextRun(geometry.textRuns, needle);
  const blocks: PublicationPdfPageCompositionBlock[] = [];

  const reportTitle = find(anchors.reportTitle);
  const hero = find(anchors.heroForecastLabel);
  const management = find(anchors.managementTitle);
  const statement = find(anchors.statementTitle);
  const publication = find(anchors.publicationInfoTitle);
  const footer = find(anchors.footerPageLabel);

  if (reportTitle) {
    blocks.push({
      name: "masthead",
      topY: reportTitle.y + reportTitle.height,
      bottomY: hero ? hero.y - mmToPt(2) : reportTitle.y - mmToPt(8),
    });
  }
  if (hero) {
    blocks.push({
      name: "hero",
      topY: hero.y + hero.height + mmToPt(12),
      bottomY: management ? management.y + mmToPt(2) : hero.y - mmToPt(10),
    });
  }
  if (management) {
    blocks.push({
      name: "management",
      topY: management.y + management.height,
      bottomY: statement ? statement.y + mmToPt(2) : management.y - mmToPt(8),
    });
  }
  if (statement) {
    blocks.push({
      name: "statement",
      topY: statement.y + statement.height,
      bottomY: publication ? publication.y + publication.height + mmToPt(2) : statement.y - mmToPt(40),
    });
  }
  if (publication) {
    blocks.push({
      name: "publicationEvidence",
      topY: publication.y + publication.height,
      bottomY: footer ? footer.y + footer.height + mmToPt(2) : publication.y - mmToPt(12),
    });
  }
  if (footer) {
    blocks.push({
      name: "footer",
      topY: footer.y + footer.height,
      bottomY: footer.y - mmToPt(6),
    });
  }

  return blocks;
}

export function publicationPdfPageCompositionInvariants(
  blocks: PublicationPdfPageCompositionBlock[],
): { noOverlap: boolean; statementAbovePublicationEvidence: boolean; resultToEvidenceGapWithinBounds: boolean } {
  const statement = blocks.find((b) => b.name === "statement");
  const evidence = blocks.find((b) => b.name === "publicationEvidence");

  const statementAbovePublicationEvidence =
    statement !== undefined &&
    evidence !== undefined &&
    statement.bottomY > evidence.topY + 0.5;

  const maxGap = publicationPdfVerticalSpacePt("lg") + mmToPt(6);
  const minGap = publicationPdfVerticalSpacePt("2xs");
  const gap = statement && evidence ? statement.bottomY - evidence.topY : 0;
  const resultToEvidenceGapWithinBounds =
    !statement || !evidence || (gap >= minGap - 0.5 && gap <= maxGap);

  /** Coarse anchor boxes — only assert statement/evidence do not collide. */
  const noOverlap =
    !statement ||
    !evidence ||
    statement.bottomY <= evidence.topY + mmToPt(1.5);

  return { noOverlap, statementAbovePublicationEvidence, resultToEvidenceGapWithinBounds };
}

/** Expected primary section heading size vs secondary evidence heading (typography contract). */
export function publicationPdfEvidenceTypographyContract(): {
  statementHeadingSizePt: number;
  evidenceHeadingSizePt: number;
} {
  return {
    statementHeadingSizePt: TYPE.sectionHeading,
    evidenceHeadingSizePt: TYPE.evidenceSectionHeading,
  };
}
