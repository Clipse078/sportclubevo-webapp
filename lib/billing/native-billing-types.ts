import type {
  BillingCustomerStatus,
  BillingProfileType,
  BillingReferenceStrategy,
  LegalEntityStatus,
  LegalEntityType,
} from "@prisma/client";

export type BillingCustomerRecord = {
  id: string;
  key: string;
  displayName: string;
  legalName: string | null;
  status: BillingCustomerStatus;
  defaultLanguage: string | null;
  defaultCurrency: string | null;
  primaryEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BillingCustomerTenantLinkRecord = {
  id: string;
  billingCustomerId: string;
  tenantId: string;
  linkRole: string | null;
  activeFrom: Date;
  activeUntil: Date | null;
  createdAt: Date;
  tenantKey?: string;
  tenantName?: string;
};

export type BillingProfileRecord = {
  id: string;
  billingCustomerId: string;
  profileType: BillingProfileType;
  companyOrName: string;
  street: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  invoiceEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LegalEntityRecord = {
  id: string;
  key: string;
  displayName: string;
  legalName: string;
  entityType: LegalEntityType | null;
  uid: string | null;
  vatId: string | null;
  defaultCurrency: string;
  status: LegalEntityStatus;
  addressLine1: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BillingBankAccountRecord = {
  id: string;
  legalEntityId: string;
  label: string;
  bankName: string | null;
  currency: string;
  iban: string;
  qrIban: string | null;
  referenceStrategy: BillingReferenceStrategy;
  creditorName: string;
  creditorAddressLine1: string;
  creditorHouseNumber: string | null;
  creditorPostalCode: string;
  creditorCity: string;
  creditorCountryCode: string;
  activeFrom: Date;
  activeUntil: Date | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class NativeBillingNotFoundError extends Error {
  readonly name = "NativeBillingNotFoundError";

  constructor(message = "Eintrag nicht gefunden.") {
    super(message);
  }
}

export class NativeBillingValidationError extends Error {
  readonly name = "NativeBillingValidationError";

  constructor(message: string) {
    super(message);
  }
}

export type LegalEntityDependencyCounts = {
  billingBankAccounts: number;
  billingContracts: number;
  invoices: number;
  invoiceSequences: number;
};

export class NativeBillingConflictError extends Error {
  readonly name = "NativeBillingConflictError";
  readonly dependencyCounts?: LegalEntityDependencyCounts;

  constructor(message: string, options?: { dependencyCounts?: LegalEntityDependencyCounts }) {
    super(message);
    this.dependencyCounts = options?.dependencyCounts;
  }
}
