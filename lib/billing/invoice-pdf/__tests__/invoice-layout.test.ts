import { describe, expect, it } from "vitest";
import {
  buildFixtureLine,
  buildFixturePdfDocumentData,
} from "./invoice-pdf-fixtures";
import {
  INVOICE_BODY_AREA_HEIGHT_MM,
  measureInvoiceContentHeightMm,
  shouldUseSinglePageWithPayment,
} from "../invoice-layout";
import { SWISS_PAYMENT_SECTION_HEIGHT_MM } from "../constants";
import { mmToPt } from "../mm";
import { getSwissPaymentSlipMetrics } from "../render-swiss-payment-slip";

describe("invoice PDF layout metrics", () => {
  it("reserves exactly 105 mm for the regulated payment section", () => {
    const metrics = getSwissPaymentSlipMetrics();
    expect(metrics.sectionHeightPt).toBeCloseTo(mmToPt(SWISS_PAYMENT_SECTION_HEIGHT_MM), 2);
    expect(metrics.receiptWidthPt + metrics.paymentPartWidthPt).toBeCloseTo(
      metrics.sectionWidthPt,
      1,
    );
  });

  it("fits standard one-line FCA invoice in the body area above payment slip", () => {
    const data = buildFixturePdfDocumentData();
    const contentMm = measureInvoiceContentHeightMm(data);
    expect(contentMm).toBeLessThanOrEqual(INVOICE_BODY_AREA_HEIGHT_MM);
    expect(shouldUseSinglePageWithPayment(data)).toBe(true);
  });

  it("requires continuation pages for many line items", () => {
    const lines = Array.from({ length: 12 }, (_, index) =>
      buildFixtureLine({ id: `l-${index}`, sortOrder: index }),
    );
    const data = buildFixturePdfDocumentData({ lines });
    expect(shouldUseSinglePageWithPayment(data)).toBe(false);
  });
});
