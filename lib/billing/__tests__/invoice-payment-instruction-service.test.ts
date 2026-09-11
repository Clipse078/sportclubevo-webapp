import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingConflictError, NativeBillingValidationError } from "../native-billing-types";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceIssuerSnapshot: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  listBillingBankAccountsForLegalEntity: vi.fn(),
  findInvoicePaymentInstructionByInvoiceId: vi.fn(),
  createInvoicePaymentInstructionRecord: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceIssuerSnapshot: mocks.findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
}));

vi.mock("../native-billing-repository", () => ({
  listBillingBankAccountsForLegalEntity: mocks.listBillingBankAccountsForLegalEntity,
}));

vi.mock("../invoice-payment-instruction-repository", () => ({
  findInvoicePaymentInstructionByInvoiceId: mocks.findInvoicePaymentInstructionByInvoiceId,
  createInvoicePaymentInstructionRecord: mocks.createInvoicePaymentInstructionRecord,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

const { createInvoicePaymentInstruction } = await import("../invoice-payment-instruction-service");

const issuer = {
  legalName: "Issuer AG",
  displayName: "Issuer",
  addressLine1: "Street",
  houseNumber: "1",
  postalCode: "4000",
  city: "Basel",
  countryCode: "CH",
};

const recipient = {
  companyOrName: "Customer",
  street: "Weg",
  houseNumber: "2",
  postalCode: "4144",
  city: "Arlesheim",
  countryCode: "CH",
};

const finalizedInvoice = {
  id: "inv-1",
  key: "inv-key",
  invoiceNumber: "2026-000001",
  legalEntityId: "le-1",
  billingCustomerId: "bc-1",
  status: "FINALIZED",
  currency: "CHF",
  grossTotalMinor: 10810,
};

const bankAccount = {
  id: "ba-1",
  legalEntityId: "le-1",
  label: "Main",
  bankName: null,
  currency: "CHF",
  iban: "CH9300762011623852957",
  qrIban: null,
  referenceStrategy: "SCOR" as const,
  qrrReferencePrefix: null,
  creditorName: "Issuer AG",
  creditorAddressLine1: "Street",
  creditorHouseNumber: null,
  creditorPostalCode: "4000",
  creditorCity: "Basel",
  creditorCountryCode: "CH",
  activeFrom: new Date(),
  activeUntil: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("invoice payment instruction service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(null);
    mocks.findInvoiceIssuerSnapshot.mockResolvedValue(issuer);
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(recipient);
    mocks.listBillingBankAccountsForLegalEntity.mockResolvedValue([bankAccount]);
    mocks.createInvoicePaymentInstructionRecord.mockImplementation(async (data) => ({
      id: "pi-1",
      ...data,
      createdAt: new Date(),
    }));
  });

  it("rejects draft invoices", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...finalizedInvoice, status: "DRAFT" });
    await expect(createInvoicePaymentInstruction("inv-key", "u1")).rejects.toBeInstanceOf(
      NativeBillingConflictError,
    );
  });

  it("creates instruction for finalized invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    const created = await createInvoicePaymentInstruction("inv-key", "u1");
    expect(created.amountMinor).toBe(10810);
    expect(created.referenceType).toBe("SCOR");
    expect(created.reference).toMatch(/^RF/);
  });

  it("is idempotent", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    const existing = {
      id: "pi-existing",
      invoiceId: "inv-1",
      billingBankAccountId: "ba-1",
      paymentMethod: "BANK_TRANSFER_SWISS_QR",
      referenceType: "SCOR",
      reference: "RF000000000",
      amountMinor: 10810,
      currency: "CHF",
      creditorAccountMasked: "****2957",
      additionalInformation: null,
      createdAt: new Date(),
    };
    mocks.findInvoicePaymentInstructionByInvoiceId.mockResolvedValue(existing);
    const result = await createInvoicePaymentInstruction("inv-key", "u1");
    expect(result).toBe(existing);
    expect(mocks.createInvoicePaymentInstructionRecord).not.toHaveBeenCalled();
  });

  it("fails when no bank account", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    mocks.listBillingBankAccountsForLegalEntity.mockResolvedValue([]);
    await expect(createInvoicePaymentInstruction("inv-key", "u1")).rejects.toBeInstanceOf(
      NativeBillingValidationError,
    );
  });

  it("fails when multiple accounts without default", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    mocks.listBillingBankAccountsForLegalEntity.mockResolvedValue([
      { ...bankAccount, id: "ba-1", isDefault: false },
      { ...bankAccount, id: "ba-2", isDefault: false },
    ]);
    await expect(createInvoicePaymentInstruction("inv-key", "u1")).rejects.toBeInstanceOf(
      NativeBillingValidationError,
    );
  });

  it("uses recipient snapshot (not live customer)", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    await createInvoicePaymentInstruction("inv-key", "u1");
    expect(mocks.findInvoiceRecipientSnapshot).toHaveBeenCalledWith("inv-1");
  });
});
