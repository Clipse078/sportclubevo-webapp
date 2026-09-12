import { describe, expect, it } from "vitest";
import { buildFixturePdfDocumentData } from "./invoice-pdf-fixtures";
import {
  assertAddressBaselinesReadable,
  minimumAddressBaselineStepMm,
} from "../invoice-address-layout";
import { gapBetweenInkMm, inkExtentsFromBaselineMm } from "../invoice-font-metrics";
import {
  ADDRESS_TO_TABLE_INK_GAP_MIN_MM,
  planInvoiceCreativeLayout,
} from "../invoice-creative-layout-planner";
import { generateInvoicePdfFromDocumentData } from "../generate-invoice-pdf";
import { PDFDocument } from "pdf-lib";
import { mmToPt } from "../mm";
import { A4_HEIGHT_MM } from "../constants";

describe("invoice address layout (SWISS-01F3)", () => {
  it("plans readable recipient and issuer baselines for fixture 2026-000002", () => {
    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    assertAddressBaselinesReadable(plan.addressLayout.recipient);
    assertAddressBaselinesReadable(plan.addressLayout.issuer);

    const recipient = plan.addressLayout.recipient;
    for (let index = 1; index < recipient.baselinesYMm.length; index++) {
      const delta =
        recipient.baselinesYMm[index]! - recipient.baselinesYMm[index - 1]!;
      expect(delta).toBeGreaterThanOrEqual(
        minimumAddressBaselineStepMm(recipient.fontSizePt) - 0.01,
      );
    }

    const issuer = plan.addressLayout.issuer;
    for (let index = 1; index < issuer.baselinesYMm.length; index++) {
      const delta = issuer.baselinesYMm[index]! - issuer.baselinesYMm[index - 1]!;
      expect(delta).toBeGreaterThanOrEqual(
        minimumAddressBaselineStepMm(issuer.fontSizePt) - 0.01,
      );
    }

    const uidBaseline = issuer.baselinesYMm[issuer.baselinesYMm.length - 2]!;
    const mwstBaseline = issuer.baselinesYMm[issuer.baselinesYMm.length - 1]!;
    const uidInk = inkExtentsFromBaselineMm(uidBaseline, issuer.fontSizePt);
    const mwstInk = inkExtentsFromBaselineMm(mwstBaseline, issuer.fontSizePt);
    expect(gapBetweenInkMm(uidInk.bottomYMm, mwstInk.topYMm)).toBeGreaterThanOrEqual(0.4);

    const table = plan.regions.find((entry) => entry.id === "line_items_table")!;
    expect(plan.addressLayout.sectionInkBottomYMm + ADDRESS_TO_TABLE_INK_GAP_MIN_MM - 0.01).toBeLessThanOrEqual(
      table.yMm,
    );
    expect(plan.gaps.addressesToTableMm).toBeGreaterThanOrEqual(ADDRESS_TO_TABLE_INK_GAP_MIN_MM - 0.01);
  });

  it("renders address baselines in descending PDF Y order without overlap", async () => {
    const { pdfBytes } = await generateInvoicePdfFromDocumentData(
      buildFixturePdfDocumentData(),
    );
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0]!;
    const pageHeightPt = page.getHeight();

    const plan = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
    const recipientBaselinesPdfY = plan.addressLayout.recipient.baselinesYMm.map((ym) =>
      pageHeightPt - mmToPt(ym),
    );
    const issuerBaselinesPdfY = plan.addressLayout.issuer.baselinesYMm.map((ym) =>
      pageHeightPt - mmToPt(ym),
    );

    for (let index = 1; index < recipientBaselinesPdfY.length; index++) {
      expect(recipientBaselinesPdfY[index]!).toBeLessThan(recipientBaselinesPdfY[index - 1]!);
    }
    for (let index = 1; index < issuerBaselinesPdfY.length; index++) {
      expect(issuerBaselinesPdfY[index]!).toBeLessThan(issuerBaselinesPdfY[index - 1]!);
    }

    expect(pdfDoc.getPageCount()).toBe(1);
    expect(page.getHeight()).toBeCloseTo(mmToPt(A4_HEIGHT_MM), 1);
  });
});
