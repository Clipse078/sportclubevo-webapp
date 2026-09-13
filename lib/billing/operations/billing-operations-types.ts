import type { InvoiceDeliveryAggregateStatus } from "@/lib/billing/invoice-delivery/invoice-delivery-types";
import type { InvoiceStatus } from "@prisma/client";

export type BillingOperationsCurrencyMetrics = {
  currency: string;
  openReceivablesMinor: number;
  overdueReceivablesMinor: number;
  paidThisMonthMinor: number;
};

export type BillingOperationsSummaryMetrics = {
  activeCustomerCount: number;
  activeContractCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  attentionInvoiceCount: number;
  chf: BillingOperationsCurrencyMetrics;
};

export type BillingAttentionKind =
  | "INVOICE_OVERDUE"
  | "INVOICE_UNSENT"
  | "INVOICE_DELIVERY_FAILED"
  | "INVOICE_PARTIALLY_PAID"
  | "RECONCILIATION_UNMATCHED"
  | "RECONCILIATION_REVIEW_REQUIRED"
  | "CUSTOMER_MISSING_INVOICE_EMAIL"
  | "CONTRACT_CONFIGURATION";

export type BillingAttentionItem = {
  id: string;
  kind: BillingAttentionKind;
  priority: number;
  title: string;
  reason: string;
  actionLabel: string;
  href: string;
  customerKey: string | null;
  customerName: string | null;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  contractKey: string | null;
  amountMinor: number | null;
  currency: string | null;
  statusLabel: string | null;
  ageDate: string | null;
};

export type BillingActivityKind =
  | "INVOICE_FINALIZED"
  | "INVOICE_SENT"
  | "INVOICE_DELIVERY_FAILED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_REVERSED"
  | "CAMT054_IMPORTED"
  | "INVOICE_PAID"
  | "OTHER";

export type BillingActivityItem = {
  id: string;
  kind: BillingActivityKind;
  title: string;
  detail: string | null;
  occurredAt: string;
  href: string | null;
};

export type BillingReconciliationHealthSummary = {
  unmatchedTransactionCount: number;
  reviewRequiredTransactionCount: number;
  latestImportKey: string | null;
  latestImportFilename: string | null;
  latestImportUploadedAt: string | null;
  latestImportStatus: string | null;
  legalEntityKey: string | null;
  reconciliationHref: string;
};

export type BillingCustomerBalanceSummary = {
  customerId: string;
  customerKey: string;
  openBalanceMinor: number;
  overdueBalanceMinor: number;
  currency: string;
};

export type BillingInvoiceOperationalRow = {
  key: string;
  invoiceNumber: string | null;
  displayNumber: string;
  customerKey: string;
  customerLabel: string;
  invoiceDate: string | null;
  dueDate: string | null;
  grossTotalMinor: number;
  paidTotalMinor: number;
  outstandingMinor: number;
  currency: string;
  lifecycleStatus: InvoiceStatus;
  operationalStatus: InvoiceOperationalStatus;
  deliveryStatus: InvoiceDeliveryAggregateStatus;
};

export type InvoiceOperationalStatus =
  | "DRAFT"
  | "FINALIZED"
  | "OPEN"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "CREDITED";

export type BillingOperationsDashboard = {
  metrics: BillingOperationsSummaryMetrics;
  attention: BillingAttentionItem[];
  activity: BillingActivityItem[];
  reconciliation: BillingReconciliationHealthSummary;
  customerBalances: BillingCustomerBalanceSummary[];
};
