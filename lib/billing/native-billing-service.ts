import { logAction } from "@/lib/audit/log-action";
import { allocateUniqueBillingKey } from "./billing-business-key";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "./native-billing-audit";
import { assertBillingBankAccountNotDuplicate } from "./billing-bank-account-duplicate";
import { auditBankAccountSnapshot } from "./native-billing-serializers";
import {
  countBillingBankAccountDependencies,
  createBillingBankAccountRecord,
  deleteBillingBankAccountRecordWithDefaultRepair,
  createBillingCustomerRecord,
  createBillingCustomerTenantLink,
  reactivateBillingCustomerTenantLink,
  createBillingProfileRecord,
  createLegalEntityRecord,
  deactivateBillingCustomerTenantLink,
  countLegalEntityDependencies,
  deleteLegalEntityRecord,
  findActiveBillingCustomerTenantLink,
  findActiveBillingCustomerTenantLinkByTenantId,
  findBillingBankAccountById,
  findLegalEntityById,
  findBillingCustomerById,
  findBillingCustomerByKey,
  findBillingProfileById,
  findLegalEntityByKey,
  findTenantIdByKey,
  listActiveBillingBankAccountsForLegalEntity,
  listAllBillingBankAccounts,
  listBillingCustomerTenantLinks,
  listBillingCustomers,
  listBillingProfilesForCustomer,
  listLegalEntities,
  tenantExistsById,
  updateBillingBankAccountRecord,
  updateBillingCustomerRecord,
  updateBillingProfileRecord,
  updateLegalEntityRecord,
} from "./native-billing-repository";
import type {
  BillingBankAccountRecord,
  BillingCustomerRecord,
  BillingProfileRecord,
  LegalEntityDependencyCounts,
  LegalEntityRecord,
} from "./native-billing-types";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "./native-billing-types";
import {
  assertSwissReferenceAccountCompatibility,
  SwissReferenceCompatError,
} from "./swiss-qr/swiss-reference-compat";
import { SwissIbanError } from "./swiss-qr/swiss-iban";
import { buildQrrPayload26 } from "./swiss-qr/swiss-qrr";

function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new NativeBillingValidationError(`${field} ist erforderlich.`);
  }
  return trimmed;
}

function parseQrrReferencePrefix(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new NativeBillingValidationError("QRR-Präfix muss numerisch sein.");
  }
  if (trimmed.length >= 26) {
    throw new NativeBillingValidationError("QRR-Präfix ist zu lang.");
  }
  return trimmed;
}

function validateQrrPrefixFitsPayload(prefix: string | null): void {
  if (!prefix) {
    return;
  }
  try {
    buildQrrPayload26(
      {
        invoiceId: "sample-invoice-id",
        legalEntityId: "sample-legal-entity",
        invoiceNumber: "2026-000001",
      },
      prefix,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new NativeBillingValidationError(error.message);
    }
    throw error;
  }
}

function assertBankAccountSwissRules(input: {
  iban: string;
  qrIban: string | null;
  referenceStrategy: BillingBankAccountRecord["referenceStrategy"];
}): void {
  try {
    assertSwissReferenceAccountCompatibility(input);
  } catch (error) {
    if (error instanceof SwissReferenceCompatError || error instanceof SwissIbanError) {
      throw new NativeBillingValidationError(error.message);
    }
    throw error;
  }
}

export async function getBillingCustomersOverview(): Promise<
  Array<
    BillingCustomerRecord & {
      tenantLinks: Awaited<ReturnType<typeof listBillingCustomerTenantLinks>>;
    }
  >
> {
  const customers = await listBillingCustomers();
  const enriched = await Promise.all(
    customers.map(async (customer) => ({
      ...customer,
      tenantLinks: await listBillingCustomerTenantLinks(customer.id),
    })),
  );
  return enriched;
}

export async function getBillingCustomerDetail(customerKey: string) {
  const customer = await findBillingCustomerByKey(customerKey);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }
  const [tenantLinks, profiles] = await Promise.all([
    listBillingCustomerTenantLinks(customer.id),
    listBillingProfilesForCustomer(customer.id),
  ]);
  return { customer, tenantLinks, profiles };
}

export type CreateBillingCustomerInput = {
  displayName: string;
  key?: string;
  legalName?: string | null;
  primaryEmail?: string | null;
  defaultLanguage?: string | null;
  defaultCurrency?: string | null;
  actorUserId: string;
};

