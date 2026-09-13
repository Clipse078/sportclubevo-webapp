import type { InvoiceDeliveryAggregateStatus } from "@/lib/billing/invoice-delivery/invoice-delivery-types";
import { deriveInvoiceDeliveryAggregateStatus } from "@/lib/billing/invoice-delivery/invoice-delivery-summary";
import type { InvoiceDeliveryRecord } from "@/lib/billing/invoice-delivery/invoice-delivery-types";
import { prisma } from "@/lib/db/prisma";
import { presentInvoiceDisplayNumber } from "@/lib/billing/native-billing-presentation";
import {
  buildBillingAttentionQueue,
  type AttentionContractInput,
  type AttentionCustomerInput,
  type AttentionInvoiceInput,
  type AttentionReconciliationInput,
} from "./billing-operations-attention";
import {
  billingActivityModuleFilter,
  BILLING_ACTIVITY_AUDIT_ACTIONS,
  mapAuditLogToBillingActivity,
} from "./billing-operations-activity";
import {
  aggregateCustomerBalances,
  buildSummaryMetrics,
  endOfUtcMonth,
  resolveInvoiceOperationalStatus,
  startOfUtcMonth,
  type InvoiceMetricsInput,
} from "./billing-operations-metrics";
import type {
  BillingInvoiceOperationalRow,
  BillingOperationsDashboard,
  BillingReconciliationHealthSummary,
} from "./billing-operations-types";

const RECONCILIATION_ATTENTION_LIMIT = 40;

async function loadPaidTotalsByInvoiceId(): Promise<Map<string, number>> {
  const groups = await prisma.invoicePayment.groupBy({
    by: ["invoiceId"],
    where: { status: "CONFIRMED" },
    _sum: { amountMinor: true },
  });
  const map = new Map<string, number>();
  for (const row of groups) {
    map.set(row.invoiceId, row._sum.amountMinor ?? 0);
  }
  return map;
}

async function loadDeliveryStatusByInvoiceId(
  invoiceIds: string[],
): Promise<Map<string, InvoiceDeliveryAggregateStatus>> {
  if (invoiceIds.length === 0) return new Map();

  const deliveries = await prisma.invoiceDelivery.findMany({
    where: { invoiceId: { in: invoiceIds } },
    orderBy: [{ invoiceId: "asc" }, { attemptNumber: "desc" }],
  });

  const byInvoice = new Map<string, InvoiceDeliveryRecord[]>();
  for (const delivery of deliveries) {
    const list = byInvoice.get(delivery.invoiceId) ?? [];
    list.push({
      ...delivery,
      channel: "EMAIL",
    });
    byInvoice.set(delivery.invoiceId, list);
  }

  const result = new Map<string, InvoiceDeliveryAggregateStatus>();
  for (const [invoiceId, attempts] of byInvoice) {
    result.set(invoiceId, deriveInvoiceDeliveryAggregateStatus(attempts));
  }
  return result;
}

async function loadPaidThisMonthChf(referenceDate: Date): Promise<number> {
  const monthStart = startOfUtcMonth(referenceDate);
  const monthEnd = endOfUtcMonth(referenceDate);
  const agg = await prisma.invoicePayment.aggregate({
    where: {
      status: "CONFIRMED",
      currency: "CHF",
      paymentDate: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor ?? 0;
}

async function loadReconciliationSummary(): Promise<BillingReconciliationHealthSummary> {
  const [unmatchedTransactionCount, reviewRequiredTransactionCount, latestImport, primaryEntity] =
    await Promise.all([
      prisma.bankReconciliationTransaction.count({
        where: { matchStatus: "UNMATCHED" },
      }),
      prisma.bankReconciliationTransaction.count({
        where: { matchStatus: "REVIEW_REQUIRED" },
      }),
      prisma.bankReconciliationImport.findFirst({
        orderBy: { uploadedAt: "desc" },
        select: {
          key: true,
          filename: true,
          uploadedAt: true,
          status: true,
          legalEntityId: true,
        },
      }),
      prisma.legalEntity.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { key: true },
      }),
    ]);

  let legalEntityKey = primaryEntity?.key ?? null;
  if (latestImport) {
    const entity = await prisma.legalEntity.findUnique({
      where: { id: latestImport.legalEntityId },
      select: { key: true },
    });
    legalEntityKey = entity?.key ?? legalEntityKey;
  }

  return {
    unmatchedTransactionCount,
    reviewRequiredTransactionCount,
    latestImportKey: latestImport?.key ?? null,
    latestImportFilename: latestImport?.filename ?? null,
    latestImportUploadedAt: latestImport?.uploadedAt.toISOString() ?? null,
    latestImportStatus: latestImport?.status ?? null,
    legalEntityKey,
    reconciliationHref: "/dashboard/admin/commercial/billing/reconciliation",
  };
}

async function loadReconciliationAttentionRows(): Promise<AttentionReconciliationInput[]> {
  const rows = await prisma.bankReconciliationTransaction.findMany({
    where: { matchStatus: { in: ["UNMATCHED", "REVIEW_REQUIRED"] } },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    take: RECONCILIATION_ATTENTION_LIMIT,
    select: {
      key: true,
      matchStatus: true,
      amountMinor: true,
      currency: true,
      paymentDate: true,
      matchReason: true,
      invoiceId: true,
      import: { select: { key: true, legalEntityId: true } },
    },
  });

  const invoiceIds = rows.map((r) => r.invoiceId).filter(Boolean) as string[];
  const invoices =
    invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, key: true, invoiceNumber: true },
        })
      : [];
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));

  const legalEntityIds = [...new Set(rows.map((r) => r.import.legalEntityId))];
  const entities =
    legalEntityIds.length > 0
      ? await prisma.legalEntity.findMany({
          where: { id: { in: legalEntityIds } },
          select: { id: true, key: true },
        })
      : [];
  const entityKeyById = new Map(entities.map((e) => [e.id, e.key]));

  return rows.map((row) => {
    const invoice = row.invoiceId ? invoiceById.get(row.invoiceId) : undefined;
    return {
      transactionKey: row.key,
      matchStatus: row.matchStatus as "UNMATCHED" | "REVIEW_REQUIRED",
      amountMinor: row.amountMinor,
      currency: row.currency,
      paymentDate: row.paymentDate,
      importKey: row.import.key,
      legalEntityKey: entityKeyById.get(row.import.legalEntityId) ?? "",
      invoiceKey: invoice?.key ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      matchReason: row.matchReason,
    };
  });
}

