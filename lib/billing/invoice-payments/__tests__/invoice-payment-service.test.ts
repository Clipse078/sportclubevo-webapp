import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "../../native-billing-types";
import { NATIVE_BILLING_AUDIT_ACTIONS } from "../../native-billing-audit";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  listInvoicePaymentsForInvoiceId: vi.fn(),
  findInvoicePaymentByKey: vi.fn(),
  sumConfirmedPaymentsMinor: vi.fn(),
  createInvoicePaymentRecord: vi.fn(),
  markInvoicePaymentReversed: vi.fn(),
  logAction: vi.fn(),
  transaction: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn(),
  invoicePaymentFindMany: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
}));

vi.mock("../invoice-payment-repository", () => ({
  listInvoicePaymentsForInvoiceId: mocks.listInvoicePaymentsForInvoiceId,
  findInvoicePaymentByKey: mocks.findInvoicePaymentByKey,
  sumConfirmedPaymentsMinor: mocks.sumConfirmedPaymentsMinor,
  createInvoicePaymentRecord: mocks.createInvoicePaymentRecord,
  markInvoicePaymentReversed: mocks.markInvoicePaymentReversed,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    invoice: {
      findUnique: mocks.invoiceFindUnique,
    },
  },
}));

const {
  recordInvoicePayment,
  reverseInvoicePayment,
  recalculateInvoicePaymentStatus,
  getInvoicePaymentSummary,
} = await import("../invoice-payment-service");

const { sumConfirmedPaymentAmountMinor } = await import("../invoice-payment-balance");

