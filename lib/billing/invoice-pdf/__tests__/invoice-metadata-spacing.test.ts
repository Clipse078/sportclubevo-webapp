import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  METADATA_INTER_GROUP_INK_GAP_MM,
  METADATA_INTRA_GROUP_INK_GAP_MM,
  METADATA_TO_ADDRESS_INK_GAP_MM,
  planInvoiceCreativeLayout,
} from "../invoice-creative-layout-planner";

describe("invoice metadata spacing (SWISS-01E4C3)", () => {
  it("uses measured ink gaps within editorial targets", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    for (const group of plan.metadataGroups) {
      expect(group.labelToValueGapMm).toBeGreaterThanOrEqual(3);
      expect(group.labelToValueGapMm).toBeLessThanOrEqual(4.5);
      if (group.valueToNextLabelGapMm != null) {
        expect(group.valueToNextLabelGapMm).toBeGreaterThanOrEqual(3);
        expect(group.valueToNextLabelGapMm).toBeLessThanOrEqual(4.5);
      }
    }
  });

  it("separates metadata from addresses by at least 6 mm", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    expect(plan.gaps.metadataToAddressesMm).toBeGreaterThanOrEqual(6);
  });
});
