import { SWISS_PAYMENT_SECTION_HEIGHT_MM } from "./constants";
import {
  INVOICE_BODY_AREA_HEIGHT_MM,
  planInvoiceBodyLayoutRegions,
} from "./invoice-design-geometry";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import type { InvoiceLineRecord } from "../native-billing-commercial-types";
import { mmToPt } from "./mm";

export {
  INVOICE_BODY_AREA_HEIGHT_MM,
  INVOICE_HEADER_HEIGHT_MM,
  INVOICE_SIDE_MARGIN_MM,
} from "./invoice-design-geometry";

/** Regulated Swiss QR zone (from bottom of page). */
export const PAYMENT_SECTION_BOTTOM_MM = 0;
export const PAYMENT_SECTION_TOP_MM = SWISS_PAYMENT_SECTION_HEIGHT_MM;

export function paymentSectionTopPt(): number {
  return mmToPt(PAYMENT_SECTION_TOP_MM);
}

function measureLineRowMm(line: InvoiceLineRecord): number {
  const parts = line.description
    .split(/\n|(?:\s\|\s)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? 11 : 9;
}

/** Deterministic content height estimate (must stay ≤ body area for one-page layout). */
export function measureInvoiceContentHeightMm(data: InvoicePdfDocumentData): number {
  const plan = planInvoiceBodyLayoutRegions(data);
  return Math.max(...plan.regions.map((region) => region.yMm + region.heightMm));
}

export function shouldUseSinglePageWithPayment(data: InvoicePdfDocumentData): boolean {
  if (!data.includeSwissPaymentSection) {
    return true;
  }
  return measureInvoiceContentHeightMm(data) <= INVOICE_BODY_AREA_HEIGHT_MM;
}

export { splitLineDescription } from "./invoice-design-geometry";