export async function createBillingCustomer(
  input: CreateBillingCustomerInput,
): Promise<BillingCustomerRecord> {
  const displayName = assertNonEmpty(input.displayName, "Anzeigename");
  const key =
    input.key?.trim()
      ? await allocateUniqueBillingKey("billingCustomer", input.key)
      : await allocateUniqueBillingKey("billingCustomer", displayName);

  const created = await createBillingCustomerRecord({
    key,
    displayName,
    legalName: input.legalName?.trim() || null,
    status: "ACTIVE",
    defaultLanguage: input.defaultLanguage?.trim() || null,
    defaultCurrency: input.defaultCurrency?.trim() || null,
    primaryEmail: input.primaryEmail?.trim() || null,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingCustomer",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.CUSTOMER_CREATED,
    afterJson: { key: created.key, displayName: created.displayName },
  });

  return created;
}

export type CreateBillingCustomerProfileInput = {
  companyOrName: string;
  street: string;
  houseNumber?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  invoiceEmail?: string | null;
  profileType?: BillingProfileRecord["profileType"];
};

export type CreateBillingCustomerWithDetailsInput = CreateBillingCustomerInput & {
  billingProfile?: CreateBillingCustomerProfileInput | null;
  tenantKey?: string | null;
};

export async function createBillingCustomerWithDetails(
  input: CreateBillingCustomerWithDetailsInput,
): Promise<{
  customer: BillingCustomerRecord;
  profile: BillingProfileRecord | null;
  tenantLink: Awaited<ReturnType<typeof linkBillingCustomerToTenant>> | null;
}> {
  const customer = await createBillingCustomer(input);

  let profile: BillingProfileRecord | null = null;
  if (input.billingProfile) {
    profile = await createBillingProfile({
      customerKey: customer.key,
      profileType: input.billingProfile.profileType ?? "BILLING",
      companyOrName: input.billingProfile.companyOrName,
      street: input.billingProfile.street,
      houseNumber: input.billingProfile.houseNumber ?? null,
      postalCode: input.billingProfile.postalCode,
      city: input.billingProfile.city,
      countryCode: input.billingProfile.countryCode,
      invoiceEmail: input.billingProfile.invoiceEmail ?? null,
      actorUserId: input.actorUserId,
    });
  }

  let tenantLink: Awaited<ReturnType<typeof linkBillingCustomerToTenant>> | null = null;
  const tenantKey = input.tenantKey?.trim();
  if (tenantKey) {
    tenantLink = await linkBillingCustomerToTenant({
      customerKey: customer.key,
      tenantKey,
      actorUserId: input.actorUserId,
    });
  }

  return { customer, profile, tenantLink };
}

export type UpdateBillingCustomerInput = {
  customerKey: string;
  displayName?: string;
  legalName?: string | null;
  status?: BillingCustomerRecord["status"];
  primaryEmail?: string | null;
  defaultLanguage?: string | null;
  defaultCurrency?: string | null;
  actorUserId: string;
};

export async function updateBillingCustomer(
  input: UpdateBillingCustomerInput,
): Promise<BillingCustomerRecord> {
  const existing = await findBillingCustomerByKey(input.customerKey);
  if (!existing) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  const updated = await updateBillingCustomerRecord(existing.id, {
    displayName: input.displayName?.trim() || existing.displayName,
    legalName:
      input.legalName === undefined ? existing.legalName : input.legalName?.trim() || null,
    status: input.status ?? existing.status,
    primaryEmail:
      input.primaryEmail === undefined
        ? existing.primaryEmail
        : input.primaryEmail?.trim() || null,
    defaultLanguage:
      input.defaultLanguage === undefined
        ? existing.defaultLanguage
        : input.defaultLanguage?.trim() || null,
    defaultCurrency:
      input.defaultCurrency === undefined
        ? existing.defaultCurrency
        : input.defaultCurrency?.trim() || null,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingCustomer",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.CUSTOMER_UPDATED,
    beforeJson: { key: existing.key, status: existing.status },
    afterJson: { key: updated.key, status: updated.status },
  });

  return updated;
}