const baseInvoice = {
  id: "inv-1",
  key: "inv-key",
  invoiceNumber: "2026-000099",
  legalEntityId: "le-1",
  billingCustomerId: "bc-1",
  status: "FINALIZED" as const,
  currency: "CHF",
  grossTotalMinor: 21512,
  netTotalMinor: 0,
  vatTotalMinor: 0,
  periodStart: new Date(),
  periodEnd: new Date(),
  invoiceDate: new Date(),
  dueDate: new Date(),
  paymentTermsDays: 30,
  contractLabel: null,
  billingContractId: null,
  finalizedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeTx() {
  return {
    $queryRaw: mocks.queryRaw,
    invoice: { update: mocks.invoiceUpdate },
    invoicePayment: {
      findMany: mocks.invoicePaymentFindMany,
      findUnique: vi.fn(),
      aggregate: vi.fn(),
    },
  };
}

describe("invoice payment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findInvoiceByKey.mockResolvedValue(baseInvoice);
    mocks.sumConfirmedPaymentsMinor.mockResolvedValue(0);
    mocks.queryRaw.mockResolvedValue([
      {
        id: baseInvoice.id,
        status: "FINALIZED",
        grossTotalMinor: 21512,
        currency: "CHF",
        key: baseInvoice.key,
        invoiceNumber: baseInvoice.invoiceNumber,
      },
    ]);
    mocks.createInvoicePaymentRecord.mockImplementation(async (data) => ({
      id: "pay-1",
      ...data,
      status: "CONFIRMED",
      externalReference: null,
      bankTransactionId: null,
      reversedAt: null,
      reversedByUserId: null,
      reversalReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mocks.invoicePaymentFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(makeTx()),
    );
    mocks.listInvoicePaymentsForInvoiceId.mockResolvedValue([]);
  });

  it("recalculates status to PAID when fully paid", () => {
    expect(recalculateInvoicePaymentStatus(21512, 21512, "FINALIZED")).toBe("PAID");
  });

  it("recalculates status to PARTIALLY_PAID", () => {
    expect(recalculateInvoicePaymentStatus(21512, 20000, "FINALIZED")).toBe("PARTIALLY_PAID");
  });

  it("records full payment and marks invoice PAID", async () => {
    mocks.invoicePaymentFindMany.mockResolvedValue([
      {
        id: "pay-1",
        key: "pk-1",
        invoiceId: "inv-1",
        amountMinor: 21512,
        currency: "CHF",
        paymentDate: new Date("2026-09-12"),
        method: "BANK_TRANSFER_MANUAL",
        reference: null,
        note: null,
        source: "MANUAL",
        status: "CONFIRMED",
        externalReference: null,
        bankTransactionId: null,
        reversedAt: null,
        reversedByUserId: null,
        reversalReason: null,
        createdByUserId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const result = await recordInvoicePayment({
      invoiceKey: "inv-key",
      amountMinor: 21512,
      currency: "CHF",
      paymentDate: "2026-09-12",
      method: "BANK_TRANSFER_MANUAL",
      actorUserId: "user-1",
    });
    expect(result.payment.amountMinor).toBe(21512);
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "PAID" },
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED,
      }),
    );
  });

  it("partial payment does not mark PAID", async () => {
    mocks.sumConfirmedPaymentsMinor.mockResolvedValue(0);
    await recordInvoicePayment({
      invoiceKey: "inv-key",
      amountMinor: 20000,
      currency: "CHF",
      paymentDate: "2026-09-12",
      method: "BANK_TRANSFER_MANUAL",
      actorUserId: "user-1",
    });
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "PARTIALLY_PAID" },
    });
  });

  it("rejects overpayment", async () => {
    mocks.sumConfirmedPaymentsMinor.mockResolvedValue(0);
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 21513,
        currency: "CHF",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("cannot pay DRAFT", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...baseInvoice, status: "DRAFT" });
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 100,
        currency: "CHF",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("cannot pay VOID", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...baseInvoice, status: "VOID" });
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 100,
        currency: "CHF",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("cannot pay fully-paid invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...baseInvoice, status: "PAID" });
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 100,
        currency: "CHF",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
  });

  it("rejects currency mismatch", async () => {
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 100,
        currency: "EUR",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("reversal restores outstanding and audit", async () => {
    const payment = {
      id: "pay-1",
      key: "pk-1",
      invoiceId: "inv-1",
      amountMinor: 21512,
      currency: "CHF",
      paymentDate: new Date(),
      method: "BANK_TRANSFER_MANUAL" as const,
      reference: null,
      note: null,
      source: "MANUAL" as const,
      status: "CONFIRMED" as const,
      externalReference: null,
      bankTransactionId: null,
      reversedAt: null,
      reversedByUserId: null,
      reversalReason: null,
      createdByUserId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.findInvoicePaymentByKey.mockResolvedValue(payment);
    mocks.invoiceFindUnique.mockResolvedValue({ key: "inv-key" });
    mocks.markInvoicePaymentReversed.mockResolvedValue({
      ...payment,
      status: "REVERSED",
    });
    mocks.sumConfirmedPaymentsMinor.mockResolvedValue(0);
    mocks.listInvoicePaymentsForInvoiceId.mockResolvedValue([
      { ...payment, status: "REVERSED" },
    ]);
    const tx = makeTx();
    tx.invoicePayment.findUnique = vi.fn().mockResolvedValue({ status: "CONFIRMED" });
    mocks.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) =>
      cb(tx),
    );

    await reverseInvoicePayment({
      paymentKey: "pk-1",
      reason: "Falsch verbucht",
      actorUserId: "user-1",
    });

    expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "FINALIZED" },
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_REVERSED,
      }),
    );
  });

  it("getInvoicePaymentSummary returns null for missing invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue(null);
    expect(await getInvoicePaymentSummary("missing")).toBeNull();
  });

  it("blocks second payment when outstanding already consumed", async () => {
    mocks.sumConfirmedPaymentsMinor.mockResolvedValue(21512);
    mocks.queryRaw.mockResolvedValue([
      {
        id: baseInvoice.id,
        status: "PAID",
        grossTotalMinor: 21512,
        currency: "CHF",
        key: baseInvoice.key,
        invoiceNumber: baseInvoice.invoiceNumber,
      },
    ]);
    mocks.findInvoiceByKey.mockResolvedValue({ ...baseInvoice, status: "PARTIALLY_PAID" });
    await expect(
      recordInvoicePayment({
        invoiceKey: "inv-key",
        amountMinor: 21512,
        currency: "CHF",
        paymentDate: "2026-09-12",
        method: "BANK_TRANSFER_MANUAL",
        actorUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
  });
});

describe("invoice payment balance", () => {
  it("excludes reversed payments from paid total", () => {
    const total = sumConfirmedPaymentAmountMinor([
      {
        id: "1",
        key: "a",
        invoiceId: "inv",
        amountMinor: 10000,
        currency: "CHF",
        paymentDate: new Date(),
        method: "BANK_TRANSFER_MANUAL",
        reference: null,
        note: null,
        source: "MANUAL",
        status: "REVERSED",
        externalReference: null,
        bankTransactionId: null,
        reversedAt: new Date(),
        reversedByUserId: "u",
        reversalReason: "x",
        createdByUserId: "u",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        key: "b",
        invoiceId: "inv",
        amountMinor: 5000,
        currency: "CHF",
        paymentDate: new Date(),
        method: "BANK_TRANSFER_MANUAL",
        reference: null,
        note: null,
        source: "MANUAL",
        status: "CONFIRMED",
        externalReference: null,
        bankTransactionId: null,
        reversedAt: null,
        reversedByUserId: null,
        reversalReason: null,
        createdByUserId: "u",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    expect(total).toBe(5000);
  });
});
