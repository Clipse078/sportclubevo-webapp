import {
  WorkspaceDocumentStatus,
  WorkspaceDocumentVersionStatus,
} from "@prisma/client";

import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { prisma } from "@/lib/db/prisma";
import type { WorkspaceDocumentDto } from "@/lib/workspace/document-dto";
import {
  assertUserSuppliedChangeNoteAllowed,
  formatRestoreProvenanceChangeNote,
} from "@/lib/workspace/version/version-domain";
import { createPendingWorkspaceVersionScanRecord } from "@/lib/workspace/malware-scan/version-scan-write";
import { normalizeWorkspaceStorageProviderId } from "@/lib/workspace/storage/provider-identity";
import { getConfiguredWorkspaceUploadStorageProviderId } from "@/lib/workspace/storage/workspace-storage-config";
import {
  getConfiguredWorkspaceUploadStorageProvider,
  getWorkspaceStorageProvider,
} from "@/lib/workspace/storage/workspace-storage-provider-registry";
import type {
  AllowedWorkspaceMimeType,
  WorkspaceStorageProvider,
} from "@/lib/workspace/upload-types";

export type WorkspaceDocumentVersionWriteErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "VERSION_NOT_IN_DOCUMENT"
  | "VERSION_CONTENT_UNAVAILABLE"
  | "VERSION_CONFLICT"
  | "STORAGE_FAILURE";

export class WorkspaceDocumentVersionWriteError extends Error {
  readonly code: WorkspaceDocumentVersionWriteErrorCode;

  constructor(
    code: WorkspaceDocumentVersionWriteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentVersionWriteError";
    this.code = code;
  }
}

export type AppendWorkspaceDocumentVersionInput = {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  versionId: string;
  filename: string;
  mimeType: AllowedWorkspaceMimeType;
  sizeBytes: number;
  storageKey: string;
  storageUrl?: string | null;
  versionStorageProviderId?: string;
  checksum?: string | null;
  changeNote?: string | null;
  restoredFromVersionId?: string | null;
  storageProvider?: Pick<WorkspaceStorageProvider, "upload" | "download">;
};

export type RestoreWorkspaceDocumentVersionInput = {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  sourceVersionId: string;
  newVersionId: string;
  changeNote?: string | null;
  storageProvider?: Pick<
    WorkspaceStorageProvider,
    "upload" | "download" | "delete"
  >;
};

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentVersionWriteError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function validateSizeBytes(sizeBytes: number): number {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    throw new WorkspaceDocumentVersionWriteError(
      "INVALID_INPUT",
      "sizeBytes must be a non-negative safe integer.",
    );
  }

  return sizeBytes;
}

async function readStreamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.byteLength;
    }
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

async function resolveNextVersionNumber(
  transaction: Parameters<
    Parameters<typeof prisma.$transaction>[0]
  >[0],
  documentId: string,
): Promise<number> {
  const aggregate = await transaction.workspaceDocumentVersion.aggregate({
    where: { documentId },
    _max: { versionNumber: true },
  });

  return (aggregate._max.versionNumber ?? 0) + 1;
}

function mapDocumentWithCurrentVersion(
  document: {
    id: string;
    tenantId: string;
    folderId: string | null;
    name: string;
    status: WorkspaceDocumentStatus;
    currentVersionId: string | null;
    createdByUserId: string | null;
    updatedByUserId: string | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    currentVersion: {
      id: string;
      documentId: string;
      versionNumber: number;
      status: WorkspaceDocumentVersionStatus;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      storageUrl: string | null;
      storageProvider: string;
      checksum: string | null;
      changeNote: string | null;
      createdByUserId: string | null;
      createdAt: Date;
    } | null;
  },
): WorkspaceDocumentDto {
  return document;
}

/**
 * Appends a new immutable version and advances the document current pointer.
 * Never updates historical version rows.
 */
