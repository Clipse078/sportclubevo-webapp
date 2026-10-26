import { mmToPt } from "@/lib/billing/invoice-pdf/mm";

/**
 * Compact publication vertical rhythm — all statement/evidence gaps resolve through these tokens.
 * Values are in millimetres on the physical page.
 */
export const publicationPdfVerticalSpaceMm = {
  "2xs": 1.5,
  xs: 2.5,
  sm: 3.5,
  md: 5,
  lg: 7,
  xl: 10,
} as const;

export type PublicationPdfVerticalSpaceToken = keyof typeof publicationPdfVerticalSpaceMm;

export function publicationPdfVerticalSpacePt(token: PublicationPdfVerticalSpaceToken): number {
  return mmToPt(publicationPdfVerticalSpaceMm[token]);
}

/** Ordinary table row advance (label baseline to next row). */
export const PUBLICATION_PDF_STATEMENT_ROW_ADVANCE_MM = 5.5;

export function publicationPdfStatementRowAdvancePt(): number {
  return mmToPt(PUBLICATION_PDF_STATEMENT_ROW_ADVANCE_MM);
}

/** Readable wrap width for supporting provenance copy (~65–90 Latin chars at note size). */
export const PUBLICATION_PDF_IMMUTABILITY_NOTICE_MAX_WIDTH_MM = 118;

export function publicationPdfImmutabilityNoticeMaxWidthPt(): number {
  return mmToPt(PUBLICATION_PDF_IMMUTABILITY_NOTICE_MAX_WIDTH_MM);
}
