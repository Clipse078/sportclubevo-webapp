import {
  A4_HEIGHT_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "./constants";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import type { InvoiceLineRecord } from "../native-billing-commercial-types";
import { mmToPt } from "./mm";

/** Regulated Swiss QR zone (from bottom of page). */
export const PAYMENT_SECTION_BOTTOM_MM = 0;
export const PAYMENT_SECTION_TOP_MM = SWISS_PAYMENT_SECTION_HEIGHT_MM;

/** Invoice body sits above the payment section on combined layouts. */
export const INVOICE_BODY_AREA_HEIGHT_MM = A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM;

export const INVOICE_HEADER_HEIGHT_MM = 34;
export const INVOICE_SIDE_MARGIN_MM = 12;

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
  let heightMm = INVOICE_HEADER_HEIGHT_MM + 5;
  if (data.isVoid) {
    heightMm += 8;
  }
  heightMm += 30;
  heightMm += 4 + 27;
  heightMm += 5 + 7;
  for (const line of data.lines) {
    heightMm += measureLineRowMm(line);
  }
  heightMm += 4 + 19;
  heightMm += 9;
  return heightMm;
}

export function shouldUseSinglePageWithPayment(data: InvoicePdfDocumentData): boolean {
  if (!data.includeSwissPaymentSection) {
    return true;
  }
  return measureInvoiceContentHeightMm(data) <= INVOICE_BODY_AREA_HEIGHT_MM;
}

export function splitLineDescription(description: string): {
  primary: string;
  secondaryFromData: string | null;
} {
  const parts = description
    .split(/\n|(?:\s\|\s)/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { primary: description.trim(), secondaryFromData: null };
  }
  if (parts.length === 1) {
    return { primary: parts[0]!, secondaryFromData: null };
  }
  return {
    primary: parts[0]!,
    secondaryFromData: parts.slice(1).join(" | "),
  };
}
