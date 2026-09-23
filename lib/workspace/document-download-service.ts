import {
  getWorkspaceDocumentVersionForDownload,
  WorkspaceDocumentVersionAccessError,
} from "@/lib/workspace/document-version-access-service";
import {
  assertWorkspaceVersionSafeForDelivery,
  WorkspaceContentDeliveryBlockedError,
} from "@/lib/workspace/malware-scan/content-delivery-gate";
import { prisma } from "@/lib/db/prisma";
import {
  workspaceStorageProvider,
} from "@/lib/workspace/upload-storage";
import type {
  WorkspaceStorageProvider,
} from "@/lib/workspace/upload-types";

export type WorkspaceDocumentDownloadServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "BLOB_NOT_FOUND"
  | "STORAGE_FAILURE"
  | "CONTENT_DELIVERY_BLOCKED";

export class WorkspaceDocumentDownloadServiceError extends Error {
  readonly code: WorkspaceDocumentDownloadServiceErrorCode;

  constructor(
    code: WorkspaceDocumentDownloadServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentDownloadServiceError";
    this.code = code;
  }
}

export type DownloadWorkspaceDocumentInput = {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  versionId?: string | null;
  storageProvider?: Pick<WorkspaceStorageProvider, "download">;
};

export type DownloadWorkspaceDocumentResult = {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  contentType: string;
  sizeBytes: number;
  etag: string | null;
};

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentDownloadServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

/**
 * Downloads the current version of one active tenant-scoped Workspace document.
 *
 * Authorization is enforced by the API boundary. actorUserId remains mandatory
 * so this operation cannot be invoked without an authenticated actor context.
 */
export async function downloadWorkspaceDocument(
  input: DownloadWorkspaceDocumentInput,
): Promise<DownloadWorkspaceDocumentResult> {
  const tenantId = normalizeRequiredText(
    input.tenantId,
    "tenantId",
  );

  const actorUserId = normalizeRequiredText(
    input.actorUserId,
    "actorUserId",
  );

  const documentId = normalizeRequiredText(
    input.documentId,
    "documentId",
  );

  let document;

  try {
    document = await getWorkspaceDocumentVersionForDownload({
      tenantId,
      actorUserId,
      documentId,
      versionId: input.versionId,
    });
  } catch (error) {
    if (error instanceof WorkspaceDocumentVersionAccessError) {
      throw new WorkspaceDocumentDownloadServiceError(
        error.code === "VERSION_NOT_FOUND" ||
          error.code === "VERSION_NOT_IN_DOCUMENT"
          ? "DOCUMENT_NOT_FOUND"
          : "INVALID_INPUT",
        "Dokument nicht gefunden.",
      );
    }
    throw error;
  }

  if (!document) {
    throw new WorkspaceDocumentDownloadServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  try {
    await assertWorkspaceVersionSafeForDelivery(prisma, {
      tenantId,
      workspaceDocumentVersionId: document.versionId,
      documentId: document.documentId,
      operation: "DOWNLOAD",
      actorUserId,
    });
  } catch (error) {
    if (error instanceof WorkspaceContentDeliveryBlockedError) {
      throw new WorkspaceDocumentDownloadServiceError(
        "CONTENT_DELIVERY_BLOCKED",
        "Dateiinhalt ist derzeit nicht verfügbar.",
      );
    }
    throw error;
  }

  const storageProvider =
    input.storageProvider ?? workspaceStorageProvider;

  const downloadResult = await storageProvider.download({
    storageReference: document.storageKey,
    filename: document.filename,
    mimeType: document.mimeType,
  });

  if (!downloadResult.ok) {
    if (downloadResult.status === 404) {
      throw new WorkspaceDocumentDownloadServiceError(
        "BLOB_NOT_FOUND",
        "Die Datei wurde im Speicher nicht gefunden.",
      );
    }

    throw new WorkspaceDocumentDownloadServiceError(
      "STORAGE_FAILURE",
      downloadResult.error,
    );
  }

  return {
    stream: downloadResult.stream,
    filename: downloadResult.filename,
    contentType: downloadResult.contentType,
    sizeBytes: downloadResult.sizeBytes,
    etag: downloadResult.etag || null,
  };
}
