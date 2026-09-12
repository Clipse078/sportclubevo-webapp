import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  computeOperatorBrandRowLayoutMm,
  FOOTER_SCE_LOGO_HEIGHT_MM,
  MIN_PAYMENT_BREATHING_ROOM_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  planInvoiceBodyLayoutRegions,
} from "../invoice-design-geometry";
import {
  computeTulipVisibleDrawSizeMm,
  readTulipVisibleContentBoundsPx,
  TULIP_VISIBLE_MAX_HEIGHT_MM,
  TULIP_VISIBLE_MIN_HEIGHT_MM,
  TULIP_VISIBLE_TARGET_HEIGHT_MM,
  tulipVisiblePaddingDetected,
} from "../tulip-logo-visible-bounds";
import { TULIP_DIGITAL_LOGO_PATH } from "../constants";

describe("Tulip footer visible-content sizing (SWISS-01E4C3)", () => {
  it("detects meaningful artwork bounds inside the square PNG canvas", () => {
    const bounds = readTulipVisibleContentBoundsPx();
    expect(bounds.sourceWidthPx).toBe(1024);
    expect(bounds.contentWidthPx).toBe(542);
    expect(bounds.contentHeightPx).toBe(286);
    expect(tulipVisiblePaddingDetected(bounds)).toBe(true);
  });

  it("targets PO visible height band and preserves content aspect ratio", () => {
    const draw = computeTulipVisibleDrawSizeMm();
    expect(draw.visibleHeightMm).toBe(TULIP_VISIBLE_TARGET_HEIGHT_MM);
    expect(draw.visibleHeightMm).toBeGreaterThanOrEqual(TULIP_VISIBLE_MIN_HEIGHT_MM);
    expect(draw.visibleHeightMm).toBeLessThanOrEqual(TULIP_VISIBLE_MAX_HEIGHT_MM);
    const bounds = readTulipVisibleContentBoundsPx();
    expect(draw.visibleWidthMm / draw.visibleHeightMm).toBeCloseTo(
      bounds.contentWidthPx / bounds.contentHeightPx,
      5,
    );
  });

  it("keeps brand row near SCE optical height with ≥8 mm SIX breathing room", () => {
    const row = computeOperatorBrandRowLayoutMm();
    expect(Math.abs(row.tulipVisibleHeightMm - FOOTER_SCE_LOGO_HEIGHT_MM)).toBeLessThanOrEqual(0.5);
    expect(
      PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - row.rowBottomYMm,
    ).toBeGreaterThanOrEqual(MIN_PAYMENT_BREATHING_ROOM_MM);

    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const tulip = plan.regions.find((entry) => entry.id === "operator_branding_tulip");
    expect(tulip?.heightMm).toBeCloseTo(TULIP_VISIBLE_TARGET_HEIGHT_MM, 2);
  });

  it("uses canonical Tulip asset path", () => {
    expect(TULIP_DIGITAL_LOGO_PATH).toBe(
      "public/images/branding/Logo-730036c6-150f-4549-8e03-5ea1efb24084.png",
    );
  });
});
