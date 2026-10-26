import type {
  PublicationPdfRecordedTextDraw,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";

export type PublicationPdfTextBoundingBox = {
  blockId: string;
  pageIndex: number;
  left: number;
  right: number;
  topY: number;
  bottomY: number;
  text: string;
};

export function publicationPdfTextDrawToBoundingBox(
  draw: PublicationPdfRecordedTextDraw,
): PublicationPdfTextBoundingBox {
  return {
    blockId: draw.blockId,
    pageIndex: draw.pageIndex,
    left: draw.x,
    right: draw.x + draw.width,
    topY: draw.topY,
    bottomY: draw.bottomY,
    text: draw.text,
  };
}

function boxesIntersect(a: PublicationPdfTextBoundingBox, b: PublicationPdfTextBoundingBox): boolean {
  if (a.pageIndex !== b.pageIndex) return false;
  const gapPt = 0.35;
  const separatedHorizontally = a.right <= b.left - gapPt || b.right <= a.left - gapPt;
  if (separatedHorizontally) return false;
  const separatedVertically = a.bottomY >= b.topY + gapPt || b.bottomY >= a.topY + gapPt;
  return !separatedVertically;
}

/** True when `lower` sits visually below `upper` with a positive gap (pdf-lib Y). */
export function publicationPdfVerticalGapPt(
  upper: PublicationPdfTextBoundingBox,
  lower: PublicationPdfTextBoundingBox,
): number {
  return upper.bottomY - lower.topY;
}

export type PublicationPdfSequentialBlockCollisionOptions = {
  /** Same baseline table columns — skip pairs that share a blockId prefix pattern. */
  allowSameBlockPrefix?: string[];
  /** Pairs of blockId prefixes allowed to share horizontal space (e.g. table row amounts). */
  horizontalTableBlockIds?: string[];
};

export function assertPublicationPdfNoSequentialBlockTextCollisions(
  draws: PublicationPdfRecordedTextDraw[],
  options: PublicationPdfSequentialBlockCollisionOptions = {},
): { ok: true } | { ok: false; a: PublicationPdfTextBoundingBox; b: PublicationPdfTextBoundingBox } {
  const boxes = draws.map(publicationPdfTextDrawToBoundingBox);
  const tableIds = new Set(options.horizontalTableBlockIds ?? ["statement.row"]);

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (a.blockId === b.blockId) continue;
      if (tableIds.has(a.blockId) && tableIds.has(b.blockId)) continue;
      if (a.blockId.startsWith("statement.row") && b.blockId.startsWith("statement.row")) continue;
      if (boxesIntersect(a, b)) {
        return { ok: false, a, b };
      }
    }
  }
  return { ok: true };
}

export function assertPublicationPdfEvidenceMetadataOrdering(
  draws: PublicationPdfRecordedTextDraw[],
): {
  ok: boolean;
  gaps: {
    headingToVersion: number | null;
    versionToPdfCreated: number | null;
    pdfCreatedToNotice: number | null;
  };
} {
  const byBlock = (id: string) =>
    draws.filter((d) => d.blockId === id).map(publicationPdfTextDrawToBoundingBox);

  const heading = byBlock("publicationEvidence.heading")[0];
  const version = byBlock("publicationEvidence.versionLine")[0];
  const pdfCreated = byBlock("publicationEvidence.pdfCreatedLine")[0];
  const noticeLines = byBlock("publicationEvidence.immutabilityNotice");

  const gaps = {
    headingToVersion: heading && version ? publicationPdfVerticalGapPt(heading, version) : null,
    versionToPdfCreated:
      version && pdfCreated ? publicationPdfVerticalGapPt(version, pdfCreated) : null,
    pdfCreatedToNotice:
      pdfCreated && noticeLines[0]
        ? publicationPdfVerticalGapPt(pdfCreated, noticeLines[0]!)
        : null,
  };

  const ok =
    (gaps.headingToVersion === null || gaps.headingToVersion > 0.25) &&
    (gaps.versionToPdfCreated === null || gaps.versionToPdfCreated > 0.25) &&
    (gaps.pdfCreatedToNotice === null || gaps.pdfCreatedToNotice > 0.25);

  return { ok, gaps };
}

export function assertPublicationPdfWrappedLinesDoNotOverlap(
  draws: PublicationPdfRecordedTextDraw[],
  blockId: string,
): boolean {
  const lines = draws
    .filter((d) => d.blockId === blockId)
    .map(publicationPdfTextDrawToBoundingBox)
    .sort((a, b) => b.topY - a.topY);
  for (let i = 1; i < lines.length; i += 1) {
    const above = lines[i - 1]!;
    const below = lines[i]!;
    if (publicationPdfVerticalGapPt(above, below) <= 0.25) return false;
  }
  return true;
}
