import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLegalEntityByKey: vi.fn(),
  findConfirmedPaymentByBankTransactionId: vi.fn(),
  findInvoiceForCamt054QrrReference: vi.fn(),
  recordCamt054InvoicePayment: vi.fn(),
  findBankReconciliationImportByContentHash: vi.fn(),
  createBankReconciliationImportWithTransactions: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-repository", () => ({
  findConfirmedPaymentByBankTransactionId: mocks.findConfirmedPaymentByBankTransactionId,
}));

vi.mock("@/lib/billing/camt054-reconciliation/camt054-invoice-matcher", () => ({
  findInvoiceForCamt054QrrReference: mocks.findInvoiceForCamt054QrrReference,
  isCamt054InvoicePayable: (status: string) =>
    ["FINALIZED", "OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(status),
}));

vi.mock("@/lib/billing/invoice-payments/invoice-payment-service", () => ({
  recordCamt054InvoicePayment: mocks.recordCamt054InvoicePayment,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/billing/camt054-reconciliation/camt054-reconciliation-repository", () => ({
  findBankReconciliationImportByContentHash: mocks.findBankReconciliationImportByContentHash,
  createBankReconciliationImportWithTransactions:
    mocks.createBankReconciliationImportWithTransactions,
  deriveImportStatus: () => "COMPLETED",
}));

const { reconcileCamt054Statement } = await import("../camt054-reconciliation-service");

const fixtureXml = readFileSync(
  path.join(
    import.meta.dirname,
    "../../camt054/__tests__/fixtures/sample-credit-qrr.camt054.xml",
  ),
  "utf8",
);

describe("reconcileCamt054Statement (SWISS-01H)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findLegalEntityByKey.mockResolvedValue({ id: "le-1", key: "issuer" });
    mocks.findConfirmedPaymentByBankTransactionId.mockResolvedValue(null);
    mocks.findInvoiceForCamt054QrrReference.mockResolvedValue({
      invoiceId: "inv-1",
      invoiceKey: "inv-key",
      invoiceNumber: "2026-000003",
      legalEntityId: "le-1",
      currency: "CHF",
      grossTotalMinor: 21512,
      status: "OPEN",
      paymentInstructionId: "pi-1",
    });
    mocks.recordCamt054InvoicePayment.mockResolvedValue({
      payment: { key: "pay-1", id: "pay-id-1" },
      summary: {},
    });
    mocks.findBankReconciliationImportByContentHash.mockResolvedValue(null);
    mocks.createBankReconciliationImportWithTransactions.mockResolvedValue({
      key: "import-1",
      id: "import-id-1",
    });
  });

  it("plans matching credit in dry-run mode", async () => {
    const report = await reconcileCamt054Statement({
      legalEntityKey: "issuer",
      xml: fixtureXml,
      dryRun: true,
      actorUserId: "user-1",
    });

    expect(report.appliedCount).toBe(0);
    expect(report.entries[0]?.outcome).toBe("planned");
    expect(report.entries[0]?.matchStatus).toBe("MATCHED");
    expect(report.matchedCount).toBe(1);
    expect(mocks.recordCamt054InvoicePayment).not.toHaveBeenCalled();
  });

  it("records payment when execute mode is enabled", async () => {
    const report = await reconcileCamt054Statement({
      legalEntityKey: "issuer",
      xml: fixtureXml,
      dryRun: false,
      actorUserId: "user-1",
      filename: "acceptance.xml",
      contentSha256: "abc",
    });

    expect(report.appliedCount).toBe(1);
    expect(report.importKey).toBe("import-1");
    expect(report.entries[0]?.outcome).toBe("applied");
    expect(mocks.recordCamt054InvoicePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceKey: "inv-key",
        amountMinor: 21512,
        bankTransactionId: expect.stringContaining("BANK-TX-SCE-01H-001"),
      }),
    );
  });

  it("skips duplicate bank transactions", async () => {
    mocks.findConfirmedPaymentByBankTransactionId.mockResolvedValue({
      key: "existing",
      id: "pay-existing",
    });
    const report = await reconcileCamt054Statement({
      legalEntityKey: "issuer",
      xml: fixtureXml,
      dryRun: false,
      actorUserId: "user-1",
      filename: "duplicate.xml",
      contentSha256: "def",
    });

    expect(report.entries[0]?.outcome).toBe("skipped_duplicate");
    expect(mocks.recordCamt054InvoicePayment).not.toHaveBeenCalled();
  });
});
