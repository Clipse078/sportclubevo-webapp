import { Prisma } from "@prisma/client";
import {
  createInboundBillingCommunication,
  findBillingCommunicationByInternetMessageId,
  findBillingCommunicationByProviderMessageId,
  findInboundBillingCommunicationByProviderMessageId,
} from "@/lib/billing/billing-communication/billing-communication-repository";
import {
  BILLING_INBOUND_IMAP_PROVIDER,
  BILLING_INBOUND_MAILBOX_KEY,
} from "./billing-inbound-constants";
import {
  createBillingInboundUnresolvedMessage,
  findBillingInboundUnresolvedByProviderMessageId,
} from "./billing-inbound-mailbox-repository";
import {
  parseInboundBillingEmailAttachments,
  parseInboundBillingEmailSource,
} from "./billing-inbound-mail-parser";
import {
  BillingCommunicationAttachmentServiceError,
  persistInboundBillingCommunicationAttachments,
  persistInboundUnresolvedAttachments,
} from "@/lib/billing/billing-communication/billing-communication-attachment-service";
import { prisma } from "@/lib/db/prisma";
import {
  assertInvoiceBelongsToTenant,
  resolveBillingInboundTenant,
} from "./billing-inbound-tenant-resolver";
import type {
  BillingImapFetchedMessage,
  BillingInboundIngestResult,
} from "./billing-inbound-types";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  return code === "P2002";
}

