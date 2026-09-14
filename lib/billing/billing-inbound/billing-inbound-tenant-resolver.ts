import { prisma } from "@/lib/db/prisma";
import {
  collectThreadCandidateMessageIds,
  messageIdMatchVariants,
} from "./billing-inbound-message-id";
import { resolveTenantIdForBillingCustomer } from "@/lib/billing/billing-communication/billing-communication-tenant";
import type { BillingCommunicationRecord } from "@/lib/billing/billing-communication/billing-communication-types";

export type BillingInboundTenantResolution =
  | {
      kind: "THREAD";
      tenantId: string;
      invoiceId: string | null;
      billingContractId: string | null;
      parentCommunicationId: string;
    }
  | {
      kind: "INVOICE";
      tenantId: string;
      invoiceId: string;
      billingContractId: string | null;
      parentCommunicationId: null;
    }
  | { kind: "UNRESOLVED"; reason: "UNKNOWN_TENANT" | "AMBIGUOUS_INVOICE_REFERENCE" };

const INVOICE_NUMBER_PATTERN = /\b(20\d{2}-\d{6})\b/g;

async function findOutboundCommunicationForMessageId(
  messageId: string,
): Promise<BillingCommunicationRecord | null> {
  const variants = messageIdMatchVariants(messageId);
  if (variants.length === 0) return null;

  const row = await prisma.billingCommunication.findFirst({
    where: {
      direction: "OUTBOUND",
      OR: [
        { internetMessageId: { in: variants } },
        { providerMessageId: { in: variants } },
      ],
    },
    select: {
      id: true,
      key: true,
      tenantId: true,
      direction: true,
      channel: true,
      status: true,
      invoiceId: true,
      billingContractId: true,
      invoiceDeliveryId: true,
      senderAddress: true,
      toAddresses: true,
      ccAddresses: true,
      bccAddresses: true,
      subject: true,
      textBody: true,
      htmlBody: true,
      sentAt: true,
      receivedAt: true,
      provider: true,
      providerMessageId: true,
      internetMessageId: true,
      inReplyTo: true,
      referencesHeader: true,
      parentCommunicationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return row;
}

async function resolveByThread(input: {
  inReplyTo: string | null;
  referencesHeader: string | null;
}): Promise<BillingInboundTenantResolution | null> {
  const candidates = collectThreadCandidateMessageIds(input);
  for (const candidate of candidates) {
    const parent = await findOutboundCommunicationForMessageId(candidate);
    if (!parent) continue;
    return {
      kind: "THREAD",
      tenantId: parent.tenantId,
      invoiceId: parent.invoiceId,
      billingContractId: parent.billingContractId,
      parentCommunicationId: parent.id,
    };
  }
  return null;
}

function extractExactInvoiceNumbers(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(INVOICE_NUMBER_PATTERN) ?? [];
  return [...new Set(matches)];
}

async function resolveByInvoiceReference(input: {
  subject: string | null;
  textBody: string | null;
}): Promise<BillingInboundTenantResolution | null> {
  const numbers = [
    ...extractExactInvoiceNumbers(input.subject),
    ...extractExactInvoiceNumbers(input.textBody),
  ];
  if (numbers.length === 0) return null;

  const uniqueNumbers = [...new Set(numbers)];
  if (uniqueNumbers.length !== 1) {
    return { kind: "UNRESOLVED", reason: "AMBIGUOUS_INVOICE_REFERENCE" };
  }

  const invoiceNumber = uniqueNumbers[0]!;
  const invoices = await prisma.invoice.findMany({
    where: { invoiceNumber },
    select: {
      id: true,
      billingCustomerId: true,
      billingContractId: true,
    },
  });

  if (invoices.length !== 1) {
    return {
      kind: "UNRESOLVED",
      reason: invoices.length === 0 ? "UNKNOWN_TENANT" : "AMBIGUOUS_INVOICE_REFERENCE",
    };
  }

  const invoice = invoices[0]!;
  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);

  return {
    kind: "INVOICE",
    tenantId,
    invoiceId: invoice.id,
    billingContractId: invoice.billingContractId,
    parentCommunicationId: null,
  };
}

export async function resolveBillingInboundTenant(input: {
  inReplyTo: string | null;
  referencesHeader: string | null;
  subject: string | null;
  textBody: string | null;
}): Promise<BillingInboundTenantResolution> {
  const thread = await resolveByThread(input);
  if (thread) return thread;

  const invoiceResolution = await resolveByInvoiceReference(input);
  if (invoiceResolution) return invoiceResolution;

  return { kind: "UNRESOLVED", reason: "UNKNOWN_TENANT" };
}

export async function assertInvoiceBelongsToTenant(input: {
  invoiceId: string;
  tenantId: string;
}): Promise<boolean> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { billingCustomerId: true },
  });
  if (!invoice) return false;
  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  return tenantId === input.tenantId;
}
