import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  computeOperatorBrandRowLayoutMm,
  FOOTER_BRAND_ROW_BOTTOM_Y_MM,
  MIN_PAYMENT_BREATHING_ROOM_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  planInvoiceBodyLayoutRegions,
} from "../invoice-design-geometry";
import {
  computeTulipVisibleDrawSizeMm,
  readTulipVisibleContentBoundsPx,
  TULIP_VISIBLE_MAX_WIDTH_MM,
  TULIP_VISIBLE_MIN_WIDTH_MM,
  TULIP_VISIBLE_TARGET_WIDTH_MM,
  tulipVisiblePaddingDetected,
} from "../tulip-logo-visible-bounds";
import { TULIP_DIGITAL_LOGO_PATH } from "../constants";

describe("Tulip footer visible-content sizing (SWISS-01E4C2)", () => {
  it("detects meaningful artwork bounds inside the square PNG canvas", () => {
    const bounds = readTulipVisibleContentBoundsPx();
    expect(bounds.sourceWidthPx).toBe(1024);
    expect(bounds.sourceHeightPx).toBe(1024);
    expect(bounds.contentWidthPx).toBeGreaterThan(400);
    expect(bounds.contentHeightPx).toBeGreaterThan(200);
    expect(tulipVisiblePaddingDetected(bounds)).toBe(true);
  });

  it("targets PO visible width band and preserves content aspect ratio", () => {
    const draw = computeTulipVisibleDrawSizeMm();
    expect(draw.visibleWidthMm).toBe(TULIP_VISIBLE_TARGET_WIDTH_MM);
    expect(draw.visibleWidthMm).toBeGreaterThanOrEqual(TULIP_VISIBLE_MIN_WIDTH_MM);
    expect(draw.visibleWidthMm).toBeLessThanOrEqual(TULIP_VISIBLE_MAX_WIDTH_MM);
    const bounds = readTulipVisibleContentBoundsPx();
    expect(draw.contentAspectRatio).toBeCloseTo(
      bounds.contentWidthPx / bounds.contentHeightPx,
      5,
    );
  });

  it("keeps enlarged brand row above payment boundary with ≥8 mm breathing room", () => {
    const row = computeOperatorBrandRowLayoutMm();
    expect(row.rowBottomYMm).toBe(FOOTER_BRAND_ROW_BOTTOM_Y_MM);
    expect(row.rowBottomYMm).toBeLessThanOrEqual(
      PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - MIN_PAYMENT_BREATHING_ROOM_MM + 0.01,
    );
    expect(
      PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - row.rowBottomYMm,
    ).toBeGreaterThanOrEqual(MIN_PAYMENT_BREATHING_ROOM_MM);

    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const tulip = plan.regions.find((entry) => entry.id === "operator_branding_tulip");
    expect(tulip?.widthMm).toBeCloseTo(TULIP_VISIBLE_TARGET_WIDTH_MM, 1);
    expect(tulip?.heightMm).toBeCloseTo(computeTulipVisibleDrawSizeMm().visibleHeightMm, 1);
  });

  it("uses canonical Tulip asset path", () => {
    expect(TULIP_DIGITAL_LOGO_PATH).toBe(
      "public/images/branding/Logo-730036c6-150f-4549-8e03-5ea1efb24084.png",
    );
  });
});
