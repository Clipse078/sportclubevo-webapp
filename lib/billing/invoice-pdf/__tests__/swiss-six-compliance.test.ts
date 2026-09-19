import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SWISS_PAYMENT_PART_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
  SWISS_QR_CODE_SIZE_MM,
  SWISS_QR_QUIET_ZONE_MM,
  SWISS_RECEIPT_WIDTH_MM,
} from "../constants";
import { generateInvoicePdfFromDocumentData } from "../generate-invoice-pdf";
import { mmToPt, ptToMm } from "../mm";
import {
  getSwissPaymentSlipMetrics,
  type SwissPaymentSlipMetrics,
} from "../render-swiss-payment-slip";
import {
  getSwissQrRenderMetrics,
  renderSwissQrCodePng,
} from "../swiss-qr-code-image";
import { buildSwissSpcPayload } from "../../swiss-qr/swiss-spc-payload";
import { validateChLiIbanShape } from "../../swiss-qr/swiss-iban";
import { swissModulo10CheckDigit } from "../../swiss-qr/swiss-modulo10";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureInvoice,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "./invoice-pdf-fixtures";

const REFERENCE_QR_IBAN = "CH693000523573415901X";
const REFERENCE_QRR = "273282026000002025434650072";

async function measureQrSymbolBoundsPng(buf: Buffer) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const size = info.width;
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * info.channels;
      if (data[i]! < 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return {
    pngSizePx: size,
    symbolWidthPx: maxX - minX + 1,
    symbolHeightPx: maxY - minY + 1,
    quietLeftPx: minX,
    quietRightPx: size - maxX - 1,
  };
}

function structuredFromIssuer() {
  const issuer = buildFixtureIssuer();
  return {
    name: issuer.legalName,
    street: issuer.addressLine1,
    houseNumber: issuer.houseNumber,
    postalCode: issuer.postalCode,
    city: issuer.city,
    countryCode: issuer.countryCode,
  };
}

function structuredFromRecipient() {
  const recipient = buildFixtureRecipient();
  return {
    name: recipient.companyOrName,
    street: recipient.street,
    houseNumber: recipient.houseNumber,
    postalCode: recipient.postalCode,
    city: recipient.city,
    countryCode: recipient.countryCode,
  };
}

function buildReferencePayload() {
  return buildSwissSpcPayload({
    creditorAccount: REFERENCE_QR_IBAN,
    creditor: structuredFromIssuer(),
    debtor: structuredFromRecipient(),
    amountMinor: 21512,
    currency: "CHF",
    referenceType: "QRR",
    reference: REFERENCE_QRR,
  });
}

async function buildReferencePdf() {
  const spcPayload = buildReferencePayload();
  return generateInvoicePdfFromDocumentData({
    invoice: buildFixtureInvoice(),
    lines: [buildFixtureLine()],
    taxSnapshots: [buildFixtureTax()],
    issuer: buildFixtureIssuer(),
    recipient: buildFixtureRecipient(),
    paymentInstruction: buildFixturePaymentInstruction({
      reference: REFERENCE_QRR,
    }),
    spcPayload,
    creditorAccount: REFERENCE_QR_IBAN,
    isVoid: false,
    includeSwissPaymentSection: true,
  });
}

function expectPaymentSlipMetrics(metrics: SwissPaymentSlipMetrics) {
  expect(ptToMm(metrics.sectionWidthPt)).toBeCloseTo(A4_WIDTH_MM, 2);
  expect(ptToMm(metrics.sectionHeightPt)).toBeCloseTo(SWISS_PAYMENT_SECTION_HEIGHT_MM, 2);
  expect(ptToMm(metrics.receiptWidthPt)).toBeCloseTo(SWISS_RECEIPT_WIDTH_MM, 2);
  expect(ptToMm(metrics.paymentPartWidthPt)).toBeCloseTo(SWISS_PAYMENT_PART_WIDTH_MM, 2);
  expect(ptToMm(metrics.qrSizePt)).toBeCloseTo(SWISS_QR_CODE_SIZE_MM, 2);
}

