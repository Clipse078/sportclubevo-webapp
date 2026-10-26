import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import type {
  PublicationPdfRecordedDraw,
  PublicationPdfRecordedRectDraw,
  PublicationPdfRecordedTextDraw,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";
import { publicationPdfTextInkBoundsFromBaseline } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";
import {
  PUBLICATION_PDF_TABLE_HEADER_BAND_HEIGHT_MM,
  PUBLICATION_PDF_TABLE_HEADER_BAND_BOTTOM_OFFSET_MM,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-header-layout";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";

/**
 * Synthetic draw log reproducing R5R3 header → first row geometry (937c89a3):
 * first row baseline derived from anchor − 7.5 mm, ignoring row font cap vs band bottom.
 */
export function buildPublicationPdfR5R3DefectiveTableHeaderDraws(input?: {
  anchorY?: number;
}): PublicationPdfRecordedDraw[] {
  const anchorY = input?.anchorY ?? 520;
  const bandBottomY = anchorY - mmToPt(PUBLICATION_PDF_TABLE_HEADER_BAND_BOTTOM_OFFSET_MM);
  const bandHeightPt = mmToPt(PUBLICATION_PDF_TABLE_HEADER_BAND_HEIGHT_MM);
  const headerBaselineY = anchorY - mmToPt(3.5);
  const firstRowBaselineY = anchorY - mmToPt(7.5);

  const rect: PublicationPdfRecordedRectDraw = {
    kind: "rect",
    blockId: "statement.tableHeader",
    pageIndex: 0,
    x: mmToPt(18),
    y: bandBottomY,
    width: mmToPt(174),
    height: bandHeightPt,
  };

  const pushText = (
    blockId: string,
    text: string,
    baselineY: number,
    fontSize: number,
  ): PublicationPdfRecordedTextDraw => {
    const { topY, bottomY } = publicationPdfTextInkBoundsFromBaseline(baselineY, fontSize);
    return {
      kind: "text",
      blockId,
      pageIndex: 0,
      x: mmToPt(19),
      y: baselineY,
      width: mmToPt(40),
      topY,
      bottomY,
      text,
      fontSize,
      lineHeight: fontSize + 2,
    };
  };

  return [
    rect,
    pushText("statement.tableHeader", "Position", headerBaselineY, TYPE.tableHeader),
    pushText("statement.row", "Mitgliedsbeiträge", firstRowBaselineY, TYPE.tableRow),
  ];
}