export async function appendWorkspaceDocumentVersion(
  input: AppendWorkspaceDocumentVersionInput,
): Promise<WorkspaceDocumentDto> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const actorUserId = normalizeRequiredText(
    input.actorUserId,
    "actorUserId",
  );
  const documentId = normalizeRequiredText(input.documentId, "documentId");
  const versionId = normalizeRequiredText(input.versionId, "versionId");
  const filename = normalizeRequiredText(input.filename, "filename");
  const mimeType = normalizeRequiredText(
    input.mimeType,
    "mimeType",
  ) as AllowedWorkspaceMimeType;
  const storageKey = normalizeRequiredText(input.storageKey, "storageKey");
  const sizeBytes = validateSizeBytes(input.sizeBytes);

  const storageUrl = normalizeOptionalText(input.storageUrl);
  const checksum = normalizeOptionalText(input.checksum);
  const storageProviderId = normalizeWorkspaceStorageProviderId(
    input.versionStorageProviderId ??
      getConfiguredWorkspaceUploadStorageProviderId(),
  );
  const restoredFromVersionId = normalizeOptionalText(
    input.restoredFromVersionId,
  );

  let changeNote = normalizeOptionalText(input.changeNote);
  if (restoredFromVersionId) {
    changeNote = formatRestoreProvenanceChangeNote(
      restoredFromVersionId,
      changeNote,
    );
  } else {
    try {
      assertUserSuppliedChangeNoteAllowed(changeNote);
    } catch {
      throw new WorkspaceDocumentVersionWriteError(
        "INVALID_INPUT",
        "Der Versionskommentar ist ungültig.",
      );
    }
  }

  const existingDocument = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      tenantId,
      status: WorkspaceDocumentStatus.ACTIVE,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!existingDocument) {
    throw new WorkspaceDocumentVersionWriteError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const nextVersionNumber = await resolveNextVersionNumber(
        transaction,
        documentId,
      );

      await transaction.workspaceDocumentVersion.updateMany({
        where: {
          documentId,
          status: WorkspaceDocumentVersionStatus.CURRENT,
        },
        data: {
          status: WorkspaceDocumentVersionStatus.SUPERSEDED,
        },
      });

      await transaction.workspaceDocumentVersion.create({
        data: {
          id: versionId,
          tenantId,
          documentId,
          versionNumber: nextVersionNumber,
          status: WorkspaceDocumentVersionStatus.CURRENT,
          filename,
          mimeType,
          sizeBytes,
          storageKey,
          storageUrl,
          storageProvider: storageProviderId,
          checksum,
          changeNote,
          createdByUserId: actorUserId,
        },
      });

      await createPendingWorkspaceVersionScanRecord(transaction, {
        tenantId,
        workspaceDocumentVersionId: versionId,
        documentId,
        actorUserId,
        source: restoredFromVersionId ? "restore" : "upload",
      });

      const completedDocument =
        await transaction.workspaceDocument.update({
          where: { id: documentId },
          data: {
            currentVersionId: versionId,
            updatedByUserId: actorUserId,
          },
          select: {
            id: true,
            tenantId: true,
            folderId: true,
            name: true,
            status: true,
            currentVersionId: true,
            createdByUserId: true,
            updatedByUserId: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
            currentVersion: {
              select: {
                id: true,
                documentId: true,
                versionNumber: true,
                status: true,
                filename: true,
                mimeType: true,
                sizeBytes: true,
                storageKey: true,
                storageUrl: true,
                storageProvider: true,
                checksum: true,
                changeNote: true,
                createdByUserId: true,
                createdAt: true,
              },
            },
          },
        });

      await writeWorkspaceGovernanceAudit(transaction, {
        tenantId,
        actorUserId,
        entityType: "WorkspaceDocumentVersion",
        entityId: versionId,
        workspaceDocumentVersionId: versionId,
        documentId,
        action: restoredFromVersionId
          ? WorkspaceAuditAction.DOCUMENT_VERSION_RESTORED
          : WorkspaceAuditAction.DOCUMENT_VERSION_CREATED,
        afterJson: {
          versionNumber: nextVersionNumber,
          restoredFromVersionId,
          mimeType,
          sizeBytes,
        },
      });

      return mapDocumentWithCurrentVersion(completedDocument);
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new WorkspaceDocumentVersionWriteError(
        "VERSION_CONFLICT",
        "Die Version konnte wegen eines Konflikts nicht erstellt werden.",
      );
    }
    throw error;
  }
}

