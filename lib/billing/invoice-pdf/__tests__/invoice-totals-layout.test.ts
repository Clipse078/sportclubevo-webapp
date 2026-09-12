import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TULIP_DIGITAL_LOGO_PATH } from "../constants";
import {
  minimumVatToGrossSeparationMm,
  TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM,
  TOTALS_VAT_TO_GROSS_GAP_MM,
} from "../invoice-totals-layout";

describe("invoice totals layout", () => {
  it("keeps minimum separation between VAT row and gross highlight", () => {
    expect(minimumVatToGrossSeparationMm()).toBeGreaterThanOrEqual(6);
    expect(TOTALS_VAT_TO_GROSS_GAP_MM).toBeGreaterThanOrEqual(5);
    expect(TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM).toBeGreaterThanOrEqual(7);
  });
});

describe("Tulip Digital branding asset", () => {
  it("requires genuine PO Tulip logo at canonical path", () => {
    const absolute = path.join(process.cwd(), TULIP_DIGITAL_LOGO_PATH);
    expect(existsSync(absolute)).toBe(true);
  });
});
