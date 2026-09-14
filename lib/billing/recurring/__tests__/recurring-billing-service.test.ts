import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  listActiveBillingContractsForRecurring: vi.fn(),
  findNonVoidInvoiceForContractPeriod: vi.fn(),
  createBillingRecurringRunRecord: vi.fn(),
  findLatestBillingRecurringRun: vi.fn(),
  createDraftInvoiceFromContract: vi.fn(),
  finalizeInvoice: vi.fn(),
  createInvoicePaymentInstruction: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
  sendNativeInvoiceEmail: vi.fn(),
  resolveInvoiceRecipientProfileForContract: vi.fn(),
  findLegalEntityById: vi.fn(),
  listBillingBankAccountsForLegalEntity: vi.fn(),
  allocateUniqueBillingKey: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("../recurring-billing-repository", () => ({
  listActiveBillingContractsForRecurring: mocks.listActiveBillingContractsForRecurring,
  findNonVoidInvoiceForContractPeriod: mocks.findNonVoidInvoiceForContractPeriod,
  createBillingRecurringRunRecord: mocks.createBillingRecurringRunRecord,
  findLatestBillingRecurringRun: mocks.findLatestBillingRecurringRun,
}));

vi.mock("@/lib/billing/native-billing-commercial-service", () => ({
  createDraftInvoiceFromContract: mocks.createDraftInvoiceFromContract,
  finalizeInvoice: mocks.finalizeInvoice,
}));

vi.mock("@/lib/billing/invoice-payment-instruction-service", () => ({
  createInvoicePaymentInstruction: mocks.createInvoicePaymentInstruction,
}));

vi.mock("@/lib/billing/invoice-pdf-service", () => ({
  generateNativeInvoicePdfBytes: mocks.generateNativeInvoicePdfBytes,
}));

vi.mock("@/lib/billing/invoice-delivery/invoice-delivery-service", () => ({
  sendNativeInvoiceEmail: mocks.sendNativeInvoiceEmail,
}));

vi.mock("@/lib/billing/invoice-recipient-profile-resolution", () => ({
  resolveInvoiceRecipientProfileForContract: mocks.resolveInvoiceRecipientProfileForContract,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityById: mocks.findLegalEntityById,
  listBillingBankAccountsForLegalEntity: mocks.listBillingBankAccountsForLegalEntity,
}));

