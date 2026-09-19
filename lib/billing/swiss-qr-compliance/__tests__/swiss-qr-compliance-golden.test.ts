import { describe, expect, it } from "vitest";
import { generateInvoicePdfFromDocumentData } from "../../invoice-pdf/generate-invoice-pdf";
import {
  buildFixtureInvoice,
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "../../invoice-pdf/__tests__/invoice-pdf-fixtures";
import {
  isIBANValid,
  isQRIBAN,
  isQRReferenceValid,
  isSCORReferenceValid,
} from "swissqrbill/utils";
import { goldenValidFixtures, goldenInvalidFixtures } from "../fixtures/golden-fixtures";
import { runSwissQrCompliance } from "../run-swiss-qr-compliance";
import { normalizeSwissQrPayloadForComparison } from "../serialize-canonical-swiss-qr-payload";
import { SWISS_QR_COMPLIANCE_CODES } from "../swiss-qr-compliance-codes";

function assertIndependentSwissqrbillOracle(fixture: (typeof goldenValidFixtures)[number]): void {
  expect(isIBANValid(fixture.expectedCreditorAccount)).toBe(true);
  if (fixture.data.reference.type === "QRR") {
    expect(isQRIBAN(fixture.expectedCreditorAccount)).toBe(true);
    expect(isQRReferenceValid(fixture.data.reference.value ?? "")).toBe(true);
  }
  if (fixture.data.reference.type === "SCOR") {
    expect(isSCORReferenceValid(fixture.data.reference.value ?? "")).toBe(true);
  }
}

const productValidFixtures = goldenValidFixtures.filter((f) => f.id !== "iban-scor-eur-shaped");

describe("Swiss QR compliance golden suite (BILLING-QR-03)", () => {
  it.each(productValidFixtures)("$id passes compliance + QR decode", async (fixture) => {
    const result = await runSwissQrCompliance(fixture.data, { verifyQrArtifact: true });
    expect(result.ok).toBe(true);
    if (result.ok && fixture.expectedPayloadContains) {
      for (const fragment of fixture.expectedPayloadContains) {
        expect(result.canonicalPayload).toContain(fragment);
      }
    }
    if (result.ok && fixture.goldenPayloadNormalized) {
      expect(normalizeSwissQrPayloadForComparison(result.canonicalPayload)).toBe(
        fixture.goldenPayloadNormalized,
      );
    }
    assertIndependentSwissqrbillOracle(fixture);
  });

  it.each(goldenInvalidFixtures)("$id fails deterministically", async (fixture) => {
    const result = await runSwissQrCompliance(fixture.data, { verifyQrArtifact: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === fixture.expectedCode)).toBe(true);
    }
  });

  it("validates final PDF QR payload equals canonical payload (Tulip fixture)", async () => {
    const fixture = goldenValidFixtures.find((f) => f.id === "tulip-qrr-chf")!;
    const compliance = await runSwissQrCompliance(fixture.data, { verifyQrArtifact: true });
    expect(compliance.ok).toBe(true);
    if (!compliance.ok) {
      return;
    }

    const { pdfBytes } = await generateInvoicePdfFromDocumentData({
      invoice: buildFixtureInvoice(),
      lines: [buildFixtureLine()],
      taxSnapshots: [buildFixtureTax()],
      issuer: buildFixtureIssuer(),
      recipient: buildFixtureRecipient(),
      paymentInstruction: buildFixturePaymentInstruction({
        reference: fixture.data.reference.value ?? undefined,
      }),
      spcPayload: compliance.canonicalPayload,
      creditorAccount: FIXTURE_QR_IBAN,
      isVoid: false,
      includeSwissPaymentSection: true,
    });

    const pdfCompliance = await runSwissQrCompliance(fixture.data, {
      verifyQrArtifact: false,
      verifyPdfArtifact: true,
      pdfBytes,
    });
    expect(pdfCompliance.ok).toBe(true);
  });

  it("rejects unsupported EUR at product boundary", async () => {
    const eurFixture = goldenValidFixtures.find((f) => f.id === "iban-scor-eur-shaped")!;
    const result = await runSwissQrCompliance(eurFixture.data, { verifyQrArtifact: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.code).toBe(SWISS_QR_COMPLIANCE_CODES.UNSUPPORTED_PRODUCT_CURRENCY);
    }
  });
});
