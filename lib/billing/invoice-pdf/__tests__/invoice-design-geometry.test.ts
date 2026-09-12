import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  CREATIVE_AREA_HEIGHT_MM,
  CREATIVE_AREA_WIDTH_MM,
  HEADER_HEIGHT_MM,
  PAGE_MARGIN_X_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  planInvoiceBodyLayoutRegions,
} from "../invoice-design-geometry";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "../constants";

describe("invoice design geometry (SWISS-01E4C)", () => {
  it("defines A4 page and 210×192 mm creative canvas above 105 mm payment zone", () => {
    expect(CREATIVE_AREA_WIDTH_MM).toBe(A4_WIDTH_MM);
    expect(CREATIVE_AREA_HEIGHT_MM).toBe(A4_HEIGHT_MM - SWISS_PAYMENT_SECTION_HEIGHT_MM);
    expect(PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM).toBe(CREATIVE_AREA_HEIGHT_MM);
    expect(CREATIVE_AREA_HEIGHT_MM).toBe(192);
  });

  it("plans regions inside the creative area for the standard fixture", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    expect(plan.creativeArea.heightMm).toBe(192);
    expect(plan.paymentSection.yMm).toBe(192);
    expect(plan.paymentSection.heightMm).toBe(105);

    for (const region of plan.regions) {
      if (
        region.id === "operator_branding_tulip" ||
        region.id === "operator_branding_sce" ||
        region.id === "website_url" ||
        region.id === "acknowledgement"
      ) {
        expect(region.yMm + region.heightMm).toBeLessThanOrEqual(CREATIVE_AREA_HEIGHT_MM + 2);
        continue;
      }
      expect(region.yMm + region.heightMm).toBeLessThanOrEqual(CREATIVE_AREA_HEIGHT_MM + 0.01);
    }
  });

  it("exposes compact header and margin tokens", () => {
    expect(HEADER_HEIGHT_MM).toBe(21);
    expect(PAGE_MARGIN_X_MM).toBe(14);
  });
});
