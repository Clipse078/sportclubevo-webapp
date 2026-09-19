import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import {
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import {
  createInboundBillingCommunication,
  findInboundBillingCommunicationByProviderMessageId,
} from "@/lib/billing/billing-communication/billing-communication-repository";
import {
  assertTenantMatchesBillingCustomer,
  resolveTenantIdForBillingCustomer,
} from "@/lib/billing/billing-communication/billing-communication-tenant";
import { assertInvoiceBelongsToTenant } from "./billing-inbound-tenant-resolver";
import { findBillingInboundUnresolvedMessageById } from "./billing-inbound-mailbox-repository";
import {
  billingCommunicationAttachmentStorage,
  getBillingCommunicationAttachmentStorageKey,
  type BillingCommunicationAttachmentStorage,
} from "@/lib/billing/billing-communication/billing-communication-attachment-storage";
import { createBillingCommunicationAttachment } from "@/lib/billing/billing-communication/billing-communication-attachment-repository";

const RESOLVED_BODY_PLACEHOLDER =
  "[Nachricht manuell zugeordnet. Der ursprüngliche Textkörper wurde in der Warteschlange nicht gespeichert.]";

export type ResolveBillingInboundUnresolvedResult =
  | { kind: "RESOLVED"; communicationId: string; invoiceKey: string }
  | { kind: "ALREADY_RESOLVED"; communicationId: string; invoiceKey: string };

export async function resolveBillingInboundUnresolvedMessage(input: {
  unresolvedMessageId: string;
  invoiceKey: string;
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<ResolveBillingInboundUnresolvedResult> {
  const unresolved = await findBillingInboundUnresolvedMessageById(input.unresolvedMessageId);
  if (!unresolved) {
    throw new NativeBillingNotFoundError("Nachricht nicht gefunden.");
  }

  const invoice = await findInvoiceByKey(input.invoiceKey.trim());
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status === "DRAFT") {
    throw new NativeBillingValidationError(
      "Entwurfsrechnungen können keine zugeordneten Nachrichten aufnehmen.",
    );
  }

  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, invoice.billingCustomerId);

  const belongs = await assertInvoiceBelongsToTenant({
    invoiceId: invoice.id,
    tenantId,
  });
  if (!belongs) {
    throw new NativeBillingValidationError("Rechnung gehört nicht zum erwarteten Mandanten.");
  }

  const existing = await findInboundBillingCommunicationByProviderMessageId({
    provider: unresolved.provider,
    providerMessageId: unresolved.providerMessageId,
  });
  if (existing) {
    await prisma.billingInboundUnresolvedMessage.delete({ where: { id: unresolved.id } }).catch(
      () => undefined,
    );
    return {
      kind: "ALREADY_RESOLVED",
      communicationId: existing.id,
      invoiceKey: input.invoiceKey,
    };
  }

  const storage = input.storage ?? billingCommunicationAttachmentStorage;
  const receivedAt = unresolved.receivedAt ?? unresolved.createdAt;

  const communication = await createInboundBillingCommunication({
    tenantId,
    invoiceId: invoice.id,
    billingContractId: invoice.billingContractId,
    parentCommunicationId: null,
    senderAddress: unresolved.senderAddress,
    toAddresses: unresolved.toAddresses,
    ccAddresses: [],
    subject: unresolved.subject,
    textBody: RESOLVED_BODY_PLACEHOLDER,
    htmlBody: null,
    receivedAt,
    provider: unresolved.provider,
    providerMessageId: unresolved.providerMessageId,
    internetMessageId: unresolved.internetMessageId,
    inReplyTo: unresolved.inReplyTo,
    referencesHeader: unresolved.referencesHeader,
  });

  const oldStorageKeys: string[] = [];

  for (const attachment of unresolved.attachments) {
    const downloaded = await storage.download({
      storageKey: attachment.storageKey,
      filename: attachment.sanitizedFilename,
      contentType: attachment.contentType,
    });
    const chunks: Uint8Array[] = [];
    const reader = downloaded.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    reader.releaseLock();
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

    const newId = randomUUID();
    const newStorageKey = getBillingCommunicationAttachmentStorageKey({
      tenantId,
      attachmentId: newId,
      filename: attachment.sanitizedFilename,
    });

    const uploaded = await storage.upload({
      storageKey: newStorageKey,
      contentType: attachment.contentType,
      buffer,
    });

    await createBillingCommunicationAttachment({
      id: newId,
      tenantId,
      invoiceId: invoice.id,
      billingCommunicationId: communication.id,
      storageKey: uploaded.storageKey,
      originalFilename: attachment.originalFilename,
      sanitizedFilename: attachment.sanitizedFilename,
      contentType: attachment.contentType,
      sizeBytes: uploaded.sizeBytes,
      checksumSha256: uploaded.checksumSha256,
      contentDisposition: attachment.contentDisposition,
      providerContentId: attachment.providerContentId,
      sortOrder: attachment.sortOrder,
      lifecycleStatus: "READY",
    });

    oldStorageKeys.push(attachment.storageKey);
  }

  await prisma.billingInboundUnresolvedMessage.delete({ where: { id: unresolved.id } });

  for (const storageKey of oldStorageKeys) {
    await storage.delete(storageKey).catch(() => undefined);
  }

  console.info("[billing/inbound-unresolved] resolved message", {
    unresolvedMessageId: unresolved.id,
    communicationId: communication.id,
    invoiceKey: input.invoiceKey,
    attachmentCount: oldStorageKeys.length,
  });

  return {
    kind: "RESOLVED",
    communicationId: communication.id,
    invoiceKey: input.invoiceKey,
  };
}