export async function linkBillingCustomerToTenant(input: {
  customerKey: string;
  tenantKey: string;
  linkRole?: string | null;
  actorUserId: string;
}) {
  const customer = await findBillingCustomerByKey(input.customerKey);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  const tenantId = await findTenantIdByKey(input.tenantKey.trim());
  if (!tenantId) {
    throw new NativeBillingNotFoundError("Tenant nicht gefunden.");
  }

  const activeForTenant = await findActiveBillingCustomerTenantLinkByTenantId(tenantId);
  if (
    activeForTenant &&
    activeForTenant.billingCustomerId !== customer.id &&
    activeForTenant.activeUntil === null
  ) {
    throw new NativeBillingConflictError(
      `Tenant ist bereits mit Billing-Kunde «${activeForTenant.customerDisplayName}» (${activeForTenant.customerKey}) verknüpft.`,
    );
  }

  const existing = await findActiveBillingCustomerTenantLink(customer.id, tenantId);
  if (existing?.activeUntil === null) {
    throw new NativeBillingConflictError("Tenant ist bereits mit diesem Billing-Kunden verknüpft.");
  }

  const link = existing
    ? await reactivateBillingCustomerTenantLink(existing.id, input.linkRole ?? null)
    : await createBillingCustomerTenantLink({
        billingCustomerId: customer.id,
        tenantId,
        linkRole: input.linkRole ?? null,
      });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingCustomerTenant",
    entityId: link.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.CUSTOMER_TENANT_LINKED,
    tenantId,
    afterJson: { customerKey: customer.key, tenantKey: input.tenantKey },
  });

  return link;
}

export async function unlinkBillingCustomerFromTenant(input: {
  customerKey: string;
  tenantKey: string;
  actorUserId: string;
}) {
  const customer = await findBillingCustomerByKey(input.customerKey);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  const tenantId = await findTenantIdByKey(input.tenantKey.trim());
  if (!tenantId) {
    throw new NativeBillingNotFoundError("Tenant nicht gefunden.");
  }

  const existing = await findActiveBillingCustomerTenantLink(customer.id, tenantId);
  if (!existing || existing.activeUntil !== null) {
    throw new NativeBillingNotFoundError("Aktive Verknüpfung nicht gefunden.");
  }

  const updated = await deactivateBillingCustomerTenantLink(existing.id, new Date());

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingCustomerTenant",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.CUSTOMER_TENANT_UNLINKED,
    tenantId,
    beforeJson: { customerKey: customer.key, tenantKey: input.tenantKey },
    afterJson: { activeUntil: updated.activeUntil?.toISOString() ?? null },
  });

  return updated;
}

export type CreateBillingProfileInput = {
  customerKey: string;
  profileType: BillingProfileRecord["profileType"];
  companyOrName: string;
  street: string;
  houseNumber?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  invoiceEmail?: string | null;
  actorUserId: string;
};

export async function createBillingProfile(input: CreateBillingProfileInput) {
  const customer = await findBillingCustomerByKey(input.customerKey);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  const created = await createBillingProfileRecord({
    billingCustomerId: customer.id,
    profileType: input.profileType,
    companyOrName: assertNonEmpty(input.companyOrName, "Name"),
    street: assertNonEmpty(input.street, "Strasse"),
    houseNumber: input.houseNumber?.trim() || null,
    postalCode: assertNonEmpty(input.postalCode, "PLZ"),
    city: assertNonEmpty(input.city, "Ort"),
    countryCode: assertNonEmpty(input.countryCode, "Land").toUpperCase(),
    invoiceEmail: input.invoiceEmail?.trim() || null,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingProfile",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.PROFILE_CREATED,
    afterJson: { customerKey: customer.key, profileType: created.profileType },
  });

  return created;
}

export type UpdateBillingProfileInput = {
  profileId: string;
  companyOrName?: string;
  street?: string;
  houseNumber?: string | null;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  invoiceEmail?: string | null;
  actorUserId: string;
};

export async function updateBillingProfile(input: UpdateBillingProfileInput) {
  const existing = await findBillingProfileById(input.profileId);
  if (!existing) {
    throw new NativeBillingNotFoundError("Billing-Profil nicht gefunden.");
  }

  const updated = await updateBillingProfileRecord(existing.id, {
    companyOrName: input.companyOrName?.trim() || existing.companyOrName,
    street: input.street?.trim() || existing.street,
    houseNumber:
      input.houseNumber === undefined ? existing.houseNumber : input.houseNumber?.trim() || null,
    postalCode: input.postalCode?.trim() || existing.postalCode,
    city: input.city?.trim() || existing.city,
    countryCode: input.countryCode?.trim().toUpperCase() || existing.countryCode,
    invoiceEmail:
      input.invoiceEmail === undefined ? existing.invoiceEmail : input.invoiceEmail?.trim() || null,
  });

  const customer = await findBillingCustomerById(existing.billingCustomerId);

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingProfile",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.PROFILE_UPDATED,
    afterJson: { customerKey: customer?.key ?? null, profileType: updated.profileType },
  });

  return updated;
}

