import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/billing/invoice-pdf/constants";
import { mmToPt } from "@/lib/billing/invoice-pdf/mm";

export const PUBLICATION_PDF_PAGE_WIDTH_PT = mmToPt(A4_WIDTH_MM);
export const PUBLICATION_PDF_PAGE_HEIGHT_PT = mmToPt(A4_HEIGHT_MM);
export const PUBLICATION_PDF_MARGIN_BOTTOM_PT = mmToPt(18);
export const PUBLICATION_PDF_FOOTER_BLOCK_HEIGHT_PT = mmToPt(11);
export const PUBLICATION_PDF_FOOTER_CLEARANCE_PT = mmToPt(5);

/** Lowest Y allowed for normal flow content (footer reserve starts below). */
export function publicationPdfContentBottomYPt(): number {
  return (
    PUBLICATION_PDF_MARGIN_BOTTOM_PT +
    PUBLICATION_PDF_FOOTER_BLOCK_HEIGHT_PT +
    PUBLICATION_PDF_FOOTER_CLEARANCE_PT
  );
}
