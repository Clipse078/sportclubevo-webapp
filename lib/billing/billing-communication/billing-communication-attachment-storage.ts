import { workspaceStorageProvider } from "@/lib/workspace/upload-storage";
import { sanitizeWorkspaceFilename } from "@/lib/workspace/upload-types";

export type BillingCommunicationStorageUploadResult = {
  storageKey: string;
  checksumSha256: string;
  sizeBytes: number;
};

export type BillingCommunicationStorageDownloadResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  sizeBytes: number;
};

export interface BillingCommunicationAttachmentStorage {
  upload(input: {
    storageKey: string;
    contentType: string;
    buffer: Uint8Array;
  }): Promise<BillingCommunicationStorageUploadResult>;
  download(input: {
    storageKey: string;
    filename: string;
    contentType: string;
  }): Promise<BillingCommunicationStorageDownloadResult>;
  delete(storageKey: string): Promise<void>;
}

function safePathSegment(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    throw new Error(`${field} contains unsupported storage path characters.`);
  }
  return normalized;
}

export function getBillingCommunicationAttachmentStorageKey(input: {
  tenantId: string;
  attachmentId: string;
  filename: string;
}): string {
  return [
    "billing-communication",
    safePathSegment(input.tenantId, "tenantId"),
    safePathSegment(input.attachmentId, "attachmentId"),
    sanitizeWorkspaceFilename(input.filename),
  ].join("/");
}

export function getBillingInboundUnresolvedAttachmentStorageKey(input: {
  unresolvedMessageId: string;
  attachmentId: string;
  filename: string;
}): string {
  return [
    "billing-inbound-unresolved",
    safePathSegment(input.unresolvedMessageId, "unresolvedMessageId"),
    safePathSegment(input.attachmentId, "attachmentId"),
    sanitizeWorkspaceFilename(input.filename),
  ].join("/");
}

export class BillingCommunicationAttachmentStorageError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BillingCommunicationAttachmentStorageError";
  }
}

export class WorkspaceBlobBillingCommunicationStorage
  implements BillingCommunicationAttachmentStorage
{
  async upload(input: {
    storageKey: string;
    contentType: string;
    buffer: Uint8Array;
  }): Promise<BillingCommunicationStorageUploadResult> {
    return workspaceStorageProvider.uploadImmutable(input);
  }

  async download(input: {
    storageKey: string;
    filename: string;
    contentType: string;
  }): Promise<BillingCommunicationStorageDownloadResult> {
    const result = await workspaceStorageProvider.download({
      storageReference: input.storageKey,
      filename: input.filename,
      mimeType: input.contentType,
    });
    if (!result.ok) {
      throw new BillingCommunicationAttachmentStorageError(result.status, result.error);
    }
    return {
      stream: result.stream,
      contentType: result.contentType,
      sizeBytes: result.sizeBytes,
    };
  }

  delete(storageKey: string): Promise<void> {
    return workspaceStorageProvider.delete(storageKey);
  }
}

export const billingCommunicationAttachmentStorage =
  new WorkspaceBlobBillingCommunicationStorage();
