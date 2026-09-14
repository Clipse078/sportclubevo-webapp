import {
  findBillingContractById,
  findInvoiceById,
} from "@/lib/billing/native-billing-commercial-repository";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";
import {
  createOutboundBillingCommunication,
  findBillingCommunicationByInvoiceDeliveryId,
  findBillingCommunicationByProviderMessageId,
} from "./billing-communication-repository";
import { normalizeInternetMessageId } from "@/lib/billing/billing-inbound/billing-inbound-message-id";
import {
  assertTenantMatchesBillingCustomer,
  resolveTenantIdForBillingCustomer,
} from "./billing-communication-tenant";
import type { BillingCommunicationRecord } from "./billing-communication-types";

export type RecordOutboundInvoiceEmailCommunicationInput = {
  invoice: {
    id: string;
    billingCustomerId: string;
    billingContractId: string | null;
  };
  delivery: {
    id: string;
    recipientEmail: string;
    sentAt: Date;
  };
  email: {
    subject: string;
    textBody: string;
    fromAddress: string;
  };
  transport: {
    provider: string;
    providerMessageId: string;
  };
};

async function resolveBillingContractIdForInvoice(input: {
  billingContractId: string | null;
  billingCustomerId: string;
}): Promise<string | null> {
  if (!input.billingContractId) {
    return null;
  }
  const contract = await findBillingContractById(input.billingContractId);
  if (!contract) {
    throw new NativeBillingValidationError("Vertrag für diese Rechnung wurde nicht gefunden.");
  }
  if (contract.billingCustomerId !== input.billingCustomerId) {
    throw new NativeBillingValidationError(
      "Der Vertrag gehört nicht zum Rechnungskunden dieser Rechnung.",
    );
  }
  return contract.id;
}

/**
 * Persists an OUTBOUND / EMAIL communication after provider acceptance.
 * Idempotent per invoice delivery attempt and per provider message id.
 */
export async function recordOutboundInvoiceEmailCommunication(
  input: RecordOutboundInvoiceEmailCommunicationInput,
): Promise<BillingCommunicationRecord> {
  const existingByDelivery = await findBillingCommunicationByInvoiceDeliveryId(input.delivery.id);
  if (existingByDelivery) {
    return existingByDelivery;
  }

  const existingByProvider = await findBillingCommunicationByProviderMessageId({
    provider: input.transport.provider,
    providerMessageId: input.transport.providerMessageId,
  });
  if (existingByProvider) {
    return existingByProvider;
  }

  const tenantId = await resolveTenantIdForBillingCustomer(input.invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, input.invoice.billingCustomerId);

  const billingContractId = await resolveBillingContractIdForInvoice({
    billingContractId: input.invoice.billingContractId,
    billingCustomerId: input.invoice.billingCustomerId,
  });

  return createOutboundBillingCommunication({
    tenantId,
    invoiceId: input.invoice.id,
    billingContractId,
    invoiceDeliveryId: input.delivery.id,
    senderAddress: input.email.fromAddress,
    toAddresses: [input.delivery.recipientEmail],
    subject: input.email.subject,
    textBody: input.email.textBody,
    sentAt: input.delivery.sentAt,
    provider: input.transport.provider,
    providerMessageId: input.transport.providerMessageId,
    internetMessageId: normalizeInternetMessageId(input.transport.providerMessageId),
  });
}

export type CreateOutboundBillingCommunicationForTenantInput = {
  tenantId: string;
  invoiceId: string;
  billingContractId?: string | null;
  senderAddress: string;
  toAddresses: string[];
  subject: string;
  textBody: string;
  invoiceDeliveryId: string;
  sentAt: Date;
  provider: string;
  providerMessageId: string;
  billingCustomerId: string;
};

/**
 * Explicit tenant-scoped creation for tests and future admin APIs.
 * Validates invoice/customer/contract tenant consistency before write.
 */
export async function createOutboundBillingCommunicationForTenant(
  input: CreateOutboundBillingCommunicationForTenantInput,
): Promise<BillingCommunicationRecord> {
  const invoice = await findInvoiceById(input.invoiceId);
  if (!invoice) {
    throw new NativeBillingValidationError("Rechnung nicht gefunden.");
  }
  if (invoice.billingCustomerId !== input.billingCustomerId) {
    throw new NativeBillingValidationError(
      "Rechnung gehört nicht zum angegebenen Rechnungskunden.",
    );
  }

  await assertTenantMatchesBillingCustomer(input.tenantId, input.billingCustomerId);

  if (input.billingContractId) {
    const contract = await findBillingContractById(input.billingContractId);
    if (!contract) {
      throw new NativeBillingValidationError("Vertrag wurde nicht gefunden.");
    }
    if (contract.billingCustomerId !== input.billingCustomerId) {
      throw new NativeBillingValidationError(
        "Der Vertrag gehört nicht zum Rechnungskunden.",
      );
    }
  }

  const existing = await findBillingCommunicationByInvoiceDeliveryId(input.invoiceDeliveryId);
  if (existing) {
    return existing;
  }

  return createOutboundBillingCommunication({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    billingContractId: input.billingContractId ?? null,
    invoiceDeliveryId: input.invoiceDeliveryId,
    senderAddress: input.senderAddress,
    toAddresses: input.toAddresses,
    subject: input.subject,
    textBody: input.textBody,
    sentAt: input.sentAt,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    internetMessageId: normalizeInternetMessageId(input.providerMessageId),
  });
}
