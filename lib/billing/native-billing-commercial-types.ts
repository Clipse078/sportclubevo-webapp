import type {
  BillingContractStatus,
  BillingInterval,
  BillingProductStatus,
  InvoiceStatus,
  SwissVatTreatment,
} from "@prisma/client";

export type BillingProductRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  catalogueMonthlyNetMinor: number | null;
  status: BillingProductStatus;
  sortOrder: number;
};

export type BillingContractRecord = {
  id: string;
  key: string;
  contractNumber: string;
  legalEntityId: string;
  billingCustomerId: string;
  billingProductId: string | null;
  productName: string;
  productDescription: string | null;
  status: BillingContractStatus;
  currency: string;
  monthlyNetAmountMinor: number;
  billingInterval: BillingInterval;
  vatTreatment: SwissVatTreatment;
  startDate: Date;
  endDate: Date | null;
  minimumTermMonths: number | null;
  paymentTermsDays: number;
  invoiceRecipientProfileId: string | null;
  description: string | null;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLineRecord = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPriceNetMinor: number;
  lineNetMinor: number;
  vatRateBps: number;
  vatMinor: number;
  lineGrossMinor: number;
  sortOrder: number;
};

export type InvoiceRecord = {
  id: string;
  key: string;
  invoiceNumber: string | null;
  legalEntityId: string;
  billingCustomerId: string;
  billingContractId: string | null;
  status: InvoiceStatus;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceDate: Date | null;
  dueDate: Date | null;
  paymentTermsDays: number | null;
  netTotalMinor: number;
  vatTotalMinor: number;
  grossTotalMinor: number;
  contractLabel: string | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceTaxSnapshotRecord = {
  id: string;
  invoiceId: string;
  taxLabel: string;
  taxRateBps: number;
  taxableBaseMinor: number;
  taxAmountMinor: number;
  currency: string;
};

export type InvoiceIssuerSnapshotRecord = {
  id: string;
  invoiceId: string;
  legalName: string;
  displayName: string;
  uid: string | null;
  vatId: string | null;
  addressLine1: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  currency: string;
};

export type InvoiceRecipientSnapshotRecord = {
  id: string;
  invoiceId: string;
  companyOrName: string;
  street: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  invoiceEmail: string | null;
};

export function isInvoiceMutable(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}