export type CreateLegalEntityInput = {
  displayName: string;
  legalName: string;
  key?: string;
  entityType?: LegalEntityRecord["entityType"];
  uid?: string | null;
  vatId?: string | null;
  defaultCurrency?: string;
  addressLine1: string;
  houseNumber?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  actorUserId: string;
};

export async function createLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntityRecord> {
  const displayName = assertNonEmpty(input.displayName, "Anzeigename");
  const legalName = assertNonEmpty(input.legalName, "Rechtlicher Name");
  const key =
    input.key?.trim()
      ? await allocateUniqueBillingKey("legalEntity", input.key)
      : await allocateUniqueBillingKey("legalEntity", displayName);

  const created = await createLegalEntityRecord({
    key,
    displayName,
    legalName,
    entityType: input.entityType ?? null,
    uid: input.uid?.trim() || null,
    vatId: input.vatId?.trim() || null,
    defaultCurrency: input.defaultCurrency?.trim() || "CHF",
    status: "ACTIVE",
    addressLine1: assertNonEmpty(input.addressLine1, "Adresse"),
    houseNumber: input.houseNumber?.trim() || null,
    postalCode: assertNonEmpty(input.postalCode, "PLZ"),
    city: assertNonEmpty(input.city, "Ort"),
    countryCode: assertNonEmpty(input.countryCode, "Land").toUpperCase(),
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "LegalEntity",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.LEGAL_ENTITY_CREATED,
    afterJson: { key: created.key, displayName: created.displayName },
  });

  return created;
}

export type UpdateLegalEntityInput = {
  entityKey: string;
  displayName?: string;
  legalName?: string;
  status?: LegalEntityRecord["status"];
  entityType?: LegalEntityRecord["entityType"] | null;
  uid?: string | null;
  vatId?: string | null;
  defaultCurrency?: string;
  addressLine1?: string;
  houseNumber?: string | null;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  actorUserId: string;
};

export async function updateLegalEntity(input: UpdateLegalEntityInput): Promise<LegalEntityRecord> {
  const existing = await findLegalEntityByKey(input.entityKey);
  if (!existing) {
    throw new NativeBillingNotFoundError("Legal Entity nicht gefunden.");
  }

  const updated = await updateLegalEntityRecord(existing.id, {
    displayName: input.displayName?.trim() || existing.displayName,
    legalName: input.legalName?.trim() || existing.legalName,
    status: input.status ?? existing.status,
    entityType: input.entityType === undefined ? existing.entityType : input.entityType,
    uid: input.uid === undefined ? existing.uid : input.uid?.trim() || null,
    vatId: input.vatId === undefined ? existing.vatId : input.vatId?.trim() || null,
    defaultCurrency: input.defaultCurrency?.trim() || existing.defaultCurrency,
    addressLine1: input.addressLine1?.trim() || existing.addressLine1,
    houseNumber:
      input.houseNumber === undefined ? existing.houseNumber : input.houseNumber?.trim() || null,
    postalCode: input.postalCode?.trim() || existing.postalCode,
    city: input.city?.trim() || existing.city,
    countryCode: input.countryCode?.trim().toUpperCase() || existing.countryCode,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "LegalEntity",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.LEGAL_ENTITY_UPDATED,
    beforeJson: { key: existing.key, status: existing.status },
    afterJson: { key: updated.key, status: updated.status },
  });

  return updated;
}

const LEGAL_ENTITY_DELETE_BLOCKED_MESSAGE =
  "Dieser Rechtsträger kann nicht gelöscht werden, da bereits Abrechnungsdaten damit verknüpft sind.";

function totalLegalEntityDependencies(counts: LegalEntityDependencyCounts): number {
  return (
    counts.billingBankAccounts +
    counts.billingContracts +
    counts.invoices +
    counts.invoiceSequences
  );
}

export async function deleteLegalEntity(input: {
  entityKey: string;
  actorUserId: string;
}): Promise<void> {
  const existing = await findLegalEntityByKey(input.entityKey);
  if (!existing) {
    throw new NativeBillingNotFoundError("Legal Entity nicht gefunden.");
  }

  const dependencies = await countLegalEntityDependencies(existing.id);
  if (totalLegalEntityDependencies(dependencies) > 0) {
    throw new NativeBillingConflictError(LEGAL_ENTITY_DELETE_BLOCKED_MESSAGE, {
      dependencyCounts: dependencies,
    });
  }

  await deleteLegalEntityRecord(existing.id);

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "LegalEntity",
    entityId: existing.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.LEGAL_ENTITY_DELETED,
    beforeJson: {
      key: existing.key,
      displayName: existing.displayName,
      legalName: existing.legalName,
    },
  });
}