export async function ingestBillingInboundImapMessage(
  message: BillingImapFetchedMessage,
): Promise<BillingInboundIngestResult> {
  const provider = BILLING_INBOUND_IMAP_PROVIDER;
  const providerMessageId = message.providerMessageId;

  const existingInbound = await findInboundBillingCommunicationByProviderMessageId({
    provider,
    providerMessageId,
  });
  if (existingInbound) {
    return {
      kind: "DUPLICATE",
      communicationId: existingInbound.id,
      tenantId: existingInbound.tenantId,
    };
  }

  const existingUnresolved = await findBillingInboundUnresolvedByProviderMessageId({
    provider,
    providerMessageId,
  });
  if (existingUnresolved) {
    try {
      const parts = await parseInboundBillingEmailAttachments(message.rawSource);
      await persistInboundUnresolvedAttachments({
        unresolvedMessageId: existingUnresolved.id,
        parts,
      });
    } catch (error) {
      if (error instanceof BillingCommunicationAttachmentServiceError) {
        return { kind: "FAILED", retryable: true, reason: "ATTACHMENT_PERSISTENCE" };
      }
      throw error;
    }
    return {
      kind: "UNRESOLVED",
      unresolvedId: existingUnresolved.id,
      reason: existingUnresolved.reason,
    };
  }

  let parsed;
  try {
    parsed = await parseInboundBillingEmailSource(message.rawSource);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.slice(0, 500) : "Parse failed.";
    const unresolved = await createBillingInboundUnresolvedMessage({
      mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
      provider,
      providerMessageId,
      internetMessageId: null,
      senderAddress: "unknown",
      toAddresses: [],
      subject: null,
      receivedAt: null,
      reason: "PARSE_FAILED",
      detail,
      inReplyTo: null,
      referencesHeader: null,
    });
    return {
      kind: "UNRESOLVED",
      unresolvedId: unresolved.id,
      reason: "PARSE_FAILED",
    };
  }

  if (parsed.internetMessageId) {
    const byInternet = await findBillingCommunicationByInternetMessageId(parsed.internetMessageId);
    if (byInternet?.direction === "INBOUND") {
      return {
        kind: "DUPLICATE",
        communicationId: byInternet.id,
        tenantId: byInternet.tenantId,
      };
    }
  }

  const existingProvider = await findBillingCommunicationByProviderMessageId({
    provider,
    providerMessageId,
  });
  if (existingProvider) {
    return {
      kind: "DUPLICATE",
      communicationId: existingProvider.id,
      tenantId: existingProvider.tenantId,
    };
  }

  const resolution = await resolveBillingInboundTenant({
    inReplyTo: parsed.inReplyTo,
    referencesHeader: parsed.referencesHeader,
    subject: parsed.subject,
    textBody: parsed.textBody,
  });

  if (resolution.kind === "UNRESOLVED") {
    const unresolved = await createBillingInboundUnresolvedMessage({
      mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
      provider,
      providerMessageId,
      internetMessageId: parsed.internetMessageId,
      senderAddress: parsed.senderAddress,
      toAddresses: parsed.toAddresses,
      subject: parsed.subject,
      receivedAt: parsed.receivedAt,
      reason: resolution.reason,
      detail: null,
      inReplyTo: parsed.inReplyTo,
      referencesHeader: parsed.referencesHeader,
    });
    try {
      const parts = await parseInboundBillingEmailAttachments(message.rawSource);
      await persistInboundUnresolvedAttachments({
        unresolvedMessageId: unresolved.id,
        parts,
      });
    } catch (error) {
      if (error instanceof BillingCommunicationAttachmentServiceError) {
        return { kind: "FAILED", retryable: true, reason: "ATTACHMENT_PERSISTENCE" };
      }
      throw error;
    }
    return {
      kind: "UNRESOLVED",
      unresolvedId: unresolved.id,
      reason: resolution.reason,
    };
  }

  if (resolution.invoiceId) {
    const belongs = await assertInvoiceBelongsToTenant({
      invoiceId: resolution.invoiceId,
      tenantId: resolution.tenantId,
    });
    if (!belongs) {
      const unresolved = await createBillingInboundUnresolvedMessage({
        mailboxKey: BILLING_INBOUND_MAILBOX_KEY,
        provider,
        providerMessageId,
        internetMessageId: parsed.internetMessageId,
        senderAddress: parsed.senderAddress,
        toAddresses: parsed.toAddresses,
        subject: parsed.subject,
        receivedAt: parsed.receivedAt,
        reason: "IDEMPOTENCY_CONFLICT",
        detail: "Invoice tenant mismatch.",
        inReplyTo: parsed.inReplyTo,
        referencesHeader: parsed.referencesHeader,
      });
      return {
        kind: "UNRESOLVED",
        unresolvedId: unresolved.id,
        reason: "IDEMPOTENCY_CONFLICT",
      };
    }
  }

  let attachmentParts: Awaited<ReturnType<typeof parseInboundBillingEmailAttachments>> = [];
  try {
    attachmentParts = await parseInboundBillingEmailAttachments(message.rawSource);
  } catch {
    return { kind: "FAILED", retryable: true, reason: "ATTACHMENT_PARSE" };
  }

  try {
    const created = await createInboundBillingCommunication({
      tenantId: resolution.tenantId,
      invoiceId: resolution.invoiceId,
      billingContractId: resolution.billingContractId,
      parentCommunicationId: resolution.parentCommunicationId,
      senderAddress: parsed.senderAddress,
      toAddresses: parsed.toAddresses,
      ccAddresses: parsed.ccAddresses,
      subject: parsed.subject,
      textBody: parsed.textBody,
      htmlBody: parsed.htmlBody,
      receivedAt: parsed.receivedAt,
      provider,
      providerMessageId,
      internetMessageId: parsed.internetMessageId,
      inReplyTo: parsed.inReplyTo,
      referencesHeader: parsed.referencesHeader,
    });

    try {
      await persistInboundBillingCommunicationAttachments({
        tenantId: resolution.tenantId,
        invoiceId: resolution.invoiceId,
        billingCommunicationId: created.id,
        parts: attachmentParts,
      });
    } catch (attachmentError) {
      await prisma.billingCommunication.delete({ where: { id: created.id } }).catch(() => undefined);
      if (attachmentError instanceof BillingCommunicationAttachmentServiceError) {
        return { kind: "FAILED", retryable: true, reason: "ATTACHMENT_PERSISTENCE" };
      }
      throw attachmentError;
    }

    return {
      kind: "INGESTED",
      communicationId: created.id,
      tenantId: created.tenantId,
    };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const raced = await findInboundBillingCommunicationByProviderMessageId({
        provider,
        providerMessageId,
      });
      if (raced) {
        return {
          kind: "DUPLICATE",
          communicationId: raced.id,
          tenantId: raced.tenantId,
        };
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw error;
    }
    return { kind: "FAILED", retryable: true, reason: "DB_ERROR" };
  }
}
