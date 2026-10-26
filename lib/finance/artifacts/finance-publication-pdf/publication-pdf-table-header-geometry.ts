import type {
  PublicationPdfRecordedDraw,
  PublicationPdfRecordedRectDraw,
  PublicationPdfRecordedTextDraw,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";
import { TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-header-layout";

export type PublicationPdfTableHeaderSectionGeometry = {
  band: PublicationPdfRecordedRectDraw;
  headerTexts: PublicationPdfRecordedTextDraw[];
  firstRowTexts: PublicationPdfRecordedTextDraw[];
  firstRowTopY: number;
  visualGapPt: number;
};

function isTableHeaderRect(op: PublicationPdfRecordedDraw): op is PublicationPdfRecordedRectDraw {
  return op.kind === "rect" && op.blockId === "statement.tableHeader";
}

function headerBandTopY(band: PublicationPdfRecordedRectDraw): number {
  return band.y + band.height;
}

function headerBandBottomY(band: PublicationPdfRecordedRectDraw): number {
  return band.y;
}

export function publicationPdfTableHeaderSectionsFromDraws(
  operations: PublicationPdfRecordedDraw[],
): PublicationPdfTableHeaderSectionGeometry[] {
  const bands = operations.filter(isTableHeaderRect);
  const texts = operations.filter((op): op is PublicationPdfRecordedTextDraw => op.kind === "text");

  return bands.map((band, index) => {
    const bandBottom = band.y;
    const bandTop = headerBandTopY(band);
    const headerTexts = texts.filter(
      (t) => t.blockId === "statement.tableHeader" && t.y <= bandTop && t.y >= bandBottom - 1,
    );
    const nextBandBottom = index + 1 < bands.length ? bands[index + 1]!.y : 0;
    const firstRowCandidates = texts.filter(
      (t) =>
        t.blockId === "statement.row" &&
        t.y < bandBottom - 0.25 &&
        t.y > nextBandBottom + 0.25,
    );
    const firstRow =
      firstRowCandidates.length > 0
        ? firstRowCandidates.reduce((best, t) => (t.y > best.y ? t : best))
        : null;
    const firstRowTexts = firstRow ? [firstRow] : [];
    const firstRowTopY = firstRow ? firstRow.topY : Number.NaN;
    const visualGapPt = Number.isFinite(firstRowTopY) ? bandBottom - firstRowTopY : Number.NaN;

    return {
      band,
      headerTexts,
      firstRowTexts,
      firstRowTopY,
      visualGapPt,
    };
  });
}

export function assertPublicationPdfHeaderTextContainedInBand(
  band: PublicationPdfRecordedRectDraw,
  headerText: PublicationPdfRecordedTextDraw,
): boolean {
  const bandTop = headerBandTopY(band);
  const bandBottom = headerBandBottomY(band);
  return headerText.topY <= bandTop + 0.35 && headerText.bottomY >= bandBottom - 0.35;
}

/** First row ink must sit below the grey band with a positive visual gap (pdf-lib Y). */
export function assertPublicationPdfTableHeaderToFirstRowGap(
  band: PublicationPdfRecordedRectDraw,
  firstRowTopY: number,
  minGapPt: number = TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT,
): boolean {
  const bandBottom = headerBandBottomY(band);
  return bandBottom - firstRowTopY >= minGapPt - 0.05;
}

export function assertPublicationPdfAllTableHeaderSectionsClearFirstRow(
  operations: PublicationPdfRecordedDraw[],
): { ok: true } | { ok: false; sectionIndex: number; visualGapPt: number } {
  const sections = publicationPdfTableHeaderSectionsFromDraws(operations);
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i]!;
    if (!Number.isFinite(section.visualGapPt)) {
      return { ok: false, sectionIndex: i, visualGapPt: section.visualGapPt };
    }
    if (
      !assertPublicationPdfTableHeaderToFirstRowGap(section.band, section.firstRowTopY)
    ) {
      return { ok: false, sectionIndex: i, visualGapPt: section.visualGapPt };
    }
    for (const headerText of section.headerTexts) {
      if (!assertPublicationPdfHeaderTextContainedInBand(section.band, headerText)) {
        return { ok: false, sectionIndex: i, visualGapPt: section.visualGapPt };
      }
    }
  }
  return { ok: true };
}
