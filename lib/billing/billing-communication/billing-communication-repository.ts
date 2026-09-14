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
    },
    select: communicationSelect,
  });
  return mapRow(row);
}
