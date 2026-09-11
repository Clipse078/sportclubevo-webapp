import { maskIban } from "./iban-mask";
import type {
  BillingBankAccountRecord,
  BillingCustomerRecord,
  BillingCustomerTenantLinkRecord,
  BillingProfileRecord,
  LegalEntityRecord,
} from "./native-billing-types";

export function serializeBillingCustomer(customer: BillingCustomerRecord) {
  return {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function serializeBillingCustomerTenantLink(link: BillingCustomerTenantLinkRecord) {
  return {
    id: link.id,
    billingCustomerId: link.billingCustomerId,
    tenantId: link.tenantId,
    tenantKey: link.tenantKey ?? null,
    tenantName: link.tenantName ?? null,
    linkRole: link.linkRole,
    activeFrom: link.activeFrom.toISOString(),
    activeUntil: link.activeUntil?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    isActive: link.activeUntil === null,
  };
}

export function serializeBillingProfile(profile: BillingProfileRecord) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeLegalEntity(entity: LegalEntityRecord) {
  return {
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function serializeBillingBankAccountMasked(account: BillingBankAccountRecord) {
  return {
    id: account.id,
    legalEntityId: account.legalEntityId,
    label: account.label,
    bankName: account.bankName,
    currency: account.currency,
    ibanMasked: maskIban(account.iban),
    qrIbanMasked: maskIban(account.qrIban),
    referenceStrategy: account.referenceStrategy,
    creditorName: account.creditorName,
    creditorAddressLine1: account.creditorAddressLine1,
    creditorHouseNumber: account.creditorHouseNumber,
    creditorPostalCode: account.creditorPostalCode,
    creditorCity: account.creditorCity,
    creditorCountryCode: account.creditorCountryCode,
    activeFrom: account.activeFrom.toISOString(),
    activeUntil: account.activeUntil?.toISOString() ?? null,
    isDefault: account.isDefault,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function auditBankAccountSnapshot(account: BillingBankAccountRecord) {
  return {
    id: account.id,
    legalEntityId: account.legalEntityId,
    label: account.label,
    ibanMasked: maskIban(account.iban),
    qrIbanMasked: maskIban(account.qrIban),
    referenceStrategy: account.referenceStrategy,
    isDefault: account.isDefault,
    activeUntil: account.activeUntil?.toISOString() ?? null,
  };
}
