import { formatBillingMoney } from "./format-billing-money";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
  presentBillingInterval,
  presentBillingContractStatus,
  presentInvoiceDisplayNumber,
  presentNativeInvoiceStatus,
  presentSwissVatTreatment,
} from "./native-billing-presentation";
import type {
  BillingContractRecord,
  BillingProductRecord,
  InvoiceIssuerSnapshotRecord,
  InvoiceLineRecord,
  InvoiceRecipientSnapshotRecord,
  InvoiceRecord,
  InvoiceTaxSnapshotRecord,
} from "./native-billing-commercial-types";

export function serializeBillingProduct(product: BillingProductRecord) {
  return {
    id: product.id,
    key: product.key,
    name: product.name,
    description: product.description,
    catalogueMonthlyNetMinor: product.catalogueMonthlyNetMinor,
    catalogueMonthlyNetFormatted:
      product.catalogueMonthlyNetMinor != null
        ? formatBillingMoney(product.catalogueMonthlyNetMinor, "CHF")
        : null,
    status: product.status,
    sortOrder: product.sortOrder,
  };
}

export function serializeBillingContract(contract: BillingContractRecord) {
  return {
    id: contract.id,
    key: contract.key,
    contractNumber: contract.contractNumber,
    legalEntityId: contract.legalEntityId,
    billingCustomerId: contract.billingCustomerId,
    billingProductId: contract.billingProductId,
    productName: contract.productName,
    productDescription: contract.productDescription,
    status: contract.status,
    statusLabel: presentBillingContractStatus(contract.status).label,
    currency: contract.currency,
    monthlyNetAmountMinor: contract.monthlyNetAmountMinor,
    monthlyNetFormatted: formatBillingMoney(contract.monthlyNetAmountMinor, contract.currency),
    billingInterval: contract.billingInterval,
    billingIntervalLabel: presentBillingInterval(contract.billingInterval),
    vatTreatment: contract.vatTreatment,
    vatTreatmentLabel: presentSwissVatTreatment(contract.vatTreatment),
    startDate: contract.startDate.toISOString().slice(0, 10),
    startDateDisplay: formatBillingDateDisplay(contract.startDate),
    endDate: contract.endDate ? contract.endDate.toISOString().slice(0, 10) : null,
    endDateDisplay: contract.endDate ? formatBillingDateDisplay(contract.endDate) : null,
    minimumTermMonths: contract.minimumTermMonths,
    paymentTermsDays: contract.paymentTermsDays,
    invoiceRecipientProfileId: contract.invoiceRecipientProfileId,
    description: contract.description,
    internalNote: contract.internalNote,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

export function serializeInvoiceLine(line: InvoiceLineRecord) {
  return {
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPriceNetMinor: line.unitPriceNetMinor,
    unitPriceNetFormatted: formatBillingMoney(line.unitPriceNetMinor, "CHF"),
    lineNetMinor: line.lineNetMinor,
    lineNetFormatted: formatBillingMoney(line.lineNetMinor, "CHF"),
    vatRateBps: line.vatRateBps,
    vatMinor: line.vatMinor,
    vatFormatted: formatBillingMoney(line.vatMinor, "CHF"),
    lineGrossMinor: line.lineGrossMinor,
    lineGrossFormatted: formatBillingMoney(line.lineGrossMinor, "CHF"),
    sortOrder: line.sortOrder,
  };
}

export function serializeInvoice(invoice: InvoiceRecord) {
  return {
    id: invoice.id,
    key: invoice.key,
    invoiceNumber: invoice.invoiceNumber,
    displayNumber: presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status),
    legalEntityId: invoice.legalEntityId,
    billingCustomerId: invoice.billingCustomerId,
    billingContractId: invoice.billingContractId,
    status: invoice.status,
    statusLabel: presentNativeInvoiceStatus(invoice.status).label,
    currency: invoice.currency,
    periodStart: invoice.periodStart.toISOString().slice(0, 10),
    periodEnd: invoice.periodEnd.toISOString().slice(0, 10),
    periodDisplay: formatBillingPeriodDisplay(invoice.periodStart, invoice.periodEnd),
    invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toISOString().slice(0, 10) : null,
    invoiceDateDisplay: formatBillingDateDisplay(invoice.invoiceDate),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
    dueDateDisplay: formatBillingDateDisplay(invoice.dueDate),
    paymentTermsDays: invoice.paymentTermsDays,
    netTotalMinor: invoice.netTotalMinor,
    netTotalFormatted: formatBillingMoney(invoice.netTotalMinor, invoice.currency),
    vatTotalMinor: invoice.vatTotalMinor,
    vatTotalFormatted: formatBillingMoney(invoice.vatTotalMinor, invoice.currency),
    grossTotalMinor: invoice.grossTotalMinor,
    grossTotalFormatted: formatBillingMoney(invoice.grossTotalMinor, invoice.currency),
    contractLabel: invoice.contractLabel,
    finalizedAt: invoice.finalizedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function serializeInvoiceTaxSnapshot(snap: InvoiceTaxSnapshotRecord) {
  return {
    id: snap.id,
    taxLabel: snap.taxLabel,
    taxRateBps: snap.taxRateBps,
    taxableBaseMinor: snap.taxableBaseMinor,
    taxAmountMinor: snap.taxAmountMinor,
    currency: snap.currency,
  };
}

export function serializeIssuerSnapshot(snap: InvoiceIssuerSnapshotRecord) {
  return { ...snap };
}

export function serializeRecipientSnapshot(snap: InvoiceRecipientSnapshotRecord) {
  return { ...snap };
}
