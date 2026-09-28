import { createHash, randomUUID } from "node:crypto";
import { CommunicationAttachmentSourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  communicationAttachmentStorage,
  getCommunicationStorageKey,
} from "@/lib/communication/attachment-storage";
import { validateCommunicationAttachment } from "@/lib/communication/attachment-validation";
import { COMMUNICATION_CENTER_MAX_ATTACHMENT_BYTES } from "@/lib/communication/inbox/constants";

export type InboundCenterAttachmentPart = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export async function persistInboundCenterEmailAttachment(input: {
  tenantId: string;
  messageId: string;
  attachment: InboundCenterAttachmentPart;
  sortOrder: number;
}): Promise<{
  attachmentId: string;
  storageKey: string;
  sanitizedFilename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
}> {
  const buffer = new Uint8Array(input.attachment.buffer);
  if (input.attachment.sizeBytes > COMMUNICATION_CENTER_MAX_ATTACHMENT_BYTES || buffer.byteLength === 0) {
    throw new Error("ATTACHMENT_SKIPPED");
  }

  const validated = await validateCommunicationAttachment({
    filename: input.attachment.filename,
    declaredContentType: input.attachment.contentType,
    buffer,
  });

  const attachmentId = randomUUID();
  const storageKey = getCommunicationStorageKey({
    tenantId: input.tenantId,
    attachmentId,
    filename: validated.sanitizedFilename,
  });

  const uploaded = await communicationAttachmentStorage.upload({
    storageKey,
    contentType: validated.contentType,
    buffer,
  });

  return {
    attachmentId,
    storageKey: uploaded.storageKey,
    sanitizedFilename: validated.sanitizedFilename,
    contentType: validated.contentType,
    sizeBytes: uploaded.sizeBytes,
    checksumSha256: uploaded.checksumSha256,
  };
}

export function inboundAttachmentRowData(input: {
  tenantId: string;
  originalFilename: string;
  persisted: Awaited<ReturnType<typeof persistInboundCenterEmailAttachment>>;
}): Prisma.CommunicationAttachmentUncheckedCreateInput {
  return {
    id: input.persisted.attachmentId,
    tenantId: input.tenantId,
    storageKey: input.persisted.storageKey,
    originalFilename: input.originalFilename,
    sanitizedFilename: input.persisted.sanitizedFilename,
    contentType: input.persisted.contentType,
    sizeBytes: input.persisted.sizeBytes,
    checksumSha256: input.persisted.checksumSha256,
    sourceType: CommunicationAttachmentSourceType.INBOUND,
    lifecycleStatus: "READY",
    scanStatus: "PENDING",
    ingestionMetadata: { source: "COMMUNICATION_CENTER_IMAP" },
  };
}