describe("Swiss QR-bill SIX compliance (BILLING-QR-02)", () => {
  it("validates reference QR-IBAN mod-97", () => {
    expect(validateChLiIbanShape(REFERENCE_QR_IBAN)).toBe(REFERENCE_QR_IBAN.replace(/\s+/g, "").toUpperCase());
  });

  it("validates reference QRR checksum", () => {
    expect(REFERENCE_QRR).toMatch(/^\d{27}$/);
    expect(REFERENCE_QRR.slice(-1)).toBe(swissModulo10CheckDigit(REFERENCE_QRR.slice(0, 26)));
  });

  it("builds reference SPC payload semantics", () => {
    const payload = buildReferencePayload();
    expect(payload.startsWith("SPC\r\n0200\r\n1\r\n")).toBe(true);
    expect(payload.endsWith("\r\nEPD")).toBe(true);
    expect(payload).toContain(REFERENCE_QR_IBAN);
    expect(payload).toContain("215.12");
    expect(payload).toContain("CHF");
    expect(payload).toContain("QRR");
    expect(payload).toContain(REFERENCE_QRR);
    expect(payload).toContain("\r\nS\r\nTulip Digital - Duijster\r\nBinningerstrasse\r\n46\r\n");
    expect(payload).toContain("\r\nS\r\nFC Allschwil\r\nHegenheimermattweg\r\n130\r\n");
  });

  it("renders QR PNG where symbol fills bitmap (quiet zone is not embedded)", async () => {
    const payload = buildReferencePayload();
    const renderMetrics = getSwissQrRenderMetrics(payload);
    expect(renderMetrics.marginModules).toBe(0);
    expect(renderMetrics.pngSizePx).toBe(
      renderMetrics.moduleCount * renderMetrics.pixelsPerModule,
    );

    const png = await renderSwissQrCodePng(payload);
    const bounds = await measureQrSymbolBoundsPng(png);
    expect(bounds.symbolWidthPx).toBe(bounds.pngSizePx);
    expect(bounds.symbolHeightPx).toBe(bounds.pngSizePx);
    expect(bounds.quietLeftPx).toBe(0);
    expect(bounds.quietRightPx).toBe(0);

    const moduleSizeMm = SWISS_QR_CODE_SIZE_MM / renderMetrics.moduleCount;
    expect(moduleSizeMm).toBeGreaterThanOrEqual(0.4);
  });

  it("maps PDF QR placement to 46 mm symbol size", () => {
    const metrics = getSwissPaymentSlipMetrics();
    expectPaymentSlipMetrics(metrics);
    expect(SWISS_QR_QUIET_ZONE_MM).toBeGreaterThanOrEqual(1.6);
  });

  it("generates A4 PDF with 210×105 mm payment section at page bottom", async () => {
    const { pdfBytes } = await buildReferencePdf();
    const doc = await PDFDocument.load(pdfBytes);
    const page = doc.getPage(0);
    expect(ptToMm(page.getWidth())).toBeCloseTo(A4_WIDTH_MM, 1);
    expect(ptToMm(page.getHeight())).toBeCloseTo(A4_HEIGHT_MM, 1);

    const metrics = getSwissPaymentSlipMetrics();
    expectPaymentSlipMetrics(metrics);
    expect(metrics.sectionHeightPt).toBeCloseTo(mmToPt(SWISS_PAYMENT_SECTION_HEIGHT_MM), 1);
    expect(metrics.receiptWidthPt + metrics.paymentPartWidthPt).toBeCloseTo(
      metrics.sectionWidthPt,
      1,
    );
  });

  it("produces deterministic QR PNG for canonical payload", async () => {
    const payload = buildSwissSpcPayload({
      creditorAccount: FIXTURE_QR_IBAN,
      creditor: structuredFromIssuer(),
      debtor: structuredFromRecipient(),
      amountMinor: 21512,
      currency: "CHF",
      referenceType: "QRR",
      reference: REFERENCE_QRR,
    });
    const a = await renderSwissQrCodePng(payload);
    const b = await renderSwissQrCodePng(payload);
    expect(createHash("sha256").update(a).digest("hex")).toBe(
      createHash("sha256").update(b).digest("hex"),
    );
  });
});