export async function listLegalEntitiesForPlatform() {
  return listLegalEntities();
}

export type CreateBillingBankAccountInput = {
  legalEntityKey: string;
  label: string;
  bankName?: string | null;
  currency?: string;
  iban: string;
  qrIban?: string | null;
  referenceStrategy?: BillingBankAccountRecord["referenceStrategy"];
  qrrReferencePrefix?: string | null;
  creditorName: string;
  creditorAddressLine1: string;
  creditorHouseNumber?: string | null;
  creditorPostalCode: string;
  creditorCity: string;
  creditorCountryCode: string;
  isDefault?: boolean;
  actorUserId: string;
};

export async function createBillingBankAccount(
  input: CreateBillingBankAccountInput,
): Promise<BillingBankAccountRecord> {
  const legalEntity = await findLegalEntityByKey(input.legalEntityKey);
  if (!legalEntity) {
    throw new NativeBillingNotFoundError("Legal Entity nicht gefunden.");
  }

  const iban = normalizeIban(assertNonEmpty(input.iban, "IBAN"));
  const qrIban = input.qrIban ? normalizeIban(input.qrIban) : null;
  const referenceStrategy = input.referenceStrategy ?? "NON";
  const qrrReferencePrefix = parseQrrReferencePrefix(input.qrrReferencePrefix);
  validateQrrPrefixFitsPayload(qrrReferencePrefix);
  assertBankAccountSwissRules({
    iban,
    qrIban,
    referenceStrategy,
  });

  await assertBillingBankAccountNotDuplicate({
    legalEntityId: legalEntity.id,
    iban,
    qrIban,
  });

  const created = await createBillingBankAccountRecord({
    legalEntityId: legalEntity.id,
    label: assertNonEmpty(input.label, "Bezeichnung"),
    bankName: input.bankName?.trim() || null,
    currency: input.currency?.trim() || "CHF",
    iban,
    qrIban,
    referenceStrategy,
    qrrReferencePrefix,
    creditorName: assertNonEmpty(input.creditorName, "Gläubiger"),
    creditorAddressLine1: assertNonEmpty(input.creditorAddressLine1, "Gläubiger-Adresse"),
    creditorHouseNumber: input.creditorHouseNumber?.trim() || null,
    creditorPostalCode: assertNonEmpty(input.creditorPostalCode, "Gläubiger-PLZ"),
    creditorCity: assertNonEmpty(input.creditorCity, "Gläubiger-Ort"),
    creditorCountryCode: assertNonEmpty(input.creditorCountryCode, "Gläubiger-Land").toUpperCase(),
    activeFrom: new Date(),
    activeUntil: null,
    isDefault: input.isDefault ?? false,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingBankAccount",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.BANK_ACCOUNT_CREATED,
    afterJson: auditBankAccountSnapshot(created),
  });

  return created;
}

export type UpdateBillingBankAccountInput = {
  accountId: string;
  label?: string;
  bankName?: string | null;
  currency?: string;
  iban?: string;
  qrIban?: string | null;
  referenceStrategy?: BillingBankAccountRecord["referenceStrategy"];
  qrrReferencePrefix?: string | null;
  creditorName?: string;
  creditorAddressLine1?: string;
  creditorHouseNumber?: string | null;
  creditorPostalCode?: string;
  creditorCity?: string;
  creditorCountryCode?: string;
  isDefault?: boolean;
  deactivate?: boolean;
  actorUserId: string;
};

