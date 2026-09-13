import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildBillingAttentionQueue } from "../billing-operations-attention";
import {
  aggregateCustomerBalances,
  buildSummaryMetrics,
  isInvoiceOverdueForMetrics,
  resolveInvoiceOperationalStatus,
} from "../billing-operations-metrics";
import type { InvoiceMetricsInput } from "../billing-operations-metrics";

const mocks = vi.hoisted(() => ({
  billingCustomerCount: vi.fn(),
  billingContractCount: vi.fn(),
  invoiceFindMany: vi.fn(),
  billingCustomerFindMany: vi.fn(),
  billingContractFindMany: vi.fn(),
  invoicePaymentGroupBy: vi.fn(),
  invoicePaymentAggregate: vi.fn(),
  bankReconciliationTransactionCount: vi.fn(),
  bankReconciliationTransactionFindMany: vi.fn(),
  bankReconciliationImportFindFirst: vi.fn(),
  legalEntityFindFirst: vi.fn(),
  legalEntityFindUnique: vi.fn(),
  legalEntityFindMany: vi.fn(),
  invoiceDeliveryFindMany: vi.fn(),
  auditLogFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    billingCustomer: { count: mocks.billingCustomerCount, findMany: mocks.billingCustomerFindMany },
    billingContract: { count: mocks.billingContractCount, findMany: mocks.billingContractFindMany },
    invoice: { findMany: mocks.invoiceFindMany },
    invoicePayment: {
      groupBy: mocks.invoicePaymentGroupBy,
      aggregate: mocks.invoicePaymentAggregate,
    },
    bankReconciliationTransaction: {
      count: mocks.bankReconciliationTransactionCount,
      findMany: mocks.bankReconciliationTransactionFindMany,
    },
    bankReconciliationImport: { findFirst: mocks.bankReconciliationImportFindFirst },
    legalEntity: {
      findFirst: mocks.legalEntityFindFirst,
      findUnique: mocks.legalEntityFindUnique,
      findMany: mocks.legalEntityFindMany,
    },
    invoiceDelivery: { findMany: mocks.invoiceDeliveryFindMany },
    auditLog: { findMany: mocks.auditLogFindMany },
  },
}));

const { getBillingOperationsDashboard } = await import("../billing-operations-service");

const REF = new Date("2026-09-15T12:00:00.000Z");

function invoiceRow(overrides: Partial<InvoiceMetricsInput> & { id: string }): InvoiceMetricsInput {
  return {
    billingCustomerId: "cust-a",
    status: "OPEN",
    currency: "CHF",
    grossTotalMinor: 10_000,
    dueDate: new Date("2026-09-01"),
    paidTotalMinor: 0,
    ...overrides,
  };
}

