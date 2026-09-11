import { prisma } from "@/lib/db/prisma";
import {
  decryptBillingBankAccountFields,
  encryptBillingBankAccountFields,
} from "./billing-bank-account-crypto";
import type {
  BillingBankAccountRecord,
  BillingCustomerRecord,
  BillingCustomerTenantLinkRecord,
  BillingProfileRecord,
  LegalEntityRecord,
} from "./native-billing-types";

const customerSelect = {
  id: true,
  key: true,
  displayName: true,
  legalName: true,
  status: true,
  defaultLanguage: true,
  defaultCurrency: true,
  primaryEmail: true,
  createdAt: true,
  updatedAt: true,
} as const;

const legalEntitySelect = {
  id: true,
  key: true,
  displayName: true,
  legalName: true,
  entityType: true,
  uid: true,
  vatId: true,
  defaultCurrency: true,
  status: true,
  addressLine1: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  countryCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

const profileSelect = {
  id: true,
  billingCustomerId: true,
  profileType: true,
  companyOrName: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  countryCode: true,
  invoiceEmail: true,
  createdAt: true,
  updatedAt: true,
} as const;

const bankAccountDbSelect = {
  id: true,
  legalEntityId: true,
  label: true,
  bankName: true,
  currency: true,
  ibanEncrypted: true,
  qrIbanEncrypted: true,
  encryptionKeyVersion: true,
  referenceStrategy: true,
  creditorName: true,
  creditorAddressLine1: true,
  creditorHouseNumber: true,
  creditorPostalCode: true,
  creditorCity: true,
  creditorCountryCode: true,
  activeFrom: true,
  activeUntil: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

type BillingBankAccountDbRow = {
  id: string;
  legalEntityId: string;
  label: string;
  bankName: string | null;
  currency: string;
  ibanEncrypted: string;
  qrIbanEncrypted: string | null;
  encryptionKeyVersion: number;
  referenceStrategy: BillingBankAccountRecord["referenceStrategy"];
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

function mapBillingBankAccountRow(row: BillingBankAccountDbRow): BillingBankAccountRecord {
  const { iban, qrIban } = decryptBillingBankAccountFields({
    ibanEncrypted: row.ibanEncrypted,
    qrIbanEncrypted: row.qrIbanEncrypted,
  });

  return {
    id: row.id,
    legalEntityId: row.legalEntityId,
    label: row.label,
    bankName: row.bankName,
    currency: row.currency,
    iban,
    qrIban,
    referenceStrategy: row.referenceStrategy,
    creditorName: row.creditorName,
    creditorAddressLine1: row.creditorAddressLine1,
    creditorHouseNumber: row.creditorHouseNumber,
    creditorPostalCode: row.creditorPostalCode,
    creditorCity: row.creditorCity,
    creditorCountryCode: row.creditorCountryCode,
    activeFrom: row.activeFrom,
    activeUntil: row.activeUntil,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listBillingCustomers(): Promise<BillingCustomerRecord[]> {
  return prisma.billingCustomer.findMany({
    select: customerSelect,
    orderBy: { displayName: "asc" },
  });
}

export async function findBillingCustomerByKey(
  key: string,
): Promise<BillingCustomerRecord | null> {
  return prisma.billingCustomer.findUnique({
    where: { key },
    select: customerSelect,
  });
}

export async function findBillingCustomerById(
  id: string,
): Promise<BillingCustomerRecord | null> {
  return prisma.billingCustomer.findUnique({
    where: { id },
    select: customerSelect,
  });
}

export async function createBillingCustomerRecord(
  data: Omit<BillingCustomerRecord, "id" | "createdAt" | "updatedAt">,
): Promise<BillingCustomerRecord> {
  return prisma.billingCustomer.create({ data, select: customerSelect });
}

export async function updateBillingCustomerRecord(
  id: string,
  data: Partial<
    Pick<
      BillingCustomerRecord,
      | "displayName"
      | "legalName"
      | "status"
      | "defaultLanguage"
      | "defaultCurrency"
      | "primaryEmail"
    >
  >,
): Promise<BillingCustomerRecord> {
  return prisma.billingCustomer.update({
    where: { id },
    data,
    select: customerSelect,
  });
}

export async function listBillingCustomerTenantLinks(
  billingCustomerId: string,
): Promise<BillingCustomerTenantLinkRecord[]> {
  const rows = await prisma.billingCustomerTenant.findMany({
    where: { billingCustomerId },
    select: {
      id: true,
      billingCustomerId: true,
      tenantId: true,
      linkRole: true,
      activeFrom: true,
      activeUntil: true,
      createdAt: true,
      tenant: { select: { key: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    billingCustomerId: row.billingCustomerId,
    tenantId: row.tenantId,
    linkRole: row.linkRole,
    activeFrom: row.activeFrom,
    activeUntil: row.activeUntil,
    createdAt: row.createdAt,
    tenantKey: row.tenant.key,
    tenantName: row.tenant.name,
  }));
}

export async function findActiveBillingCustomerTenantLink(
  billingCustomerId: string,
  tenantId: string,
): Promise<BillingCustomerTenantLinkRecord | null> {
  const row = await prisma.billingCustomerTenant.findUnique({
    where: { billingCustomerId_tenantId: { billingCustomerId, tenantId } },
    select: {
      id: true,
      billingCustomerId: true,
      tenantId: true,
      linkRole: true,
      activeFrom: true,
      activeUntil: true,
      createdAt: true,
    },
  });
  return row;
}

export async function createBillingCustomerTenantLink(input: {
  billingCustomerId: string;
  tenantId: string;
  linkRole?: string | null;
}): Promise<BillingCustomerTenantLinkRecord> {
  return prisma.billingCustomerTenant.create({
    data: {
      billingCustomerId: input.billingCustomerId,
      tenantId: input.tenantId,
      linkRole: input.linkRole ?? null,
    },
    select: {
      id: true,
      billingCustomerId: true,
      tenantId: true,
      linkRole: true,
      activeFrom: true,
      activeUntil: true,
      createdAt: true,
    },
  });
}

export async function deactivateBillingCustomerTenantLink(
  linkId: string,
  activeUntil: Date,
): Promise<BillingCustomerTenantLinkRecord> {
  return prisma.billingCustomerTenant.update({
    where: { id: linkId },
    data: { activeUntil },
    select: {
      id: true,
      billingCustomerId: true,
      tenantId: true,
      linkRole: true,
      activeFrom: true,
      activeUntil: true,
      createdAt: true,
    },
  });
}

export async function reactivateBillingCustomerTenantLink(
  linkId: string,
  linkRole?: string | null,
): Promise<BillingCustomerTenantLinkRecord> {
  return prisma.billingCustomerTenant.update({
    where: { id: linkId },
    data: {
      activeUntil: null,
      activeFrom: new Date(),
      linkRole: linkRole ?? undefined,
    },
    select: {
      id: true,
      billingCustomerId: true,
      tenantId: true,
      linkRole: true,
      activeFrom: true,
      activeUntil: true,
      createdAt: true,
    },
  });
}

export async function listBillingProfilesForCustomer(
  billingCustomerId: string,
): Promise<BillingProfileRecord[]> {
  return prisma.billingProfile.findMany({
    where: { billingCustomerId },
    select: profileSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function createBillingProfileRecord(
  data: Omit<BillingProfileRecord, "id" | "createdAt" | "updatedAt">,
): Promise<BillingProfileRecord> {
  return prisma.billingProfile.create({ data, select: profileSelect });
}

export async function updateBillingProfileRecord(
  id: string,
  data: Partial<
    Omit<BillingProfileRecord, "id" | "billingCustomerId" | "createdAt" | "updatedAt">
  >,
): Promise<BillingProfileRecord> {
  return prisma.billingProfile.update({
    where: { id },
    data,
    select: profileSelect,
  });
}

export async function findBillingProfileById(
  id: string,
): Promise<BillingProfileRecord | null> {
  return prisma.billingProfile.findUnique({
    where: { id },
    select: profileSelect,
  });
}

export async function listLegalEntities(): Promise<LegalEntityRecord[]> {
  return prisma.legalEntity.findMany({
    select: legalEntitySelect,
    orderBy: { displayName: "asc" },
  });
}

export async function findLegalEntityByKey(key: string): Promise<LegalEntityRecord | null> {
  return prisma.legalEntity.findUnique({
    where: { key },
    select: legalEntitySelect,
  });
}

export async function findLegalEntityById(id: string): Promise<LegalEntityRecord | null> {
  return prisma.legalEntity.findUnique({
    where: { id },
    select: legalEntitySelect,
  });
}

export async function createLegalEntityRecord(
  data: Omit<LegalEntityRecord, "id" | "createdAt" | "updatedAt">,
): Promise<LegalEntityRecord> {
  return prisma.legalEntity.create({ data, select: legalEntitySelect });
}

export async function updateLegalEntityRecord(
  id: string,
  data: Partial<
    Omit<LegalEntityRecord, "id" | "key" | "createdAt" | "updatedAt">
  >,
): Promise<LegalEntityRecord> {
  return prisma.legalEntity.update({
    where: { id },
    data,
    select: legalEntitySelect,
  });
}

export async function listBillingBankAccountsForLegalEntity(
  legalEntityId: string,
): Promise<BillingBankAccountRecord[]> {
  return prisma.billingBankAccount.findMany({
    where: { legalEntityId },
    select: bankAccountDbSelect,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  }).then((rows) => rows.map(mapBillingBankAccountRow));
}

export async function listAllBillingBankAccounts(): Promise<BillingBankAccountRecord[]> {
  return prisma.billingBankAccount.findMany({
    select: bankAccountDbSelect,
    orderBy: [{ legalEntityId: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
  }).then((rows) => rows.map(mapBillingBankAccountRow));
}

export async function findBillingBankAccountById(
  id: string,
): Promise<BillingBankAccountRecord | null> {
  const row = await prisma.billingBankAccount.findUnique({
    where: { id },
    select: bankAccountDbSelect,
  });
  return row ? mapBillingBankAccountRow(row) : null;
}

export async function createBillingBankAccountRecord(
  data: Omit<BillingBankAccountRecord, "id" | "createdAt" | "updatedAt">,
): Promise<BillingBankAccountRecord> {
  const encrypted = encryptBillingBankAccountFields({
    iban: data.iban,
    qrIban: data.qrIban,
  });
  const row = await prisma.billingBankAccount.create({
    data: {
      legalEntityId: data.legalEntityId,
      label: data.label,
      bankName: data.bankName,
      currency: data.currency,
      ...encrypted,
      referenceStrategy: data.referenceStrategy,
      creditorName: data.creditorName,
      creditorAddressLine1: data.creditorAddressLine1,
      creditorHouseNumber: data.creditorHouseNumber,
      creditorPostalCode: data.creditorPostalCode,
      creditorCity: data.creditorCity,
      creditorCountryCode: data.creditorCountryCode,
      activeFrom: data.activeFrom,
      activeUntil: data.activeUntil,
      isDefault: data.isDefault,
    },
    select: bankAccountDbSelect,
  });
  return mapBillingBankAccountRow(row);
}

export async function updateBillingBankAccountRecord(
  id: string,
  data: Partial<
    Omit<BillingBankAccountRecord, "id" | "legalEntityId" | "createdAt" | "updatedAt">
  >,
): Promise<BillingBankAccountRecord> {
  const encrypted =
    data.iban !== undefined
      ? encryptBillingBankAccountFields({
          iban: data.iban,
          qrIban: data.qrIban ?? null,
        })
      : null;

  const row = await prisma.billingBankAccount.update({
    where: { id },
    data: {
      label: data.label,
      bankName: data.bankName,
      currency: data.currency,
      ...(encrypted
        ? {
            ibanEncrypted: encrypted.ibanEncrypted,
            qrIbanEncrypted: encrypted.qrIbanEncrypted,
            encryptionKeyVersion: encrypted.encryptionKeyVersion,
          }
        : {}),
      referenceStrategy: data.referenceStrategy,
      creditorName: data.creditorName,
      creditorAddressLine1: data.creditorAddressLine1,
      creditorHouseNumber: data.creditorHouseNumber,
      creditorPostalCode: data.creditorPostalCode,
      creditorCity: data.creditorCity,
      creditorCountryCode: data.creditorCountryCode,
      activeFrom: data.activeFrom,
      activeUntil: data.activeUntil,
      isDefault: data.isDefault,
    },
    select: bankAccountDbSelect,
  });
  return mapBillingBankAccountRow(row);
}

export async function tenantExistsById(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  return tenant !== null;
}

export async function findTenantIdByKey(tenantKey: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: tenantKey },
    select: { id: true },
  });
  return tenant?.id ?? null;
}
