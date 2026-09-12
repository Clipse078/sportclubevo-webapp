import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureInvoice,
  FIXTURE_QR_IBAN,
} from "./invoice-pdf-fixtures";
import { generateInvoicePdfFromDocumentData } from "../generate-invoice-pdf";
import { getSwissPaymentSlipMetrics } from "../render-swiss-payment-slip";
import { mmToPt } from "../mm";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
  SWISS_QR_CODE_SIZE_MM,
  SWISS_RECEIPT_WIDTH_MM,
} from "../constants";
import { buildSwissSpcPayload } from "../../swiss-qr/swiss-spc-payload";
import { renderSwissQrCodePng } from "../swiss-qr-code-image";
import { swissModulo10CheckDigit } from "../../swiss-qr/swiss-modulo10";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy?: () => Promise<void>;
  };
};

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  const result = await parser.getText();
  if (parser.destroy) {
    await parser.destroy();
  }
  return result.text;
}

const mocks = vi.hoisted(() => ({
  findBillingBankAccountById: vi.fn(),
  findInvoiceByKey: vi.fn(),
  listInvoiceLines: vi.fn(),
  findInvoiceTaxSnapshots: vi.fn(),
  findInvoiceIssuerSnapshot: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findInvoicePaymentInstructionByInvoiceId: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../../native-billing-repository", () => ({
  findBillingBankAccountById: mocks.findBillingBankAccountById,
}));

vi.mock("../../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  listInvoiceLines: mocks.listInvoiceLines,
  findInvoiceTaxSnapshots: mocks.findInvoiceTaxSnapshots,
  findInvoiceIssuerSnapshot: mocks.findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
}));

