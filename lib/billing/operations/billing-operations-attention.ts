import { calculateOutstandingMinor } from "@/lib/billing/invoice-payments/invoice-payment-balance";
import type { InvoiceDeliveryAggregateStatus } from "@/lib/billing/invoice-delivery/invoice-delivery-types";
import type { InvoiceStatus } from "@prisma/client";
import {
  isInvoiceOverdueForMetrics,
  RECEIVABLE_INVOICE_STATUSES,
} from "./billing-operations-metrics";
import type { BillingAttentionItem } from "./billing-operations-types";

export type AttentionInvoiceInput = {
  id: string;
  key: string;
  invoiceNumber: string | null;
  billingCustomerId: string;
  status: InvoiceStatus;
  currency: string;
  grossTotalMinor: number;
  dueDate: Date | null;
  finalizedAt: Date | null;
  paidTotalMinor: number;
  deliveryStatus: InvoiceDeliveryAggregateStatus;
};

export type AttentionCustomerInput = {
  id: string;
  key: string;
  displayName: string;
  primaryEmail: string | null;
  hasOpenReceivable: boolean;
};

export type AttentionContractInput = {
  key: string;
  contractNumber: string;
  customerKey: string;
  customerName: string;
  status: string;
  invoiceRecipientProfileId: string | null;
};

export type AttentionReconciliationInput = {
  transactionKey: string;
  matchStatus: "UNMATCHED" | "REVIEW_REQUIRED";
  amountMinor: number;
  currency: string;
  paymentDate: Date;
  importKey: string;
  legalEntityKey: string;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  matchReason: string | null;
};

const PRIORITY = {
  INVOICE_OVERDUE: 10,
  INVOICE_DELIVERY_FAILED: 20,
  RECONCILIATION_REVIEW_REQUIRED: 30,
  RECONCILIATION_UNMATCHED: 40,
  INVOICE_PARTIALLY_PAID: 50,
  INVOICE_UNSENT: 60,
  CUSTOMER_MISSING_INVOICE_EMAIL: 70,
  CONTRACT_CONFIGURATION: 80,
} as const;

function invoiceHref(key: string): string {
  return `/dashboard/admin/commercial/billing/invoices/${key}`;
}

function customerHref(key: string): string {
  return `/dashboard/admin/commercial/billing/customers/${key}`;
}

function contractHref(key: string): string {
  return `/dashboard/admin/commercial/billing/contracts/${key}`;
}

function reconciliationHref(legalEntityKey: string, importKey?: string): string {
  if (importKey) {
    return `/dashboard/admin/commercial/billing/reconciliation/imports/${importKey}`;
  }
  return `/dashboard/admin/commercial/billing/reconciliation`;
}