/**
 * Restores historical content by copying bytes into a new private stored object
 * and appending version N+1. Historical versions remain unchanged.
 */
export async function restoreWorkspaceDocumentVersion(
  input: RestoreWorkspaceDocumentVersionInput,
): Promise<WorkspaceDocumentDto> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const actorUserId = normalizeRequiredText(
    input.actorUserId,
    "actorUserId",
  );
  const documentId = normalizeRequiredText(input.documentId, "documentId");
  const sourceVersionId = normalizeRequiredText(
    input.sourceVersionId,
    "sourceVersionId",
  );
  const newVersionId = normalizeRequiredText(
    input.newVersionId,
    "newVersionId",
  );

  const storageProvider =
    input.storageProvider ?? getConfiguredWorkspaceUploadStorageProvider();

  const document = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      tenantId,
      status: WorkspaceDocumentStatus.ACTIVE,
      archivedAt: null,
    },
    select: {
      id: true,
      currentVersionId: true,
    },
  });

  if (!document) {
    throw new WorkspaceDocumentVersionWriteError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  const sourceVersion =
    await prisma.workspaceDocumentVersion.findFirst({
      where: {
        id: sourceVersionId,
        tenantId,
        documentId,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storageKey: true,
        storageProvider: true,
        checksum: true,
        versionNumber: true,
      },
    });

  if (!sourceVersion) {
    throw new WorkspaceDocumentVersionWriteError(
      "VERSION_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  if (document.currentVersionId === sourceVersion.id) {
    throw new WorkspaceDocumentVersionWriteError(
      "INVALID_INPUT",
      "Die aktuelle Version ist bereits aktiv.",
    );
  }

  const sourceStorageProvider = getWorkspaceStorageProvider(
    sourceVersion.storageProvider,
  );

  const downloadResult = await sourceStorageProvider.download({
    storageReference: sourceVersion.storageKey,
    filename: sourceVersion.filename,
    mimeType: sourceVersion.mimeType,
  });

  if (!downloadResult.ok) {
    throw new WorkspaceDocumentVersionWriteError(
      downloadResult.status === 404
        ? "VERSION_CONTENT_UNAVAILABLE"
        : "STORAGE_FAILURE",
      downloadResult.status === 404
        ? "Der Inhalt dieser Version ist nicht verfügbar."
        : "Der Inhalt konnte nicht gelesen werden.",
    );
  }

  const buffer = await readStreamToBuffer(downloadResult.stream);

  const uploadResult = await storageProvider.upload({
    tenantId,
    documentId,
    versionId: newVersionId,
    filename: sourceVersion.filename,
    mimeType: sourceVersion.mimeType as AllowedWorkspaceMimeType,
    buffer,
  });

  if (!uploadResult.ok) {
    throw new WorkspaceDocumentVersionWriteError(
      "STORAGE_FAILURE",
      uploadResult.error,
    );
  }

  try {
    return await appendWorkspaceDocumentVersion({
      tenantId,
      actorUserId,
      documentId,
      versionId: newVersionId,
      filename: uploadResult.filename,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      storageUrl: uploadResult.storageUrl,
      versionStorageProviderId: getConfiguredWorkspaceUploadStorageProviderId(),
      checksum: uploadResult.checksum,
      changeNote: input.changeNote,
      restoredFromVersionId: sourceVersion.id,
    });
  } catch (error) {
    await storageProvider.delete(uploadResult.storageKey);
    throw error;
  }
}