export async function getBillingOperationsDashboard(
  referenceDate: Date = new Date(),
): Promise<BillingOperationsDashboard> {
  const [
    activeCustomerCount,
    activeContractCount,
    invoices,
    customers,
    contracts,
    paidByInvoiceId,
    paidThisMonthMinorChf,
    reconciliation,
    reconciliationAttention,
    auditRows,
  ] = await Promise.all([
    prisma.billingCustomer.count({ where: { status: "ACTIVE" } }),
    prisma.billingContract.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({
      select: {
        id: true,
        key: true,
        invoiceNumber: true,
        billingCustomerId: true,
        status: true,
        currency: true,
        grossTotalMinor: true,
        dueDate: true,
        finalizedAt: true,
        invoiceDate: true,
      },
    }),
    prisma.billingCustomer.findMany({
      select: {
        id: true,
        key: true,
        displayName: true,
        primaryEmail: true,
      },
    }),
    prisma.billingContract.findMany({
      where: { status: "ACTIVE" },
      select: {
        key: true,
        contractNumber: true,
        billingCustomerId: true,
        status: true,
        invoiceRecipientProfileId: true,
      },
    }),
    loadPaidTotalsByInvoiceId(),
    loadPaidThisMonthChf(referenceDate),
    loadReconciliationSummary(),
    loadReconciliationAttentionRows(),
    prisma.auditLog.findMany({
      where: {
        ...billingActivityModuleFilter(),
        action: { in: [...BILLING_ACTIVITY_AUDIT_ACTIONS] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        afterJson: true,
        createdAt: true,
      },
    }),
  ]);

  const customerKeyById = new Map(customers.map((c) => [c.id, c.key]));
  const customerNameById = new Map(customers.map((c) => [c.id, c.displayName]));

  const invoiceMetrics: InvoiceMetricsInput[] = invoices.map((invoice) => ({
    id: invoice.id,
    billingCustomerId: invoice.billingCustomerId,
    status: invoice.status,
    currency: invoice.currency,
    grossTotalMinor: invoice.grossTotalMinor,
    dueDate: invoice.dueDate,
    paidTotalMinor: paidByInvoiceId.get(invoice.id) ?? 0,
  }));

  const deliveryStatuses = await loadDeliveryStatusByInvoiceId(invoices.map((i) => i.id));

  const attentionInvoices: AttentionInvoiceInput[] = invoices.map((invoice) => ({
    id: invoice.id,
    key: invoice.key,
    invoiceNumber: invoice.invoiceNumber,
    billingCustomerId: invoice.billingCustomerId,
    status: invoice.status,
    currency: invoice.currency,
    grossTotalMinor: invoice.grossTotalMinor,
    dueDate: invoice.dueDate,
    finalizedAt: invoice.finalizedAt,
    paidTotalMinor: paidByInvoiceId.get(invoice.id) ?? 0,
    deliveryStatus: deliveryStatuses.get(invoice.id) ?? "NOT_SENT",
  }));

  const customersWithOpen = new Set<string>();
  for (const inv of invoiceMetrics) {
    const outstanding = Math.max(0, inv.grossTotalMinor - inv.paidTotalMinor);
    if (outstanding > 0 && inv.status !== "VOID" && inv.status !== "DRAFT" && inv.status !== "PAID") {
      customersWithOpen.add(inv.billingCustomerId);
    }
  }

  const attentionCustomers: AttentionCustomerInput[] = customers.map((c) => ({
    id: c.id,
    key: c.key,
    displayName: c.displayName,
    primaryEmail: c.primaryEmail,
    hasOpenReceivable: customersWithOpen.has(c.id),
  }));

  const attentionContracts: AttentionContractInput[] = contracts.map((c) => ({
    key: c.key,
    contractNumber: c.contractNumber,
    customerKey: customerKeyById.get(c.billingCustomerId) ?? c.billingCustomerId,
    customerName: customerNameById.get(c.billingCustomerId) ?? "—",
    status: c.status,
    invoiceRecipientProfileId: c.invoiceRecipientProfileId,
  }));

  const attention = buildBillingAttentionQueue({
    invoices: attentionInvoices,
    customers: attentionCustomers,
    contracts: attentionContracts,
    reconciliationTransactions: reconciliationAttention,
    customerKeyById,
    customerNameById,
    referenceDate,
  });

  const attentionInvoiceCount = attention.length;

  const metrics = buildSummaryMetrics({
    activeCustomerCount,
    activeContractCount,
    invoices: invoiceMetrics,
    paidThisMonthMinorChf,
    attentionInvoiceCount,
    referenceDate,
  });

  const activity = auditRows.map(mapAuditLogToBillingActivity);

  const customerBalances = aggregateCustomerBalances(
    invoiceMetrics,
    customerKeyById,
    referenceDate,
  );

  return {
    metrics,
    attention,
    activity,
    reconciliation,
    customerBalances,
  };
}

export async function getBillingCustomerBalanceSummaries(
  referenceDate: Date = new Date(),
): Promise<BillingOperationsDashboard["customerBalances"]> {
  const [invoices, customers, paidByInvoiceId] = await Promise.all([
    prisma.invoice.findMany({
      select: {
        id: true,
        billingCustomerId: true,
        status: true,
        currency: true,
        grossTotalMinor: true,
        dueDate: true,
      },
    }),
    prisma.billingCustomer.findMany({ select: { id: true, key: true } }),
    loadPaidTotalsByInvoiceId(),
  ]);

  const customerKeyById = new Map(customers.map((c) => [c.id, c.key]));
  const invoiceMetrics: InvoiceMetricsInput[] = invoices.map((invoice) => ({
    id: invoice.id,
    billingCustomerId: invoice.billingCustomerId,
    status: invoice.status,
    currency: invoice.currency,
    grossTotalMinor: invoice.grossTotalMinor,
    dueDate: invoice.dueDate,
    paidTotalMinor: paidByInvoiceId.get(invoice.id) ?? 0,
  }));

  return aggregateCustomerBalances(invoiceMetrics, customerKeyById, referenceDate);
}

export async function getBillingInvoiceOperationalRows(): Promise<BillingInvoiceOperationalRow[]> {
  const [invoices, customers, paidByInvoiceId] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        key: true,
        invoiceNumber: true,
        billingCustomerId: true,
        status: true,
        currency: true,
        grossTotalMinor: true,
        invoiceDate: true,
        dueDate: true,
      },
    }),
    prisma.billingCustomer.findMany({
      select: { id: true, key: true, displayName: true },
    }),
    loadPaidTotalsByInvoiceId(),
  ]);

  const deliveryStatuses = await loadDeliveryStatusByInvoiceId(invoices.map((i) => i.id));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return invoices.map((invoice) => {
    const paidTotalMinor = paidByInvoiceId.get(invoice.id) ?? 0;
    const outstandingMinor = Math.max(0, invoice.grossTotalMinor - paidTotalMinor);
    const customer = customerById.get(invoice.billingCustomerId);
    return {
      key: invoice.key,
      invoiceNumber: invoice.invoiceNumber,
      displayNumber: presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status),
      customerKey: customer?.key ?? invoice.billingCustomerId,
      customerLabel: customer?.displayName ?? invoice.billingCustomerId,
      invoiceDate: invoice.invoiceDate?.toISOString().slice(0, 10) ?? null,
      dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
      grossTotalMinor: invoice.grossTotalMinor,
      paidTotalMinor,
      outstandingMinor,
      currency: invoice.currency,
      lifecycleStatus: invoice.status,
      operationalStatus: resolveInvoiceOperationalStatus(
        invoice.status,
        outstandingMinor,
        paidTotalMinor,
      ),
      deliveryStatus: deliveryStatuses.get(invoice.id) ?? "NOT_SENT",
    };
  });
}
