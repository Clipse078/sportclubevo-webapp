import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  assertCreativeLayoutNoCollisions,
  METADATA_INTER_GROUP_INK_GAP_MM,
  METADATA_INTRA_GROUP_INK_GAP_MIN_MM,
  METADATA_INTRA_GROUP_INK_GAP_MM,
  METADATA_TO_ADDRESS_INK_GAP_MM,
  ADDRESS_TO_TABLE_INK_GAP_MIN_MM,
  TABLE_TO_TOTALS_INK_GAP_MM,
  THANKYOU_TO_BRAND_INK_GAP_MM,
  measureTotalsGrossTextBaselineYm,
  planInvoiceCreativeLayout,
  THANKYOU_TEXT_BASELINE_OFFSET_FROM_BAR_TOP_MM,
} from "../invoice-creative-layout-planner";
import {
  MIN_PAYMENT_BREATHING_ROOM_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
} from "../invoice-design-geometry";

function region(plan: ReturnType<typeof planInvoiceCreativeLayout>, id: string) {
  const entry = plan.regions.find((r) => r.id === id);
  expect(entry, id).toBeDefined();
  return entry!;
}

describe("invoice creative layout collisions (SWISS-01E4C3)", () => {
  it("plans non-overlapping regions for fixture 2026-000002", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    expect(() => assertCreativeLayoutNoCollisions(plan)).not.toThrow();
  });

  it("enforces minimum gaps between major regions", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    expect(plan.gaps.metadataToAddressesMm).toBeGreaterThanOrEqual(6);
    expect(plan.gaps.addressesToTableMm).toBeGreaterThanOrEqual(ADDRESS_TO_TABLE_INK_GAP_MIN_MM - 0.01);
    expect(plan.gaps.tableToTotalsMm).toBeGreaterThanOrEqual(TABLE_TO_TOTALS_INK_GAP_MM - 0.5);
    expect(plan.gaps.thankYouToBrandMm).toBeGreaterThanOrEqual(THANKYOU_TO_BRAND_INK_GAP_MM - 0.5);
    expect(plan.gaps.brandToSixMm).toBeGreaterThanOrEqual(MIN_PAYMENT_BREATHING_ROOM_MM);
  });

  it("keeps issuer and recipient above the table", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    const table = region(plan, "line_items_table");
    expect(plan.addressLayout.sectionInkBottomYMm + ADDRESS_TO_TABLE_INK_GAP_MIN_MM - 0.01).toBeLessThanOrEqual(
      table.yMm,
    );
  });

  it("keeps metadata groups separated by ink gaps", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    for (const group of plan.metadataGroups) {
      expect(group.labelToValueGapMm).toBeGreaterThanOrEqual(METADATA_INTRA_GROUP_INK_GAP_MIN_MM - 0.01);
      if (group.valueToNextLabelGapMm != null) {
        expect(group.valueToNextLabelGapMm).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("keeps brand row above SIX boundary", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    const brand = region(plan, "operator_brand_row");
    expect(brand.bottomYMm).toBeLessThanOrEqual(
      PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - MIN_PAYMENT_BREATHING_ROOM_MM + 0.01,
    );
  });

  it("aligns thank-you with Total brutto band on fixture 2026-000002 (SWISS-01F4)", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    const totals = region(plan, "totals_block");
    const thank = region(plan, "acknowledgement");
    const brand = region(plan, "operator_brand_row");

    const grossTextBaselineYm = measureTotalsGrossTextBaselineYm(totals.yMm);
    const thankTextBaselineYm = thank.yMm + THANKYOU_TEXT_BASELINE_OFFSET_FROM_BAR_TOP_MM;
    expect(thankTextBaselineYm).toBeCloseTo(grossTextBaselineYm, 2);

    expect(thank.yMm).toBeGreaterThanOrEqual(totals.yMm - 0.01);
    expect(thank.bottomYMm).toBeLessThanOrEqual(totals.bottomYMm + 0.01);
    expect(plan.gaps.thankYouToBrandMm).toBeGreaterThanOrEqual(THANKYOU_TO_BRAND_INK_GAP_MM - 0.5);
    expect(brand.yMm - thank.bottomYMm).toBeGreaterThanOrEqual(THANKYOU_TO_BRAND_INK_GAP_MM - 0.5);
  });
});
