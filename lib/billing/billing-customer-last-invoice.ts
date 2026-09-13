import type { InvoiceStatus } from "@prisma/client";
import { presentInvoiceDisplayNumber } from "@/lib/billing/native-billing-presentation";

export type CustomerLastInvoiceCandidate = {
  billingCustomerId: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  invoiceDate: Date | null;
  createdAt: Date;
};

export type CustomerLastInvoicePresentation = {
  label: string;
  date: string | null;
};

const EXCLUDED_LAST_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set(["VOID"]);

function invoiceSortKey(invoice: CustomerLastInvoiceCandidate): string {
  if (invoice.invoiceDate) {
    return invoice.invoiceDate.toISOString().slice(0, 10);
  }
  return invoice.createdAt.toISOString();
}

/**
 * Latest invoice shown in customer lists — excludes voided invoices so operational
 * views reflect the most recent non-void document.
 */
export function pickLatestCustomerLastInvoice(
  invoices: CustomerLastInvoiceCandidate[],
): Map<string, CustomerLastInvoicePresentation> {
  const byCustomer = new Map<string, CustomerLastInvoicePresentation>();

  for (const invoice of invoices) {
    if (EXCLUDED_LAST_INVOICE_STATUSES.has(invoice.status)) {
      continue;
    }
    const sortKey = invoiceSortKey(invoice);
    const existing = byCustomer.get(invoice.billingCustomerId);
    const existingDate = existing?.date ?? "";
    if (existing && existingDate >= sortKey) {
      continue;
    }
    byCustomer.set(invoice.billingCustomerId, {
      label: presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status),
      date: invoice.invoiceDate ? invoice.invoiceDate.toISOString().slice(0, 10) : null,
    });
  }

  return byCustomer;
}
