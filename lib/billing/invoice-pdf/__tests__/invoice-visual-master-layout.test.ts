import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  CREATIVE_AREA_HEIGHT_MM,
  HEADER_LOGO_TOP_Y_MM,
  METADATA_LEFT_X_MM,
  METADATA_TOP_Y_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  planInvoiceBodyLayoutRegions,
  TABLE_SECTION_TOP_Y_MM,
  TITLE_TOP_Y_MM,
  footerBrandRowYFromTopMm,
} from "../invoice-design-geometry";
import {
  SPORTCLUBEVO_FOOTER_LOGO_PATH,
  SPORTCLUBEVO_HEADER_LOGO_PATH,
  TULIP_DIGITAL_LOGO_PATH,
} from "../constants";

function regionById(plan: ReturnType<typeof planInvoiceBodyLayoutRegions>, id: string) {
  const region = plan.regions.find((entry) => entry.id === id);
  expect(region, `missing region ${id}`).toBeDefined();
  return region!;
}

function regionsOverlap(a: { xMm: number; yMm: number; widthMm: number; heightMm: number }, b: {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}): boolean {
  return !(
    a.xMm + a.widthMm <= b.xMm ||
    b.xMm + b.widthMm <= a.xMm ||
    a.yMm + a.heightMm <= b.yMm ||
    b.yMm + b.heightMm <= a.yMm
  );
}

describe("invoice visual master layout (SWISS-01E4B)", () => {
  it("anchors title and metadata to PO master coordinates", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const title = regionById(plan, "title");
    const metadata = regionById(plan, "metadata_block");
    expect(title.yMm).toBeCloseTo(TITLE_TOP_Y_MM, 0);
    expect(metadata.xMm).toBeCloseTo(METADATA_LEFT_X_MM, 0);
    expect(metadata.yMm).toBeCloseTo(METADATA_TOP_Y_MM, 0);
    expect(regionsOverlap(title, metadata)).toBe(false);
  });

  it("keeps table below address blocks and above payment boundary", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const table = regionById(plan, "line_items_table");
    const recipient = regionById(plan, "recipient_block");
    const issuer = regionById(plan, "issuer_block");
    expect(table.yMm).toBeGreaterThanOrEqual(TABLE_SECTION_TOP_Y_MM - 0.01);
    expect(recipient.yMm + recipient.heightMm).toBeLessThanOrEqual(table.yMm + 0.5);
    expect(issuer.yMm + issuer.heightMm).toBeLessThanOrEqual(table.yMm + 0.5);
    expect(table.yMm + table.heightMm).toBeLessThan(PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM);
  });

  it("keeps lower branding and acknowledgement inside the 192 mm creative area", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const sce = regionById(plan, "operator_branding_sce");
    const tulip = regionById(plan, "operator_branding_tulip");
    const acknowledgement = regionById(plan, "acknowledgement");
    expect(sce.yMm + sce.heightMm).toBeLessThanOrEqual(CREATIVE_AREA_HEIGHT_MM + 0.01);
    expect(tulip.yMm + tulip.heightMm).toBeLessThanOrEqual(CREATIVE_AREA_HEIGHT_MM + 0.01);
    expect(acknowledgement.yMm + acknowledgement.heightMm).toBeLessThanOrEqual(
      footerBrandRowYFromTopMm(),
    );
  });

  it("uses real SportClubEvo header/footer assets and canonical Tulip path", () => {
    expect(existsSync(path.join(process.cwd(), SPORTCLUBEVO_HEADER_LOGO_PATH))).toBe(true);
    expect(existsSync(path.join(process.cwd(), SPORTCLUBEVO_FOOTER_LOGO_PATH))).toBe(true);
    expect(TULIP_DIGITAL_LOGO_PATH).toContain("Logo-730036c6-150f-4549-8e03-5ea1efb24084.png");
  });

  it("places header logo at approved top offset", () => {
    const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
    const logo = regionById(plan, "header_logo");
    expect(logo.yMm).toBe(HEADER_LOGO_TOP_Y_MM);
  });
});
