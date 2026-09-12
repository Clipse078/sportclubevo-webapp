import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildFixtureIssuer, buildFixturePaymentInstruction, buildFixtureRecipient } from "./invoice-pdf-fixtures";

const mocks = vi.hoisted(() => ({
  findBillingBankAccountById: vi.fn(),
}));

vi.mock("../../native-billing-repository", () => ({
  findBillingBankAccountById: mocks.findBillingBankAccountById,
}));

const { resolveInvoicePaymentSpcFromInstruction } = await import("../resolve-invoice-payment-spc");
const { generateQrrReference } = await import("../../swiss-qr/swiss-qrr");

beforeEach(() => {
  mocks.findBillingBankAccountById.mockResolvedValue({
    id: "bba-ubs",
    iban: "CH9300762011623852957",
    qrIban: "CH4431999123000889012",
    referenceStrategy: "QRR",
  });
});

describe("resolveInvoicePaymentSpcFromInstruction", () => {
  it("uses persisted reference instead of regenerating QRR", async () => {
    const instruction = buildFixturePaymentInstruction({
      reference: "273282026000002025434650072",
    });
    const regenerated = generateQrrReference(
      {
        invoiceId: "inv-id-fca-2",
        legalEntityId: "le-tulip",
        invoiceNumber: "2026-000002",
      },
      null,
    );

    const resolved = await resolveInvoicePaymentSpcFromInstruction({
      instruction,
      issuer: buildFixtureIssuer(),
      recipient: buildFixtureRecipient(),
    });

    expect(resolved.spcPayload).toContain(instruction.reference);
    expect(resolved.spcPayload).not.toContain(regenerated);
  });
});