export function buildBillingAttentionQueue(input: {
  invoices: AttentionInvoiceInput[];
  customers: AttentionCustomerInput[];
  contracts: AttentionContractInput[];
  reconciliationTransactions: AttentionReconciliationInput[];
  customerKeyById: Map<string, string>;
  customerNameById: Map<string, string>;
  referenceDate: Date;
}): BillingAttentionItem[] {
  const items: BillingAttentionItem[] = [];

  for (const invoice of input.invoices) {
    const outstanding = calculateOutstandingMinor(
      invoice.grossTotalMinor,
      invoice.paidTotalMinor,
    );
    const customerKey = input.customerKeyById.get(invoice.billingCustomerId) ?? null;
    const customerName = input.customerNameById.get(invoice.billingCustomerId) ?? null;
    const dueIso = invoice.dueDate?.toISOString().slice(0, 10) ?? null;

    if (
      isInvoiceOverdueForMetrics(
        {
          id: invoice.id,
          billingCustomerId: invoice.billingCustomerId,
          status: invoice.status,
          currency: invoice.currency,
          grossTotalMinor: invoice.grossTotalMinor,
          dueDate: invoice.dueDate,
          paidTotalMinor: invoice.paidTotalMinor,
        },
        outstanding,
        input.referenceDate,
      )
    ) {
      items.push({
        id: `overdue:${invoice.key}`,
        kind: "INVOICE_OVERDUE",
        priority: PRIORITY.INVOICE_OVERDUE,
        title: invoice.invoiceNumber ? `Rechnung ${invoice.invoiceNumber}` : "Rechnung überfällig",
        reason: "Fälligkeit überschritten — offener Betrag ausstehend",
        actionLabel: "Rechnung öffnen",
        href: invoiceHref(invoice.key),
        customerKey,
        customerName,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        contractKey: null,
        amountMinor: outstanding,
        currency: invoice.currency,
        statusLabel: "Überfällig",
        ageDate: dueIso,
      });
    }

    if (invoice.deliveryStatus === "FAILED") {
      items.push({
        id: `delivery-failed:${invoice.key}`,
        kind: "INVOICE_DELIVERY_FAILED",
        priority: PRIORITY.INVOICE_DELIVERY_FAILED,
        title: invoice.invoiceNumber
          ? `Versand fehlgeschlagen — ${invoice.invoiceNumber}`
          : "Rechnungsversand fehlgeschlagen",
        reason: "E-Mail-Zustellung nicht erfolgreich",
        actionLabel: "Versand prüfen",
        href: invoiceHref(invoice.key),
        customerKey,
        customerName,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        contractKey: null,
        amountMinor: outstanding > 0 ? outstanding : invoice.grossTotalMinor,
        currency: invoice.currency,
        statusLabel: "Versand fehlgeschlagen",
        ageDate: dueIso,
      });
    }

    const isFinalizedPayable =
      invoice.finalizedAt &&
      RECEIVABLE_INVOICE_STATUSES.has(invoice.status) &&
      invoice.deliveryStatus === "NOT_SENT";

    if (isFinalizedPayable) {
      items.push({
        id: `unsent:${invoice.key}`,
        kind: "INVOICE_UNSENT",
        priority: PRIORITY.INVOICE_UNSENT,
        title: invoice.invoiceNumber
          ? `Nicht versendet — ${invoice.invoiceNumber}`
          : "Rechnung nicht versendet",
        reason: "Finalisierte Rechnung wurde noch nicht per E-Mail versendet",
        actionLabel: "Rechnung senden",
        href: invoiceHref(invoice.key),
        customerKey,
        customerName,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        contractKey: null,
        amountMinor: invoice.grossTotalMinor,
        currency: invoice.currency,
        statusLabel: "Nicht versendet",
        ageDate: invoice.finalizedAt?.toISOString().slice(0, 10) ?? null,
      });
    }

    if (invoice.status === "PARTIALLY_PAID" && outstanding > 0) {
      items.push({
        id: `partial:${invoice.key}`,
        kind: "INVOICE_PARTIALLY_PAID",
        priority: PRIORITY.INVOICE_PARTIALLY_PAID,
        title: invoice.invoiceNumber
          ? `Teilbezahlt — ${invoice.invoiceNumber}`
          : "Rechnung teilbezahlt",
        reason: "Offener Restbetrag nach Teilzahlung",
        actionLabel: "Zahlung prüfen",
        href: invoiceHref(invoice.key),
        customerKey,
        customerName,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        contractKey: null,
        amountMinor: outstanding,
        currency: invoice.currency,
        statusLabel: "Teilbezahlt",
        ageDate: dueIso,
      });
    }
  }

  for (const tx of input.reconciliationTransactions) {
    if (tx.matchStatus === "REVIEW_REQUIRED") {
      items.push({
        id: `recon-review:${tx.transactionKey}`,
        kind: "RECONCILIATION_REVIEW_REQUIRED",
        priority: PRIORITY.RECONCILIATION_REVIEW_REQUIRED,
        title: "Banktransaktion — Prüfung erforderlich",
        reason: tx.matchReason ?? "Zuordnung erfordert manuelle Prüfung",
        actionLabel: "Abgleich öffnen",
        href: reconciliationHref(tx.legalEntityKey, tx.importKey),
        customerKey: null,
        customerName: null,
        invoiceKey: tx.invoiceKey,
        invoiceNumber: tx.invoiceNumber,
        contractKey: null,
        amountMinor: tx.amountMinor,
        currency: tx.currency,
        statusLabel: "Prüfung erforderlich",
        ageDate: tx.paymentDate.toISOString().slice(0, 10),
      });
    }
    if (tx.matchStatus === "UNMATCHED") {
      items.push({
        id: `recon-unmatched:${tx.transactionKey}`,
        kind: "RECONCILIATION_UNMATCHED",
        priority: PRIORITY.RECONCILIATION_UNMATCHED,
        title: "Banktransaktion — nicht zugeordnet",
        reason: tx.matchReason ?? "Keine passende Rechnung gefunden",
        actionLabel: "Zuordnen",
        href: reconciliationHref(tx.legalEntityKey, tx.importKey),
        customerKey: null,
        customerName: null,
        invoiceKey: tx.invoiceKey,
        invoiceNumber: tx.invoiceNumber,
        contractKey: null,
        amountMinor: tx.amountMinor,
        currency: tx.currency,
        statusLabel: "Nicht zugeordnet",
        ageDate: tx.paymentDate.toISOString().slice(0, 10),
      });
    }
  }

  for (const customer of input.customers) {
    if (customer.hasOpenReceivable && !customer.primaryEmail?.trim()) {
      items.push({
        id: `customer-email:${customer.key}`,
        kind: "CUSTOMER_MISSING_INVOICE_EMAIL",
        priority: PRIORITY.CUSTOMER_MISSING_INVOICE_EMAIL,
        title: `Rechnungs-E-Mail fehlt — ${customer.displayName}`,
        reason: "Offene Forderungen, aber keine Rechnungs-E-Mail hinterlegt",
        actionLabel: "Kunde bearbeiten",
        href: customerHref(customer.key),
        customerKey: customer.key,
        customerName: customer.displayName,
        invoiceKey: null,
        invoiceNumber: null,
        contractKey: null,
        amountMinor: null,
        currency: null,
        statusLabel: "Konfiguration",
        ageDate: null,
      });
    }
  }

  for (const contract of input.contracts) {
    if (contract.status !== "ACTIVE") continue;
    if (!contract.invoiceRecipientProfileId) {
      items.push({
        id: `contract-config:${contract.key}`,
        kind: "CONTRACT_CONFIGURATION",
        priority: PRIORITY.CONTRACT_CONFIGURATION,
        title: `Vertrag ${contract.contractNumber}`,
        reason: "Aktiver Vertrag ohne Rechnungsempfänger-Profil",
        actionLabel: "Vertrag öffnen",
        href: contractHref(contract.key),
        customerKey: contract.customerKey,
        customerName: contract.customerName,
        invoiceKey: null,
        invoiceNumber: null,
        contractKey: contract.key,
        amountMinor: null,
        currency: null,
        statusLabel: "Konfiguration",
        ageDate: null,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, "de"));
}