vi.mock("../../invoice-payment-instruction-repository", () => ({
  findInvoicePaymentInstructionByInvoiceId: mocks.findInvoicePaymentInstructionByInvoiceId,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const { resolveInvoicePdfDocumentData } = await import("../resolve-invoice-pdf-data");
const { generateNativeInvoicePdfBytes } = await import("../../invoice-pdf-service");

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findBillingBankAccountById.mockResolvedValue({
    id: "bba-ubs",
    legalEntityId: "le-tulip",
    iban: "CH9300762011623852957",
    qrIban: FIXTURE_QR_IBAN,
    referenceStrategy: "QRR",
    qrrReferencePrefix: null,
    currency: "CHF",
    isDefault: true,
    status: "ACTIVE",
  });
});

describe("invoice PDF generation (SWISS-01E)", () => {
  async function buildResolvedDocumentData() {
    const invoice = buildFixtureInvoice();
    mocks.findInvoiceByKey.mockResolvedValue(invoice);
    mocks.listInvoiceLines.mockResolvedValue([buildFixtureLine()]);
    mocks.findInvoiceTaxSnapshots.mockResolvedValue([]);
    mocks.findInvoiceIssuerSnapshot.mockResolvedValue(buildFixtureIssuer());
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(buildFixtureRecipient());
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(
      buildFixturePaymentInstruction(),
    );
    return resolveInvoicePdfDocumentData(invoice.key);
  }

  it("generates PDF bytes for finalized invoice", async () => {
    const data = await buildResolvedDocumentData();
    const result = await generateInvoicePdfFromDocumentData(data);
    expect(result.pdfBytes.byteLength).toBeGreaterThan(5000);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects draft invoice PDF", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(
      buildFixtureInvoice({ status: "DRAFT", invoiceNumber: null }),
    );
    await expect(generateNativeInvoicePdfBytes("inv-fca-2026-001-2")).rejects.toMatchObject({
      name: "NativeBillingConflictError",
    });
  });

  it("uses invoice snapshots and persisted QRR reference", async () => {
    const instruction = buildFixturePaymentInstruction({
      reference: "273282026000002025434650072",
    });
    const data = await buildResolvedDocumentData();
    expect(data.recipient.companyOrName).toBe("FC Allschwil");
    expect(data.issuer.displayName).toBe("SportClubEvo by Tulip Digital");
    expect(data.paymentInstruction?.reference).toBe(instruction.reference);
    expect(data.spcPayload).toContain(instruction.reference);
    expect(data.spcPayload).not.toContain("generateQrr");
  });

  it("embeds expected invoice metadata and totals in extractable text", async () => {
    const data = await buildResolvedDocumentData();
    const { pdfBytes } = await generateInvoicePdfFromDocumentData(data);
    const parsed = await extractPdfText(pdfBytes);
    const text = parsed;
    expect(text).toContain("2026-000002");
    expect(text).toContain("01.09.2026");
    expect(text).toContain("01.10.2026");
    expect(text).toContain("30.09.2026");
    expect(text).toContain("199.00");
    expect(text).toContain("215.12");
    expect(text).toContain("8.1");
    expect(text).toContain("FC Allschwil");
    expect(text).toContain("SportClubEvo by Tulip Digital");
  });

  it("requires payment instruction for payable finalized invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(buildFixtureInvoice());
    mocks.listInvoiceLines.mockResolvedValue([buildFixtureLine()]);
    mocks.findInvoiceIssuerSnapshot.mockResolvedValue(buildFixtureIssuer());
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(buildFixtureRecipient());
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(null);
    await expect(resolveInvoicePdfDocumentData("inv-fca-2026-001-2")).rejects.toMatchObject({
      name: "NativeBillingValidationError",
    });
  });

  it("uses canonical SPC payload structure", async () => {
    const data = await buildResolvedDocumentData();
    expect(data.spcPayload?.startsWith("SPC\r\n0200\r\n1\r\n")).toBe(true);
    expect(data.spcPayload?.endsWith("\r\nEPD")).toBe(true);
    expect(data.spcPayload).toContain("CHF");
    expect(data.spcPayload).toContain("215.12");
  });

  it("validates persisted QRR modulo-10", () => {
    const reference = buildFixturePaymentInstruction().reference!;
    expect(reference).toMatch(/^\d{27}$/);
    expect(reference.slice(-1)).toBe(swissModulo10CheckDigit(reference.slice(0, 26)));
  });

  it("renders deterministic Swiss QR PNG for canonical payload", async () => {
    const payload = buildSwissSpcPayload({
      creditorAccount: FIXTURE_QR_IBAN,
      creditor: structuredFromIssuer(),
      debtor: structuredFromRecipient(),
      amountMinor: 21512,
      currency: "CHF",
      referenceType: "QRR",
      reference: "273282026000002025434650072",
    });
    const a = await renderSwissQrCodePng(payload, 400);
    const b = await renderSwissQrCodePng(payload, 400);
    expect(createHash("sha256").update(a).digest("hex")).toBe(
      createHash("sha256").update(b).digest("hex"),
    );
  });

  it("uses A4 page size and payment slip dimensions", async () => {
    const metrics = getSwissPaymentSlipMetrics();
    expect(metrics.sectionWidthPt).toBeCloseTo(mmToPt(A4_WIDTH_MM), 1);
    expect(metrics.sectionHeightPt).toBeCloseTo(mmToPt(SWISS_PAYMENT_SECTION_HEIGHT_MM), 1);
    expect(metrics.receiptWidthPt).toBeCloseTo(mmToPt(SWISS_RECEIPT_WIDTH_MM), 1);
    expect(metrics.qrSizePt).toBeCloseTo(mmToPt(SWISS_QR_CODE_SIZE_MM), 1);

    const data = await buildResolvedDocumentData();
    const { pdfBytes } = await generateInvoicePdfFromDocumentData(data);
    const doc = await PDFDocument.load(pdfBytes);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(mmToPt(A4_WIDTH_MM), 0);
    expect(page.getHeight()).toBeCloseTo(mmToPt(A4_HEIGHT_MM), 0);
  });

  it("paginates multi-line invoices and keeps payment section on separate page", async () => {
    const manyLines = Array.from({ length: 12 }, (_, index) =>
      buildFixtureLine({
        id: `line-${index}`,
        description: `Position ${index + 1}`,
        sortOrder: index,
      }),
    );
    mocks.findInvoiceByKey.mockResolvedValue(buildFixtureInvoice());
    mocks.listInvoiceLines.mockResolvedValue(manyLines);
    mocks.findInvoiceTaxSnapshots.mockResolvedValue([]);
    mocks.findInvoiceIssuerSnapshot.mockResolvedValue(buildFixtureIssuer());
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(buildFixtureRecipient());
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(
      buildFixturePaymentInstruction(),
    );
    const data = await resolveInvoicePdfDocumentData("inv-fca-2026-001-2");
    const result = await generateInvoicePdfFromDocumentData(data);
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
    expect(result.singlePageLayout).toBe(false);
  });

  it("void invoice PDF omits Swiss payment section", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(buildFixtureInvoice({ status: "VOID" }));
    mocks.listInvoiceLines.mockResolvedValue([buildFixtureLine()]);
    mocks.findInvoiceTaxSnapshots.mockResolvedValue([]);
    mocks.findInvoiceIssuerSnapshot.mockResolvedValue(buildFixtureIssuer());
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(buildFixtureRecipient());
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(
      buildFixturePaymentInstruction(),
    );
    const data = await resolveInvoicePdfDocumentData("inv-fca-2026-001-2");
    expect(data.includeSwissPaymentSection).toBe(false);
    const { pdfBytes } = await generateInvoicePdfFromDocumentData(data);
    const text = await extractPdfText(pdfBytes);
    expect(text).toContain("STORNIERT");
    expect(text).not.toContain("Zahlteil");
  });

  it("does not trigger audit/delivery side effects when generating PDF", async () => {
    await buildResolvedDocumentData();
    await generateNativeInvoicePdfBytes("inv-fca-2026-001-2");
    expect(mocks.logAction).not.toHaveBeenCalled();
  });

  it("does not include marketing slogans", async () => {
    const data = await buildResolvedDocumentData();
    const { pdfBytes } = await generateInvoicePdfFromDocumentData(data);
    const parsed = await extractPdfText(pdfBytes);
    const text = parsed;
    expect(text).not.toContain("More than a club");
    expect(text).not.toContain("Gemeinsam machen wir Vereinsarbeit");
    expect(text).toContain("Vielen Dank für Ihr Vertrauen.");
  });
});