describe("billing operations metrics", () => {
  it("computes open and overdue receivables in minor units", () => {
    const metrics = buildSummaryMetrics({
      activeCustomerCount: 2,
      activeContractCount: 1,
      paidThisMonthMinorChf: 5000,
      attentionInvoiceCount: 0,
      referenceDate: REF,
      invoices: [
        invoiceRow({ id: "1", grossTotalMinor: 20_000, paidTotalMinor: 5_000, status: "PARTIALLY_PAID" }),
        invoiceRow({ id: "2", grossTotalMinor: 10_000, status: "OVERDUE" }),
        invoiceRow({ id: "3", grossTotalMinor: 99_00, status: "PAID", paidTotalMinor: 99_00 }),
        invoiceRow({ id: "4", grossTotalMinor: 50_00, status: "VOID" }),
      ],
    });
    expect(metrics.chf.openReceivablesMinor).toBe(25_000);
    expect(metrics.chf.overdueReceivablesMinor).toBe(25_000);
    expect(metrics.openInvoiceCount).toBe(2);
    expect(metrics.overdueInvoiceCount).toBe(2);
    expect(metrics.chf.paidThisMonthMinor).toBe(5000);
  });

  it("excludes fully paid and void invoices from open receivables", () => {
    const metrics = buildSummaryMetrics({
      activeCustomerCount: 1,
      activeContractCount: 1,
      paidThisMonthMinorChf: 0,
      attentionInvoiceCount: 0,
      referenceDate: REF,
      invoices: [
        invoiceRow({ id: "paid", status: "PAID", paidTotalMinor: 10_000 }),
        invoiceRow({ id: "void", status: "VOID" }),
      ],
    });
    expect(metrics.chf.openReceivablesMinor).toBe(0);
    expect(metrics.openInvoiceCount).toBe(0);
  });

  it("resolves operational status for partially paid invoice", () => {
    expect(resolveInvoiceOperationalStatus("PARTIALLY_PAID", 5000, 5000)).toBe("PARTIALLY_PAID");
    expect(resolveInvoiceOperationalStatus("OPEN", 0, 10_000)).toBe("PAID");
  });

  it("aggregates customer open and overdue balances", () => {
    const customerKeyById = new Map([
      ["cust-a", "customer-a"],
      ["cust-b", "customer-b"],
    ]);
    const balances = aggregateCustomerBalances(
      [
        invoiceRow({ id: "1", billingCustomerId: "cust-a", grossTotalMinor: 10_000 }),
        invoiceRow({ id: "2", billingCustomerId: "cust-b", grossTotalMinor: 8_000, status: "OPEN" }),
      ],
      customerKeyById,
      REF,
    );
    expect(balances).toHaveLength(2);
    const a = balances.find((b) => b.customerKey === "customer-a");
    expect(a?.openBalanceMinor).toBe(10_000);
    expect(a?.overdueBalanceMinor).toBe(10_000);
  });

  it("isolates customers — no cross-customer balance bleed", () => {
    const customerKeyById = new Map([["cust-a", "a"], ["cust-b", "b"]]);
    const balances = aggregateCustomerBalances(
      [invoiceRow({ id: "1", billingCustomerId: "cust-a", grossTotalMinor: 1000 })],
      customerKeyById,
      REF,
    );
    expect(balances).toHaveLength(1);
    expect(balances[0]?.customerKey).toBe("a");
  });
});

describe("billing attention queue", () => {
  it("prioritizes overdue before unsent and reconciliation items", () => {
    const queue = buildBillingAttentionQueue({
      referenceDate: REF,
      customerKeyById: new Map([["c1", "customer-1"]]),
      customerNameById: new Map([["c1", "Club A"]]),
      invoices: [
        {
          id: "i1",
          key: "inv-open",
          invoiceNumber: "2026-000010",
          billingCustomerId: "c1",
          status: "OPEN",
          currency: "CHF",
          grossTotalMinor: 5000,
          dueDate: new Date("2026-09-01"),
          finalizedAt: new Date("2026-09-05"),
          paidTotalMinor: 0,
          deliveryStatus: "NOT_SENT",
        },
        {
          id: "i2",
          key: "inv-overdue",
          invoiceNumber: "2026-000011",
          billingCustomerId: "c1",
          status: "OVERDUE",
          currency: "CHF",
          grossTotalMinor: 8000,
          dueDate: new Date("2026-08-01"),
          finalizedAt: new Date("2026-08-01"),
          paidTotalMinor: 0,
          deliveryStatus: "SENT",
        },
      ],
      customers: [],
      contracts: [],
      reconciliationTransactions: [
        {
          transactionKey: "tx-1",
          matchStatus: "UNMATCHED",
          amountMinor: 1000,
          currency: "CHF",
          paymentDate: new Date("2026-09-10"),
          importKey: "imp-1",
          legalEntityKey: "le-1",
          invoiceKey: null,
          invoiceNumber: null,
          matchReason: null,
        },
      ],
    });
    expect(queue[0]?.kind).toBe("INVOICE_OVERDUE");
    expect(queue.some((q) => q.kind === "INVOICE_UNSENT")).toBe(true);
    expect(queue.some((q) => q.kind === "RECONCILIATION_UNMATCHED")).toBe(true);
    expect(queue[0]!.priority).toBeLessThan(
      queue.find((q) => q.kind === "RECONCILIATION_UNMATCHED")!.priority,
    );
  });

  it("surfaces delivery failure and partial payment", () => {
    const queue = buildBillingAttentionQueue({
      referenceDate: REF,
      customerKeyById: new Map([["c1", "customer-1"]]),
      customerNameById: new Map([["c1", "Club A"]]),
      invoices: [
        {
          id: "i3",
          key: "inv-failed",
          invoiceNumber: "2026-000012",
          billingCustomerId: "c1",
          status: "OPEN",
          currency: "CHF",
          grossTotalMinor: 10_000,
          dueDate: new Date("2026-10-01"),
          finalizedAt: new Date("2026-09-01"),
          paidTotalMinor: 0,
          deliveryStatus: "FAILED",
        },
        {
          id: "i4",
          key: "inv-partial",
          invoiceNumber: "2026-000013",
          billingCustomerId: "c1",
          status: "PARTIALLY_PAID",
          currency: "CHF",
          grossTotalMinor: 10_000,
          dueDate: new Date("2026-10-01"),
          finalizedAt: new Date("2026-09-01"),
          paidTotalMinor: 3000,
          deliveryStatus: "SENT",
        },
      ],
      customers: [],
      contracts: [],
      reconciliationTransactions: [],
    });
    expect(queue.some((q) => q.kind === "INVOICE_DELIVERY_FAILED")).toBe(true);
    expect(queue.some((q) => q.kind === "INVOICE_PARTIALLY_PAID")).toBe(true);
  });

  it("surfaces reconciliation review required", () => {
    const queue = buildBillingAttentionQueue({
      referenceDate: REF,
      customerKeyById: new Map(),
      customerNameById: new Map(),
      invoices: [],
      customers: [],
      contracts: [],
      reconciliationTransactions: [
        {
          transactionKey: "tx-review",
          matchStatus: "REVIEW_REQUIRED",
          amountMinor: 2000,
          currency: "CHF",
          paymentDate: new Date("2026-09-12"),
          importKey: "imp-2",
          legalEntityKey: "le-1",
          invoiceKey: "inv-x",
          invoiceNumber: "2026-000099",
          matchReason: "Überzahlung",
        },
      ],
    });
    expect(queue[0]?.kind).toBe("RECONCILIATION_REVIEW_REQUIRED");
  });
});

