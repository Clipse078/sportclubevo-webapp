import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  CREATIVE_AREA_HEIGHT_MM,
  HEADER_ARTWORK_DRAW_X_MM,
  HEADER_ARTWORK_DRAW_WIDTH_MM,
  HEADER_HEIGHT_MM,
  HEADER_LOGO_WIDTH_MM,
  FOOTER_SCE_LOGO_HEIGHT_MM,
  MIN_PAYMENT_BREATHING_ROOM_MM,
  PAGE_MARGIN_X_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  computeOperatorBrandRowLayoutMm,
  planInvoiceBodyLayoutRegions,
  paymentBreathingRoomMm,
  TITLE_TOP_Y_MM,
} from "../invoice-design-geometry";
import { TULIP_VISIBLE_TARGET_WIDTH_MM } from "../tulip-logo-visible-bounds";
import { INVOICE_HEADER_JPG_PATH } from "../constants";

function regionById(plan: ReturnType<typeof planInvoiceBodyLayoutRegions>, id: string) {
  const region = plan.regions.find((entry) => entry.id === id);
  expect(region, `missing region ${id}`).toBeDefined();
  return region!;
}

describe("invoice visual master layout (SWISS-01E4C)", () => {
  it("uses compact 21 mm header and 14 mm body margins", () => {
    expect(HEADER_HEIGHT_MM).toBe(21);
    expect(PAGE_MARGIN_X_MM).toBe(14);
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    expect(regionById(plan, "header_bar").heightMm).toBe(21);
  });

  it("places header artwork on the far-right only", () => {
    const artwork = regionById(planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData()), "header_jpg_artwork");
    expect(artwork.xMm).toBeCloseTo(HEADER_ARTWORK_DRAW_X_MM, 0);
    expect(artwork.widthMm).toBeCloseTo(HEADER_ARTWORK_DRAW_WIDTH_MM, 0);
    expect(artwork.heightMm).toBeCloseTo(HEADER_HEIGHT_MM, 0);
  });

  it("keeps operator branding above payment boundary with breathing room", () => {
    const data = buildFixturePdfDocumentData();
    const plan = planInvoiceBodyLayoutRegions(data);
    const brandRow = computeOperatorBrandRowLayoutMm();
    const sce = regionById(plan, "operator_branding_sce");
    expect(sce.yMm + sce.heightMm).toBeCloseTo(brandRow.rowBottomYMm, 1);
    expect(brandRow.rowBottomYMm).toBeLessThan(PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM);
    expect(paymentBreathingRoomMm(data)).toBeGreaterThanOrEqual(MIN_PAYMENT_BREATHING_ROOM_MM);
  });

  it("keeps title below compact header", () => {
    const title = regionById(planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData()), "title");
    expect(title.yMm).toBeGreaterThanOrEqual(HEADER_HEIGHT_MM + 8);
    expect(title.yMm).toBeCloseTo(TITLE_TOP_Y_MM, 0);
  });

  it("uses visible-content Tulip width target in operator row", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const tulip = regionById(plan, "operator_branding_tulip");
    expect(tulip.widthMm).toBeCloseTo(TULIP_VISIBLE_TARGET_WIDTH_MM, 0);
    expect(tulip.heightMm).toBeGreaterThan(FOOTER_SCE_LOGO_HEIGHT_MM);
  });

  it("requires genuine invoice.jpg at canonical repo path", () => {
    const absolute = path.join(process.cwd(), INVOICE_HEADER_JPG_PATH);
    expect(existsSync(absolute)).toBe(true);
  });

  it("uses width-led SCE header logo target", () => {
    const logo = regionById(planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData()), "header_logo");
    expect(logo.widthMm).toBeCloseTo(HEADER_LOGO_WIDTH_MM, 0);
    expect(logo.yMm + logo.heightMm).toBeLessThanOrEqual(HEADER_HEIGHT_MM + 0.01);
  });

  it("keeps all planned regions inside the 192 mm creative canvas", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    for (const region of plan.regions) {
      expect(region.yMm + region.heightMm).toBeLessThanOrEqual(CREATIVE_AREA_HEIGHT_MM + 0.01);
    }
  });
});