export async function updateBillingBankAccount(
  input: UpdateBillingBankAccountInput,
): Promise<BillingBankAccountRecord> {
  const existing = await findBillingBankAccountById(input.accountId);
  if (!existing) {
    throw new NativeBillingNotFoundError("Bankkonto nicht gefunden.");
  }

  const nextIban = input.iban ? normalizeIban(input.iban) : existing.iban;
  const nextQrIban =
    input.qrIban === undefined
      ? existing.qrIban
      : input.qrIban
        ? normalizeIban(input.qrIban)
        : null;
  const nextReferenceStrategy = input.referenceStrategy ?? existing.referenceStrategy;
  const nextQrrPrefix =
    input.qrrReferencePrefix === undefined
      ? existing.qrrReferencePrefix
      : parseQrrReferencePrefix(input.qrrReferencePrefix);
  validateQrrPrefixFitsPayload(nextQrrPrefix);
  assertBankAccountSwissRules({
    iban: nextIban,
    qrIban: nextQrIban,
    referenceStrategy: nextReferenceStrategy,
  });

  await assertBillingBankAccountNotDuplicate({
    legalEntityId: existing.legalEntityId,
    iban: nextIban,
    qrIban: nextQrIban,
    excludeAccountId: existing.id,
  });

  const updated = await updateBillingBankAccountRecord(existing.id, {
    label: input.label?.trim() || existing.label,
    bankName: input.bankName === undefined ? existing.bankName : input.bankName?.trim() || null,
    currency: input.currency?.trim() || existing.currency,
    iban: nextIban,
    qrIban: nextQrIban,
    referenceStrategy: nextReferenceStrategy,
    qrrReferencePrefix: nextQrrPrefix,
    creditorName: input.creditorName?.trim() || existing.creditorName,
    creditorAddressLine1: input.creditorAddressLine1?.trim() || existing.creditorAddressLine1,
    creditorHouseNumber:
      input.creditorHouseNumber === undefined
        ? existing.creditorHouseNumber
        : input.creditorHouseNumber?.trim() || null,
    creditorPostalCode: input.creditorPostalCode?.trim() || existing.creditorPostalCode,
    creditorCity: input.creditorCity?.trim() || existing.creditorCity,
    creditorCountryCode:
      input.creditorCountryCode?.trim().toUpperCase() || existing.creditorCountryCode,
    isDefault: input.isDefault ?? existing.isDefault,
    activeUntil: input.deactivate ? new Date() : existing.activeUntil,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingBankAccount",
    entityId: updated.id,
    action: input.deactivate
      ? NATIVE_BILLING_AUDIT_ACTIONS.BANK_ACCOUNT_DEACTIVATED
      : NATIVE_BILLING_AUDIT_ACTIONS.BANK_ACCOUNT_UPDATED,
    beforeJson: auditBankAccountSnapshot(existing),
    afterJson: auditBankAccountSnapshot(updated),
  });

  return updated;
}

export async function listBillingBankAccountsForPlatform() {
  return listAllBillingBankAccounts();
}

const BANK_ACCOUNT_DELETE_BLOCKED_MESSAGE =
  "Dieses Bankkonto kann nicht gelöscht werden, da es bereits in Zahlungsanweisungen oder anderen Abrechnungsdaten verwendet wird.";

const BANK_ACCOUNT_DELETE_DEFAULT_AMBIGUOUS_MESSAGE =
  "Bitte legen Sie zuerst ein anderes Standardkonto fest, bevor Sie dieses Standardkonto löschen.";

export async function deleteBillingBankAccount(input: {
  accountId: string;
  actorUserId: string;
}): Promise<void> {
  const existing = await findBillingBankAccountById(input.accountId);
  if (!existing) {
    throw new NativeBillingNotFoundError("Bankkonto nicht gefunden.");
  }

  const dependencies = await countBillingBankAccountDependencies(existing.id);
  if (dependencies.paymentInstructions > 0) {
    throw new NativeBillingConflictError(BANK_ACCOUNT_DELETE_BLOCKED_MESSAGE, {
      bankAccountDependencyCounts: dependencies,
    });
  }

  const otherActiveAccounts = await listActiveBillingBankAccountsForLegalEntity(
    existing.legalEntityId,
    { excludeAccountId: existing.id, currency: existing.currency },
  );

  if (existing.isDefault && otherActiveAccounts.length > 1) {
    throw new NativeBillingConflictError(BANK_ACCOUNT_DELETE_DEFAULT_AMBIGUOUS_MESSAGE);
  }

  const promoteDefaultAccountId =
    existing.isDefault && otherActiveAccounts.length === 1 ? otherActiveAccounts[0]!.id : null;

  await deleteBillingBankAccountRecordWithDefaultRepair({
    accountId: existing.id,
    promoteDefaultAccountId,
  });

  const legalEntity = await findLegalEntityById(existing.legalEntityId);

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingBankAccount",
    entityId: existing.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.BANK_ACCOUNT_DELETED,
    beforeJson: {
      ...auditBankAccountSnapshot(existing),
      legalEntityKey: legalEntity?.key ?? null,
    },
  });
}

export async function assertTenantExists(tenantId: string): Promise<boolean> {
  return tenantExistsById(tenantId);
}
