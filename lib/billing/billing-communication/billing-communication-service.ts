import {
  findBillingContractById,
  findInvoiceById,
  findInvoiceByKey,
} from "@/lib/billing/native-billing-commercial-repository";
import {
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import {
  createOutboundBillingCommunication,
  findBillingCommunicationByInvoiceDeliveryId,
  findBillingCommunicationByProviderMessageId,
  listBillingCommunicationsForInvoiceTenant,
} from "./billing-communication-repository";
import { serializeBillingCommunicationTimeline } from "./billing-communication-serializers";
import type { SerializedBillingCommunicationTimelineItem } from "./billing-communication-timeline-types";
import { listBillingCommunicationAttachmentsForCommunications } from "./billing-communication-attachment-repository";
import { serializeBillingCommunicationAttachment } from "./billing-communication-attachment-service";
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
    ccAddresses?: string[];
    bccAddresses?: string[];
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
    ccAddresses: input.email.ccAddresses ?? [],
    bccAddresses: input.email.bccAddresses ?? [],
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
  ccAddresses?: string[];
  bccAddresses?: string[];
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
    ccAddresses: input.ccAddresses ?? [],
    bccAddresses: input.bccAddresses ?? [],
    subject: input.subject,
    textBody: input.textBody,
    sentAt: input.sentAt,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    internetMessageId: normalizeInternetMessageId(input.providerMessageId),
  });
}

function timelineSortKey(row: {
  sentAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
}): number {
  const primary = row.sentAt ?? row.receivedAt ?? row.createdAt;
  return primary.getTime();
}

/**
 * Tenant-safe invoice communication timeline (ascending chronological order).
 */
export async function getInvoiceBillingCommunicationTimeline(
  invoiceKey: string,
): Promise<SerializedBillingCommunicationTimelineItem[]> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }

  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, invoice.billingCustomerId);

  const rows = await listBillingCommunicationsForInvoiceTenant({
    tenantId,
    invoiceId: invoice.id,
  });

  rows.sort((a, b) => timelineSortKey(a) - timelineSortKey(b));

  const attachmentRows = await listBillingCommunicationAttachmentsForCommunications({
    tenantId,
    invoiceId: invoice.id,
    communicationIds: rows.map((row) => row.id),
  });
  const attachmentsByCommunicationId: Record<
    string,
    ReturnType<typeof serializeBillingCommunicationAttachment>[]
  > = {};
  for (const attachment of attachmentRows) {
    const serialized = serializeBillingCommunicationAttachment({
      attachment,
      invoiceKey,
    });
    const bucket = attachmentsByCommunicationId[attachment.billingCommunicationId ?? ""] ?? [];
    bucket.push(serialized);
    attachmentsByCommunicationId[attachment.billingCommunicationId ?? ""] = bucket;
  }

  return serializeBillingCommunicationTimeline(rows, attachmentsByCommunicationId);
}
