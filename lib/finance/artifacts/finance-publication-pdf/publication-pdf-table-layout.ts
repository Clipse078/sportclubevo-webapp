import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { A4_WIDTH_MM } from "@/lib/billing/invoice-pdf/constants";

export type PublicationPdfAmountColumnRights = {
  budget: number;
  actual: number;
  forecast: number;
  variance: number;
};

const DEFAULT_MARGIN_X_MM = 18;

/** Fixed right edges for numeric columns — stable vertical scan lines. */
export function computePublicationPdfAmountColumnRights(input?: {
  pageWidthPt?: number;
  marginXPt?: number;
}): PublicationPdfAmountColumnRights {
  const pageWidth = input?.pageWidthPt ?? mmToPt(A4_WIDTH_MM);
  const marginX = input?.marginXPt ?? mmToPt(DEFAULT_MARGIN_X_MM);
  const right = pageWidth - marginX;
  return {
    budget: right - mmToPt(84),
    actual: right - mmToPt(60),
    forecast: right - mmToPt(36),
    variance: right,
  };
}

export function publicationPdfAmountColumnRightsMonotonic(cols: PublicationPdfAmountColumnRights): boolean {
  return cols.budget < cols.actual && cols.actual < cols.forecast && cols.forecast <= cols.variance;
}
