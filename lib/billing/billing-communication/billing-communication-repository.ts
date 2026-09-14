import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { BillingCommunicationRecord } from "./billing-communication-types";

const communicationSelect = {
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
} as const;

function mapRow(
  row: Prisma.BillingCommunicationGetPayload<{ select: typeof communicationSelect }>,
): BillingCommunicationRecord {
  return row;
}

export async function findBillingCommunicationByKey(
  key: string,
): Promise<BillingCommunicationRecord | null> {
  const row = await prisma.billingCommunication.findUnique({
    where: { key },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function findBillingCommunicationByIdForTenant(input: {
  id: string;
  tenantId: string;
}): Promise<BillingCommunicationRecord | null> {
  const row = await prisma.billingCommunication.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function findBillingCommunicationByInvoiceDeliveryId(
  invoiceDeliveryId: string,
): Promise<BillingCommunicationRecord | null> {
  const row = await prisma.billingCommunication.findUnique({
    where: { invoiceDeliveryId },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function findBillingCommunicationByProviderMessageId(input: {
  provider: string;
  providerMessageId: string;
}): Promise<BillingCommunicationRecord | null> {
  const row = await prisma.billingCommunication.findUnique({
    where: {
      provider_providerMessageId: {
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      },
    },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function findBillingCommunicationByInternetMessageId(
  internetMessageId: string,
): Promise<BillingCommunicationRecord | null> {
  const normalized = internetMessageId.trim();
  if (!normalized) return null;
  const row = await prisma.billingCommunication.findFirst({
    where: {
      OR: [{ internetMessageId: normalized }, { providerMessageId: normalized }],
    },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function findInboundBillingCommunicationByProviderMessageId(input: {
  provider: string;
  providerMessageId: string;
}): Promise<BillingCommunicationRecord | null> {
  const row = await prisma.billingCommunication.findFirst({
    where: {
      direction: "INBOUND",
      provider: input.provider,
      providerMessageId: input.providerMessageId,
    },
    select: communicationSelect,
  });
  return row ? mapRow(row) : null;
}

export async function createInboundBillingCommunication(
  input: {
    tenantId: string;
    invoiceId: string | null;
    billingContractId: string | null;
    parentCommunicationId: string | null;
    senderAddress: string;
    toAddresses: string[];
    ccAddresses: string[];
    subject: string | null;
    textBody: string | null;
    htmlBody: string | null;
    receivedAt: Date;
    provider: string;
    providerMessageId: string;
    internetMessageId: string | null;
    inReplyTo: string | null;
    referencesHeader: string | null;
  },
): Promise<BillingCommunicationRecord> {
  const row = await prisma.billingCommunication.create({
    data: {
      key: randomUUID(),
      tenantId: input.tenantId,
      direction: "INBOUND",
      channel: "EMAIL",
      status: "RECEIVED",
      invoiceId: input.invoiceId,
      billingContractId: input.billingContractId,
      invoiceDeliveryId: null,
      parentCommunicationId: input.parentCommunicationId,
      senderAddress: input.senderAddress,
      toAddresses: input.toAddresses,
      ccAddresses: input.ccAddresses,
      bccAddresses: [],
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: input.htmlBody,
      receivedAt: input.receivedAt,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      internetMessageId: input.internetMessageId,
      inReplyTo: input.inReplyTo,
      referencesHeader: input.referencesHeader,
    },
    select: communicationSelect,
  });
  return mapRow(row);
}

export async function createOutboundBillingCommunication(
  input: {
    tenantId: string;
    invoiceId: string;
    billingContractId: string | null;
    invoiceDeliveryId: string;
    senderAddress: string;
    toAddresses: string[];
    subject: string;
    textBody: string;
    sentAt: Date;
    provider: string;
    providerMessageId: string;
    internetMessageId?: string | null;
  },
): Promise<BillingCommunicationRecord> {
  const row = await prisma.billingCommunication.create({
    data: {
      key: randomUUID(),
      tenantId: input.tenantId,
      direction: "OUTBOUND",
      channel: "EMAIL",
      status: "SENT",
      invoiceId: input.invoiceId,
      billingContractId: input.billingContractId,
      invoiceDeliveryId: input.invoiceDeliveryId,
      senderAddress: input.senderAddress,
      toAddresses: input.toAddresses,
      ccAddresses: [],
      bccAddresses: [],
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: null,
      sentAt: input.sentAt,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      internetMessageId: input.internetMessageId ?? null,
    },
    select: communicationSelect,
  });
  return mapRow(row);
}
