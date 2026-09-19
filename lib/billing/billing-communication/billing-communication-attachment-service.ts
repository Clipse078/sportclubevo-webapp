import { createHash, randomUUID } from "node:crypto";
import type { MailAttachment } from "@/lib/email/mailer";
import {
  createBillingCommunicationAttachment,
  deleteStagedBillingCommunicationAttachments,
  findBillingCommunicationAttachmentForDownload,
  linkStagedAttachmentsToCommunication,
  listStagedBillingCommunicationAttachments,
  type BillingCommunicationAttachmentRecord,
} from "./billing-communication-attachment-repository";
import {
  BillingCommunicationAttachmentValidationError,
  MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  validateBillingCommunicationAttachment,
  validateBillingCommunicationAttachmentSet,
} from "./billing-communication-attachment-policy";
import {
  billingCommunicationAttachmentStorage,
  getBillingCommunicationAttachmentStorageKey,
  getBillingInboundUnresolvedAttachmentStorageKey,
  type BillingCommunicationAttachmentStorage,
} from "./billing-communication-attachment-storage";
import { prisma } from "@/lib/db/prisma";

export type BillingCommunicationAttachmentServiceErrorCode =
  | "INVALID_INPUT"
  | "ATTACHMENT_NOT_FOUND"
  | "STORAGE_FAILED"
  | "PERSISTENCE_FAILED";

export class BillingCommunicationAttachmentServiceError extends Error {
  constructor(
    readonly code: BillingCommunicationAttachmentServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BillingCommunicationAttachmentServiceError";
  }
}

export type ParsedBillingEmailAttachment = {
  filename: string;
  contentType: string;
  buffer: Uint8Array;
  contentDisposition: string | null;
  providerContentId: string | null;
  isInline: boolean;
};

export type SerializedBillingCommunicationAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string;
};

export function serializeBillingCommunicationAttachment(input: {
  attachment: BillingCommunicationAttachmentRecord;
  invoiceKey: string;
}): SerializedBillingCommunicationAttachment {
  return {
    id: input.attachment.id,
    filename: input.attachment.sanitizedFilename,
    contentType: input.attachment.contentType,
    sizeBytes: input.attachment.sizeBytes,
    downloadUrl: `/api/platform/billing/invoices/${encodeURIComponent(input.invoiceKey)}/communications/attachments/${encodeURIComponent(input.attachment.id)}`,
  };
}

function isOperatorVisibleAttachment(part: ParsedBillingEmailAttachment): boolean {
  if (!part.isInline) return true;
  const disposition = part.contentDisposition?.toLowerCase() ?? "";
  if (disposition.includes("attachment")) return true;
  return false;
}

export function filterOperatorVisibleInboundAttachments(
  parts: ParsedBillingEmailAttachment[],
): ParsedBillingEmailAttachment[] {
  return parts.filter(isOperatorVisibleAttachment);
}

async function persistValidatedBytes(input: {
  tenantId: string;
  invoiceId: string | null;
  billingCommunicationId: string | null;
  lifecycleStatus: "STAGED" | "READY";
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
  contentDisposition: string | null;
  providerContentId: string | null;
  sortOrder: number;
  storage?: BillingCommunicationAttachmentStorage;
}) {
  const validated = await validateBillingCommunicationAttachment({
    filename: input.filename,
    declaredContentType: input.declaredContentType,
    buffer: input.buffer,
  });

  const storage = input.storage ?? billingCommunicationAttachmentStorage;
  const id = randomUUID();
  const storageKey = getBillingCommunicationAttachmentStorageKey({
    tenantId: input.tenantId,
    attachmentId: id,
    filename: validated.sanitizedFilename,
  });

  let uploaded;
  try {
    uploaded = await storage.upload({
      storageKey,
      contentType: validated.contentType,
      buffer: input.buffer,
    });
  } catch {
    throw new BillingCommunicationAttachmentServiceError(
      "STORAGE_FAILED",
      "Der Anhang konnte nicht gespeichert werden.",
    );
  }

  try {
    return await createBillingCommunicationAttachment({
      id,
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      billingCommunicationId: input.billingCommunicationId,
      storageKey: uploaded.storageKey,
      originalFilename: validated.originalFilename,
      sanitizedFilename: validated.sanitizedFilename,
      contentType: validated.contentType,
      sizeBytes: uploaded.sizeBytes,
      checksumSha256: uploaded.checksumSha256,
      contentDisposition: input.contentDisposition,
      providerContentId: input.providerContentId,
      sortOrder: input.sortOrder,
      lifecycleStatus: input.lifecycleStatus,
    });
  } catch {
    await storage.delete(uploaded.storageKey);
    throw new BillingCommunicationAttachmentServiceError(
      "PERSISTENCE_FAILED",
      "Der Anhang konnte nicht registriert werden.",
    );
  }
}

