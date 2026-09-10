export type BillingSubscriptionSummary = {
  stripeSubscriptionId: string;
  status: string;
  planName: string | null;
  priceId: string | null;
  productId: string | null;
  unitAmount: number | null;
  currency: string | null;
  interval: string | null;
  intervalCount: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
};

export type BillingInvoiceSummary = {
  stripeInvoiceId: string;
  number: string | null;
  status: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

export type TenantBillingSummary = {
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  stripeCustomerId: string;
  subscriptions: BillingSubscriptionSummary[];
  latestInvoice: BillingInvoiceSummary | null;
  outstandingAmount: number;
  /** Open invoices with dueDate before now (from the open-invoice scan). */
  overdueOpenInvoiceCount: number;
  currency: string | null;
};

export type BillingInvoiceListPage = {
  invoices: BillingInvoiceSummary[];
  hasMore: boolean;
  nextCursor: string | null;
};

export const DEFAULT_BILLING_INVOICE_PAGE_SIZE = 25;

/**
 * Billing reads prefer fresh Stripe data. No durable cache or DB projection
 * is used in SCE-SUPERADMIN-BILLING-01C.
 */