describe("getBillingOperationsDashboard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.billingCustomerCount.mockResolvedValue(1);
    mocks.billingContractCount.mockResolvedValue(1);
    mocks.billingCustomerFindMany.mockResolvedValue([
      { id: "c1", key: "customer-1", displayName: "Test Club", primaryEmail: "billing@test.ch" },
    ]);
    mocks.billingContractFindMany.mockResolvedValue([]);
    mocks.invoicePaymentGroupBy.mockResolvedValue([]);
    mocks.invoicePaymentAggregate.mockResolvedValue({ _sum: { amountMinor: 0 } });
    mocks.bankReconciliationTransactionCount.mockResolvedValue(0);
    mocks.bankReconciliationTransactionFindMany.mockResolvedValue([]);
    mocks.bankReconciliationImportFindFirst.mockResolvedValue(null);
    mocks.legalEntityFindFirst.mockResolvedValue({ key: "le-1" });
    mocks.invoiceDeliveryFindMany.mockResolvedValue([]);
    mocks.auditLogFindMany.mockResolvedValue([]);
  });

  it("returns empty-state metrics when no invoices", async () => {
    mocks.invoiceFindMany.mockResolvedValue([]);
    const dashboard = await getBillingOperationsDashboard(REF);
    expect(dashboard.metrics.activeCustomerCount).toBe(1);
    expect(dashboard.metrics.chf.openReceivablesMinor).toBe(0);
    expect(dashboard.attention).toEqual([]);
    expect(dashboard.activity).toEqual([]);
  });

  it("does not hardcode FCA — uses actual customer keys from data", async () => {
    mocks.invoiceFindMany.mockResolvedValue([
      {
        id: "inv-id",
        key: "inv-key-99",
        invoiceNumber: "2026-000099",
        billingCustomerId: "c1",
        status: "OPEN",
        currency: "CHF",
        grossTotalMinor: 1000,
        dueDate: new Date("2026-10-01"),
        finalizedAt: new Date("2026-09-01"),
        invoiceDate: new Date("2026-09-01"),
      },
    ]);
    const dashboard = await getBillingOperationsDashboard(REF);
    const unsent = dashboard.attention.find((a) => a.kind === "INVOICE_UNSENT");
    expect(unsent?.customerKey).toBe("customer-1");
    expect(JSON.stringify(dashboard)).not.toContain("fc-allschwil");
    expect(JSON.stringify(dashboard)).not.toContain("2026-000002");
  });
});

describe("isInvoiceOverdueForMetrics", () => {
  it("marks open invoice past due date as overdue", () => {
    const overdue = isInvoiceOverdueForMetrics(
      invoiceRow({ id: "x", status: "OPEN", dueDate: new Date("2026-09-01") }),
      1000,
      REF,
    );
    expect(overdue).toBe(true);
  });
});