export async function stageOutboundBillingCommunicationAttachment(input: {
  tenantId: string;
  invoiceId: string | null;
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<BillingCommunicationAttachmentRecord> {
  if (input.buffer.byteLength > MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
    throw new BillingCommunicationAttachmentValidationError(
      "FILE_TOO_LARGE",
      "Die Datei überschreitet 10 MiB.",
    );
  }
  return persistValidatedBytes({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    billingCommunicationId: null,
    lifecycleStatus: "STAGED",
    filename: input.filename,
    declaredContentType: input.declaredContentType,
    buffer: input.buffer,
    contentDisposition: "attachment",
    providerContentId: null,
    sortOrder: 0,
    storage: input.storage,
  });
}

export async function persistInboundBillingCommunicationAttachments(input: {
  tenantId: string;
  invoiceId: string | null;
  billingCommunicationId: string;
  parts: ParsedBillingEmailAttachment[];
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<BillingCommunicationAttachmentRecord[]> {
  const visible = filterOperatorVisibleInboundAttachments(input.parts);
  if (visible.length === 0) return [];

  validateBillingCommunicationAttachmentSet(
    visible.map((part) => ({ sizeBytes: part.buffer.byteLength })),
  );

  const created: BillingCommunicationAttachmentRecord[] = [];
  for (let index = 0; index < visible.length; index += 1) {
    const part = visible[index]!;
    const row = await persistValidatedBytes({
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      billingCommunicationId: input.billingCommunicationId,
      lifecycleStatus: "READY",
      filename: part.filename,
      declaredContentType: part.contentType,
      buffer: part.buffer,
      contentDisposition: part.contentDisposition,
      providerContentId: part.providerContentId,
      sortOrder: index,
      storage: input.storage,
    });
    created.push(row);
  }
  return created;
}

export async function persistInboundUnresolvedAttachments(input: {
  unresolvedMessageId: string;
  parts: ParsedBillingEmailAttachment[];
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<void> {
  const visible = filterOperatorVisibleInboundAttachments(input.parts);
  if (visible.length === 0) return;

  validateBillingCommunicationAttachmentSet(
    visible.map((part) => ({ sizeBytes: part.buffer.byteLength })),
  );

  const storage = input.storage ?? billingCommunicationAttachmentStorage;

  for (let index = 0; index < visible.length; index += 1) {
    const part = visible[index]!;
    const providerContentId = part.providerContentId?.trim() || null;
    if (providerContentId) {
      const existing = await prisma.billingInboundUnresolvedAttachment.findFirst({
        where: {
          unresolvedMessageId: input.unresolvedMessageId,
          providerContentId,
        },
        select: { id: true },
      });
      if (existing) continue;
    }

    const validated = await validateBillingCommunicationAttachment({
      filename: part.filename,
      declaredContentType: part.contentType,
      buffer: part.buffer,
    });

    const id = randomUUID();
    const storageKey = getBillingInboundUnresolvedAttachmentStorageKey({
      unresolvedMessageId: input.unresolvedMessageId,
      attachmentId: id,
      filename: validated.sanitizedFilename,
    });

    let uploaded;
    try {
      uploaded = await storage.upload({
        storageKey,
        contentType: validated.contentType,
        buffer: part.buffer,
      });
    } catch {
      throw new BillingCommunicationAttachmentServiceError(
        "STORAGE_FAILED",
        "Der Anhang konnte nicht gespeichert werden.",
      );
    }

    try {
      await prisma.billingInboundUnresolvedAttachment.create({
        data: {
          id,
          unresolvedMessageId: input.unresolvedMessageId,
          storageKey: uploaded.storageKey,
          originalFilename: validated.originalFilename,
          sanitizedFilename: validated.sanitizedFilename,
          contentType: validated.contentType,
          sizeBytes: uploaded.sizeBytes,
          checksumSha256: uploaded.checksumSha256,
          contentDisposition: part.contentDisposition,
          providerContentId,
          sortOrder: index,
        },
      });
    } catch {
      await storage.delete(uploaded.storageKey);
      throw new BillingCommunicationAttachmentServiceError(
        "PERSISTENCE_FAILED",
        "Der Anhang konnte nicht registriert werden.",
      );
    }
  }
}

export async function resolveStagedAttachmentsForSend(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
}): Promise<BillingCommunicationAttachmentRecord[]> {
  const uniqueIds = [...new Set(input.attachmentIds.map((id) => id.trim()).filter(Boolean))];
  const staged = await listStagedBillingCommunicationAttachments({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    attachmentIds: uniqueIds,
  });
  if (staged.length !== uniqueIds.length) {
    throw new BillingCommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "Mindestens ein Anhang ist ungültig oder nicht verfügbar.",
    );
  }

  validateBillingCommunicationAttachmentSet(
    staged.map((row) => ({ sizeBytes: row.sizeBytes })),
  );

  return staged.sort((a, b) => uniqueIds.indexOf(a.id) - uniqueIds.indexOf(b.id));
}

export async function finalizeOutboundAttachments(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
  billingCommunicationId: string;
}): Promise<void> {
  await linkStagedAttachmentsToCommunication(input);
}

export async function cleanupStagedAttachmentsAfterFailedSend(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
  billingCommunicationId: string;
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<void> {
  const storage = input.storage ?? billingCommunicationAttachmentStorage;
  await linkStagedAttachmentsToCommunication({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    attachmentIds: input.attachmentIds,
    billingCommunicationId: input.billingCommunicationId,
  });
  const linked = await listStagedBillingCommunicationAttachments({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    attachmentIds: input.attachmentIds,
  });
  if (linked.length > 0) return;
  const rows = await prisma.billingCommunicationAttachment.findMany({
    where: {
      id: { in: input.attachmentIds },
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      billingCommunicationId: input.billingCommunicationId,
    },
    select: { storageKey: true },
  });
  for (const row of rows) {
    await storage.delete(row.storageKey).catch(() => undefined);
  }
}

export async function discardStagedBillingCommunicationAttachments(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentIds: string[];
  storage?: BillingCommunicationAttachmentStorage;
}): Promise<void> {
  const storage = input.storage ?? billingCommunicationAttachmentStorage;
  const removed = await deleteStagedBillingCommunicationAttachments(input);
  for (const row of removed) {
    await storage.delete(row.storageKey).catch(() => undefined);
  }
}

export async function loadMailAttachmentsFromRecords(
  records: BillingCommunicationAttachmentRecord[],
  storage: BillingCommunicationAttachmentStorage = billingCommunicationAttachmentStorage,
): Promise<MailAttachment[]> {
  const result: MailAttachment[] = [];
  for (const record of records) {
    const downloaded = await storage.download({
      storageKey: record.storageKey,
      filename: record.sanitizedFilename,
      contentType: record.contentType,
    });
    const chunks: Uint8Array[] = [];
    const reader = downloaded.stream.getReader();
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
        throw new BillingCommunicationAttachmentServiceError(
          "INVALID_INPUT",
          "Anhang überschreitet die maximale Größe.",
        );
      }
      chunks.push(value);
    }
    reader.releaseLock();
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    result.push({
      filename: record.sanitizedFilename,
      content: buffer,
      contentType: record.contentType,
    });
  }
  return result;
}

export async function downloadBillingCommunicationAttachment(input: {
  tenantId: string;
  invoiceId: string | null;
  attachmentId: string;
  storage?: BillingCommunicationAttachmentStorage;
}) {
  const attachment = await findBillingCommunicationAttachmentForDownload({
    attachmentId: input.attachmentId,
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
  });
  if (!attachment) {
    throw new BillingCommunicationAttachmentServiceError(
      "ATTACHMENT_NOT_FOUND",
      "Anhang nicht gefunden.",
    );
  }
  const storage = input.storage ?? billingCommunicationAttachmentStorage;
  const downloaded = await storage.download({
    storageKey: attachment.storageKey,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
  });
  return {
    stream: downloaded.stream,
    filename: attachment.sanitizedFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
  };
}

export function sha256Hex(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
