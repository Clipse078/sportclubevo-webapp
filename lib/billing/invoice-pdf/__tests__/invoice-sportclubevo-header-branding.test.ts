import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it } from "vitest";
import {
  SPORTCLUBEVO_HEADER_LOGO_ASSET_PATH,
  SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256,
  SPORTCLUBEVO_HEADER_LOGO_PATH,
  SWISS_QR_RECOGNITION_CROSS_ASSET_PATH,
  SWISS_QR_RECOGNITION_CROSS_ASSET_SHA256,
} from "../constants";
import { generateInvoicePdfFromDocumentData } from "../generate-invoice-pdf";
import { drawSportClubEvoInvoiceHeader } from "../draw-invoice-header";
import {
  getSportClubEvoHeaderLogoAssetAbsolutePath,
  loadSportClubEvoHeaderLogoAssetBytes,
} from "../sportclubevo-header-logo-asset";
import { loadTulipVisibleArtworkPngBytes } from "../tulip-logo-visible-bounds";
import { loadSwissQrRecognitionCrossAssetBytesSync } from "../swiss-qr-recognition-cross-asset";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureInvoice,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "./invoice-pdf-fixtures";
import { buildSwissSpcPayload } from "../../swiss-qr/swiss-spc-payload";
import { mmToPt } from "../mm";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../constants";

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function countPdfImageXObjects(pdfBytes: Uint8Array): number {
  const raw = Buffer.from(pdfBytes).toString("latin1");
  return (raw.match(/\/Subtype\s*\/Image/g) ?? []).length;
}

describe("SportClubEvo invoice PDF header branding (BILLING-PDF-04)", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("keeps canonical public and runtime asset paths documented", () => {
    expect(SPORTCLUBEVO_HEADER_LOGO_PATH).toBe(
      "public/images/branding/sportclubevo_logo_alt.png",
    );
    expect(SPORTCLUBEVO_HEADER_LOGO_ASSET_PATH).toBe(
      "lib/billing/invoice-pdf/assets/sportclubevo-header-logo-alt.png",
    );
  });

  it("ships the canonical header logo bytes next to the PDF module", () => {
    const assetPath = getSportClubEvoHeaderLogoAssetAbsolutePath();
    expect(assetPath).toContain(`${path.sep}lib${path.sep}billing${path.sep}invoice-pdf${path.sep}assets${path.sep}`);
    const bytes = readFileSync(assetPath);
    expect(sha256Hex(new Uint8Array(bytes))).toBe(SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256);
    const publicBytes = readFileSync(
      path.join(process.cwd(), SPORTCLUBEVO_HEADER_LOGO_PATH),
    );
    expect(sha256Hex(new Uint8Array(publicBytes))).toBe(SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256);
  });

  it("loads header logo independently of process.cwd()", async () => {
    process.chdir("/tmp");
    const bytes = await loadSportClubEvoHeaderLogoAssetBytes();
    expect(sha256Hex(bytes)).toBe(SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256);
  });

  it("embeds the header logo via drawSportClubEvoInvoiceHeader", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);
    await drawSportClubEvoInvoiceHeader(
      pdfDoc,
      page,
      page.getWidth(),
      page.getHeight(),
    );
    const saved = await pdfDoc.save();
    expect(countPdfImageXObjects(saved)).toBeGreaterThanOrEqual(1);
    expect(sha256Hex(await loadSportClubEvoHeaderLogoAssetBytes())).toBe(
      SPORTCLUBEVO_HEADER_LOGO_ASSET_SHA256,
    );
  });

  it("generates invoice PDF with header logo, Tulip footer, and unchanged SIX asset", async () => {
    const issuer = buildFixtureIssuer();
    const recipient = buildFixtureRecipient();
    const spcPayload = buildSwissSpcPayload({
      creditorAccount: FIXTURE_QR_IBAN,
      creditor: {
        name: issuer.legalName,
        street: issuer.addressLine1,
        houseNumber: issuer.houseNumber,
        postalCode: issuer.postalCode,
        city: issuer.city,
        countryCode: issuer.countryCode,
      },
      debtor: {
        name: recipient.companyOrName,
        street: recipient.street,
        houseNumber: recipient.houseNumber,
        postalCode: recipient.postalCode,
        city: recipient.city,
        countryCode: recipient.countryCode,
      },
      amountMinor: 21512,
      currency: "CHF",
      referenceType: "QRR",
      reference: "273282026000002025434650072",
    });

    const { pdfBytes } = await generateInvoicePdfFromDocumentData({
      invoice: buildFixtureInvoice(),
      lines: [buildFixtureLine()],
      taxSnapshots: [buildFixtureTax()],
      issuer,
      recipient,
      paymentInstruction: buildFixturePaymentInstruction({
        reference: "273282026000002025434650072",
      }),
      spcPayload,
      creditorAccount: FIXTURE_QR_IBAN,
      isVoid: false,
      includeSwissPaymentSection: true,
    });

    expect(countPdfImageXObjects(pdfBytes)).toBeGreaterThanOrEqual(3);
    expect(sha256Hex(loadSwissQrRecognitionCrossAssetBytesSync())).toBe(
      SWISS_QR_RECOGNITION_CROSS_ASSET_SHA256,
    );
    expect(SWISS_QR_RECOGNITION_CROSS_ASSET_PATH).toBe(
      "lib/billing/invoice-pdf/assets/six-swiss-qr-black-white-cross-7mm.png",
    );
    const { pngBytes: tulipBytes } = loadTulipVisibleArtworkPngBytes();
    expect(tulipBytes.byteLength).toBeGreaterThan(10_000);
  });
});