vi.mock("@/lib/billing/billing-business-key", () => ({
  allocateUniqueBillingKey: mocks.allocateUniqueBillingKey,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

vi.mock("@/lib/billing/swiss-qr/swiss-bank-account-selection", () => ({
  selectEligibleBillingBankAccount: vi.fn(() => ({ id: "bank-1" })),
}));

const { runRecurringBilling } = await import("../recurring-billing-service");

const baseContract = {
  id: "contract-1",
  key: "fca-contract",
  contractNumber: "FCA-2026-001",
  legalEntityId: "le-1",
  billingCustomerId: "cust-1",
  billingProductId: null,
  productName: "SportClubEvo Platform",
  productDescription: null,
  status: "ACTIVE" as const,
  currency: "CHF",
  monthlyNetAmountMinor: 19900,
  billingInterval: "MONTHLY" as const,
  vatTreatment: "STANDARD_81" as const,
  startDate: new Date("2026-09-01T12:00:00.000Z"),
  endDate: null,
  minimumTermMonths: null,
  paymentTermsDays: 30,
  invoiceRecipientProfileId: "prof-1",
  description: null,
  internalNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customerKey: "fca",
  customerName: "FC Allschwil",
};

function setupHappyPathConfig() {
  mocks.findLegalEntityById.mockResolvedValue({
    id: "le-1",
    status: "ACTIVE",
    legalName: "Tulip Digital AG",
    addressLine1: "Str",
  });
  mocks.resolveInvoiceRecipientProfileForContract.mockResolvedValue({
    companyOrName: "FC Allschwil",
    street: "x",
    postalCode: "4123",
    city: "Allschwil",
    countryCode: "CH",
    invoiceEmail: "finanzen@fcallschwil.ch",
  });
  mocks.listBillingBankAccountsForLegalEntity.mockResolvedValue([
    { id: "ba-1", isDefault: true, ibanEncrypted: "x", referenceStrategy: "QRR" },
  ]);
}

describe("runRecurringBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allocateUniqueBillingKey.mockResolvedValue("run-key-1");
    mocks.createBillingRecurringRunRecord.mockResolvedValue({});
    mocks.listActiveBillingContractsForRecurring.mockResolvedValue([baseContract]);
    mocks.findNonVoidInvoiceForContractPeriod.mockResolvedValue(null);
    setupHappyPathConfig();
  });

  it("dry-run performs zero invoice mutations", async () => {
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("PREVIEW_WOULD_CREATE");
    expect(result.summary.results[0]?.grossTotalMinor).toBe(21512);
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
    expect(mocks.finalizeInvoice).not.toHaveBeenCalled();
    expect(mocks.sendNativeInvoiceEmail).not.toHaveBeenCalled();
  });

  it("FCA September regression: skips already invoiced September period", async () => {
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        if (periodStart.toISOString().startsWith("2026-09")) {
          return {
            key: "inv-fca-sep",
            invoiceNumber: "2026-000002",
            netTotalMinor: 19900,
            vatTotalMinor: 1612,
            grossTotalMinor: 21512,
            status: "FINALIZED",
          };
        }
        return null;
      },
    );

    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-09-15",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_NOT_DUE");
    expect(mocks.createDraftInvoiceFromContract).not.toHaveBeenCalled();
  });

  it("FCA October preview after September invoiced", async () => {
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        if (periodStart.toISOString().startsWith("2026-09")) {
          return { key: "inv-fca-sep", invoiceNumber: "2026-000002", status: "FINALIZED" };
        }
        return null;
      },
    );

    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("PREVIEW_WOULD_CREATE");
    expect(result.summary.results[0]?.periodStart).toBe("2026-10-01");
    expect(result.summary.results[0]?.periodEnd).toBe("2026-10-31");
  });

  it("execute creates invoice pipeline without send by default", async () => {
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        if (periodStart.toISOString().startsWith("2026-09")) {
          return { key: "inv-sep", invoiceNumber: "2026-000002", status: "FINALIZED" };
        }
        return null;
      },
    );
    mocks.createDraftInvoiceFromContract.mockResolvedValue({
      key: "inv-new",
      netTotalMinor: 19900,
      vatTotalMinor: 1612,
      grossTotalMinor: 21512,
    });
    mocks.finalizeInvoice.mockResolvedValue({
      key: "inv-new",
      invoiceNumber: "2026-000003",
      netTotalMinor: 19900,
      vatTotalMinor: 1612,
      grossTotalMinor: 21512,
    });

    const result = await runRecurringBilling({
      mode: "EXECUTE",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("CREATED_NOT_SENT");
    expect(mocks.createDraftInvoiceFromContract).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        invoiceDate: "2026-10-01",
      }),
    );
    expect(mocks.finalizeInvoice).toHaveBeenCalled();
    expect(mocks.createInvoicePaymentInstruction).toHaveBeenCalled();
    expect(mocks.generateNativeInvoicePdfBytes).toHaveBeenCalled();
    expect(mocks.sendNativeInvoiceEmail).not.toHaveBeenCalled();
  });

  it("maps concurrent duplicate create to SKIPPED_ALREADY_INVOICED", async () => {
    let createAttempts = 0;
    mocks.findNonVoidInvoiceForContractPeriod.mockImplementation(
      async ({ periodStart }: { periodStart: Date }) => {
        if (periodStart.toISOString().startsWith("2026-09")) {
          return { key: "inv-sep", invoiceNumber: "2026-000002", status: "FINALIZED" };
        }
        if (
          periodStart.toISOString().startsWith("2026-10") &&
          createAttempts > 0
        ) {
          return {
            key: "inv-dup",
            invoiceNumber: "2026-000003",
            netTotalMinor: 19900,
            vatTotalMinor: 1612,
            grossTotalMinor: 21512,
          };
        }
        return null;
      },
    );
    mocks.createDraftInvoiceFromContract.mockImplementation(async () => {
      createAttempts += 1;
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      });
    });

    const result = await runRecurringBilling({
      mode: "EXECUTE",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_ALREADY_INVOICED");
  });

  it("inactive contract is skipped without aborting others", async () => {
    mocks.listActiveBillingContractsForRecurring.mockResolvedValue([
      { ...baseContract, key: "paused", status: "PAUSED" },
      baseContract,
    ]);

    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results).toHaveLength(2);
    expect(result.summary.results[0]?.outcome).toBe("SKIPPED_INACTIVE");
    expect(result.summary.results[1]?.outcome).toBe("PREVIEW_WOULD_CREATE");
  });

  it("blocks when recipient missing", async () => {
    mocks.resolveInvoiceRecipientProfileForContract.mockResolvedValue(null);
    const result = await runRecurringBilling({
      mode: "DRY_RUN",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      actorUserId: "user-1",
      persistRun: false,
    });
    expect(result.summary.results[0]?.outcome).toBe("BLOCKED_NO_RECIPIENT");
    expect(result.summary.blocked).toBe(1);
  });

  it("delivery failure yields CREATED_NOT_SENT", async () => {
    mocks.createDraftInvoiceFromContract.mockResolvedValue({ key: "inv-new" });
    mocks.finalizeInvoice.mockResolvedValue({
      key: "inv-new",
      invoiceNumber: "2026-000003",
      netTotalMinor: 19900,
      vatTotalMinor: 1612,
      grossTotalMinor: 21512,
    });
    mocks.sendNativeInvoiceEmail.mockRejectedValue(new Error("smtp down"));

    const result = await runRecurringBilling({
      mode: "EXECUTE",
      trigger: "MANUAL",
      asOfDate: "2026-10-01",
      deliverAutomatically: true,
      actorUserId: "user-1",
      persistRun: false,
    });

    expect(result.summary.results[0]?.outcome).toBe("CREATED_NOT_SENT");
  });
});
