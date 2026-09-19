import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { BillingInboundUnresolvedReason } from "@prisma/client";

export type BillingInboundMailboxStateRecord = {
  id: string;
  mailboxKey: string;
  uidValidity: bigint | null;
  lastProcessedUid: bigint | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastError: string | null;
};

export async function getBillingInboundMailboxState(
  mailboxKey: string,
): Promise<BillingInboundMailboxStateRecord | null> {
  return prisma.billingInboundMailboxState.findUnique({
    where: { mailboxKey },
  });
}

export async function upsertBillingInboundMailboxState(input: {
  mailboxKey: string;
  uidValidity: bigint | null;
  lastProcessedUid: bigint | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastError: string | null;
}): Promise<BillingInboundMailboxStateRecord> {
  return prisma.billingInboundMailboxState.upsert({
    where: { mailboxKey: input.mailboxKey },
    create: {
      mailboxKey: input.mailboxKey,
      uidValidity: input.uidValidity,
      lastProcessedUid: input.lastProcessedUid,
      lastSyncAt: input.lastSyncAt,
      lastSyncStatus: input.lastSyncStatus,
      lastError: input.lastError,
    },
    update: {
      uidValidity: input.uidValidity,
      lastProcessedUid: input.lastProcessedUid,
      lastSyncAt: input.lastSyncAt,
      lastSyncStatus: input.lastSyncStatus,
      lastError: input.lastError,
    },
  });
}

export async function findBillingInboundUnresolvedByProviderMessageId(input: {
  provider: string;
  providerMessageId: string;
}) {
  return prisma.billingInboundUnresolvedMessage.findUnique({
    where: {
      provider_providerMessageId: {
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      },
    },
  });
}

export async function countBillingInboundUnresolvedMessages(): Promise<number> {
  return prisma.billingInboundUnresolvedMessage.count();
}

export type BillingInboundUnresolvedListItem = {
  id: string;
  key: string;
  receivedAt: Date | null;
  senderAddress: string;
  subject: string | null;
  reason: BillingInboundUnresolvedReason;
  detail: string | null;
  attachmentCount: number;
  createdAt: Date;
};

export async function listBillingInboundUnresolvedMessages(input: {
  limit: number;
}): Promise<BillingInboundUnresolvedListItem[]> {
  const rows = await prisma.billingInboundUnresolvedMessage.findMany({
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit,
    select: {
      id: true,
      key: true,
      receivedAt: true,
      senderAddress: true,
      subject: true,
      reason: true,
      detail: true,
      createdAt: true,
      _count: { select: { attachments: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    receivedAt: row.receivedAt,
    senderAddress: row.senderAddress,
    subject: row.subject,
    reason: row.reason,
    detail: row.detail,
    attachmentCount: row._count.attachments,
    createdAt: row.createdAt,
  }));
}

export async function findBillingInboundUnresolvedMessageById(id: string) {
  return prisma.billingInboundUnresolvedMessage.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createBillingInboundUnresolvedMessage(input: {
  mailboxKey: string;
  provider: string;
  providerMessageId: string;
  internetMessageId: string | null;
  senderAddress: string;
  toAddresses: string[];
  subject: string | null;
  receivedAt: Date | null;
  reason: BillingInboundUnresolvedReason;
  detail: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
}) {
  return prisma.billingInboundUnresolvedMessage.create({
    data: {
      key: randomUUID(),
      mailboxKey: input.mailboxKey,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      internetMessageId: input.internetMessageId,
      senderAddress: input.senderAddress,
      toAddresses: input.toAddresses,
      subject: input.subject,
      receivedAt: input.receivedAt,
      reason: input.reason,
      detail: input.detail,
      inReplyTo: input.inReplyTo,
      referencesHeader: input.referencesHeader,
    },
  });
}
