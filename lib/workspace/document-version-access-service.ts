import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { WorkspaceDocumentDownloadDto } from "@/lib/workspace/document-dto";
import { normalizeWorkspaceHistoricalVersionId } from "@/lib/workspace/version/version-query";

export type WorkspaceDocumentVersionAccessErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "VERSION_NOT_IN_DOCUMENT";

export class WorkspaceDocumentVersionAccessError extends Error {
  readonly code: WorkspaceDocumentVersionAccessErrorCode;

  constructor(
    code: WorkspaceDocumentVersionAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentVersionAccessError";
    this.code = code;
  }
}

export type GetWorkspaceDocumentVersionForDownloadInput = {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  versionId?: string | null;
};

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentVersionAccessError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

/**
 * Resolves one document version for download/preview after tenant + document
 * binding checks. Authorization (VIEW on the document) is enforced at the API
 * boundary — never from version id or creator alone.
 */
export async function getWorkspaceDocumentVersionForDownload(
  input: GetWorkspaceDocumentVersionForDownloadInput,
): Promise<WorkspaceDocumentDownloadDto | null> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  normalizeRequiredText(input.actorUserId, "actorUserId");
  const documentId = normalizeRequiredText(input.documentId, "documentId");
  const normalizedVersionId = normalizeWorkspaceHistoricalVersionId(
    input.versionId,
  );

  if (normalizedVersionId === undefined) {
    throw new WorkspaceDocumentVersionAccessError(
      "VERSION_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  const requestedVersionId = normalizedVersionId;

  const document = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      tenantId,
      status: {
        in: [
          WorkspaceDocumentStatus.ACTIVE,
          WorkspaceDocumentStatus.ARCHIVED,
          WorkspaceDocumentStatus.TRASHED,
        ],
      },
    },
    select: {
      id: true,
      name: true,
      currentVersionId: true,
      currentVersion: {
        select: {
          id: true,
          documentId: true,
          versionNumber: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          storageKey: true,
          storageProvider: true,
          checksum: true,
        },
      },
      versions: requestedVersionId
        ? {
            where: { id: requestedVersionId },
            take: 1,
            select: {
              id: true,
              documentId: true,
              versionNumber: true,
              filename: true,
              mimeType: true,
              sizeBytes: true,
              storageKey: true,
              storageProvider: true,
              checksum: true,
            },
          }
        : false,
    },
  });

  if (!document) {
    return null;
  }

  const version =
    requestedVersionId != null
      ? document.versions[0] ?? null
      : document.currentVersion;

  if (!version || version.documentId !== document.id) {
    if (requestedVersionId) {
      throw new WorkspaceDocumentVersionAccessError(
        "VERSION_NOT_FOUND",
        "Dokument nicht gefunden.",
      );
    }
    return null;
  }

  return {
    documentId: document.id,
    documentName: document.name,
    versionId: version.id,
    versionNumber: version.versionNumber,
    filename: version.filename,
    mimeType: version.mimeType,
    sizeBytes: version.sizeBytes,
    storageKey: version.storageKey,
    storageProvider: version.storageProvider,
    checksum: version.checksum,
  };
}
