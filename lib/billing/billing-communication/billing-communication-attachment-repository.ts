import { prisma } from "@/lib/db/prisma";
import type { BillingCommunicationAttachmentLifecycleStatus } from "@prisma/client";

export type BillingCommunicationAttachmentRecord = {
  id: string;
  tenantId: string;
  invoiceId: string | null;
  billingCommunicationId: string | null;
  storageKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  contentDisposition: string | null;
  providerContentId: string | null;
  sortOrder: number;
  lifecycleStatus: BillingCommunicationAttachmentLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
};

const attachmentSelect = {
  id: true,
  tenantId: true,
  invoiceId: true,
  billingCommunicationId: true,
  storageKey: true,
  originalFilename: true,
  sanitizedFilename: true,
  contentType: true,
  sizeBytes: true,
  checksumSha256: true,
  contentDisposition: true,
  providerContentId: true,
  sortOrder: true,
  lifecycleStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createBillingCommunicationAttachment(
  input: Omit<BillingCommunicationAttachmentRecord, "createdAt" | "updatedAt">,
): Promise<BillingCommunicationAttachmentRecord> {
  return prisma.billingCommunicationAttachment.create({
    data: {
      id: input.id,
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      billingCommunicationId: input.billingCommunicationId,
      storageKey: input.storageKey,
      originalFilename: input.originalFilename,
      sanitizedFilename: input.sanitizedFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      contentDisposition: input.contentDisposition,
      providerContentId: input.providerContentId,
      sortOrder: input.sortOrder,
      lifecycleStatus: input.lifecycleStatus,
    },
    select: attachmentSelect,
  });
}

export async function listBillingCommunicationAttachmentsForCommunications(input: {
  tenantId: string;
  invoiceId: string | null;
  communicationIds: string[];
}): Promise<BillingCommunicationAttachmentRecord[]> {
  if (input.communicationIds.length === 0) return [];
  return prisma.billingCommunicationAttachment.findMany({
    where: {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      billingCommunicationId: { in: input.communicationIds },
      lifecycleStatus: "READY",
    },
    orderBy: [{ billingCommunicationId: "asc" }, { sortOrder: "asc" }],
    select: attachmentSelect,
  });
}

export async function listStagedBillingCommunicationAttachments(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
}): Promise<BillingCommunicationAttachmentRecord[]> {
  if (input.attachmentIds.length === 0) return [];
  return prisma.billingCommunicationAttachment.findMany({
    where: {
      id: { in: input.attachmentIds },
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      lifecycleStatus: "STAGED",
      billingCommunicationId: null,
    },
    orderBy: { sortOrder: "asc" },
    select: attachmentSelect,
  });
}

export async function linkStagedAttachmentsToCommunication(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
  billingCommunicationId: string;
}): Promise<void> {
  await prisma.billingCommunicationAttachment.updateMany({
    where: {
      id: { in: input.attachmentIds },
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      lifecycleStatus: "STAGED",
      billingCommunicationId: null,
    },
    data: {
      billingCommunicationId: input.billingCommunicationId,
      lifecycleStatus: "READY",
    },
  });
}

export async function findBillingCommunicationAttachmentForDownload(input: {
  attachmentId: string;
  tenantId: string;
  invoiceId: string | null;
}): Promise<BillingCommunicationAttachmentRecord | null> {
  return prisma.billingCommunicationAttachment.findFirst({
    where: {
      id: input.attachmentId,
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      lifecycleStatus: "READY",
      billingCommunicationId: { not: null },
    },
    select: attachmentSelect,
  });
}

export async function deleteStagedBillingCommunicationAttachments(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
}): Promise<BillingCommunicationAttachmentRecord[]> {
  const staged = await listStagedBillingCommunicationAttachments(input);
  if (staged.length === 0) return [];
  await prisma.billingCommunicationAttachment.deleteMany({
    where: {
      id: { in: staged.map((row) => row.id) },
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      lifecycleStatus: "STAGED",
    },
  });
  return staged;
}

export async function listStaleStagedBillingCommunicationAttachments(input: {
  olderThan: Date;
  limit: number;
}): Promise<BillingCommunicationAttachmentRecord[]> {
  return prisma.billingCommunicationAttachment.findMany({
    where: {
      lifecycleStatus: "STAGED",
      billingCommunicationId: null,
      createdAt: { lt: input.olderThan },
    },
    orderBy: { createdAt: "asc" },
    take: input.limit,
    select: attachmentSelect,
  });
}

export async function deleteStagedBillingCommunicationAttachmentById(input: {
  id: string;
  tenantId: string;
}): Promise<BillingCommunicationAttachmentRecord | null> {
  const row = await prisma.billingCommunicationAttachment.findFirst({
    where: {
      id: input.id,
      tenantId: input.tenantId,
      lifecycleStatus: "STAGED",
      billingCommunicationId: null,
    },
    select: attachmentSelect,
  });
  if (!row) return null;
  await prisma.billingCommunicationAttachment.delete({
    where: { id: row.id },
  });
  return row;
}
