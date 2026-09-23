import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  GetWorkspaceDocumentVersionsInput,
  WorkspaceDocumentVersionHistoryItemDto,
} from "@/lib/workspace/document-dto";
import { loadWorkspaceVersionScanPublicDtoMap } from "@/lib/workspace/malware-scan/batch-version-scan-public-dto";
import { resolveWorkspaceVersionUploaderDisplayNames } from "@/lib/workspace/version/resolve-workspace-version-uploader-display";
import {
  deriveWorkspaceVersionIsCurrent,
  parseRestoredFromVersionId,
} from "@/lib/workspace/version/version-domain";

export type WorkspaceDocumentVersionServiceErrorCode =
  "INVALID_INPUT";

export class WorkspaceDocumentVersionServiceError extends Error {
  readonly code: WorkspaceDocumentVersionServiceErrorCode;

  constructor(
    code: WorkspaceDocumentVersionServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentVersionServiceError";
    this.code = code;
  }
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentVersionServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

/**
 * Returns immutable version metadata for one active Workspace document.
 *
 * Tenant isolation is enforced in the document lookup. Authorization is
 * enforced by the API boundary before this service is called. actorUserId is
 * still required so callers cannot invoke this read operation without an
 * authenticated actor context.
 */
export async function getDocumentVersions(
  input: GetWorkspaceDocumentVersionsInput,
): Promise<WorkspaceDocumentVersionHistoryItemDto[] | null> {
  const tenantId = normalizeRequiredText(
    input.tenantId,
    "tenantId",
  );

  normalizeRequiredText(
    input.actorUserId,
    "actorUserId",
  );

  const documentId = normalizeRequiredText(
    input.documentId,
    "documentId",
  );

  const document = await prisma.workspaceDocument.findFirst({
    where: {
      id: documentId,
      tenantId,
      status: WorkspaceDocumentStatus.ACTIVE,
      archivedAt: null,
    },
    select: {
      currentVersionId: true,
      versions: {
        orderBy: [
          {
            versionNumber: "desc",
          },
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        select: {
          id: true,
          versionNumber: true,
          createdAt: true,
          createdByUserId: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          checksum: true,
          status: true,
          changeNote: true,
        },
      },
    },
  });

  if (!document) {
    return null;
  }

  const scanMap = await loadWorkspaceVersionScanPublicDtoMap({
    tenantId,
    versionIds: document.versions.map((version) => version.id),
  });

  const uploaderDisplayNames =
    await resolveWorkspaceVersionUploaderDisplayNames(
      tenantId,
      document.versions.map((version) => version.createdByUserId ?? ""),
    );

  return document.versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
    createdByUserId: version.createdByUserId,
    createdByName:
      version.createdByUserId != null
        ? (uploaderDisplayNames.get(version.createdByUserId) ?? null)
        : null,
    filename: version.filename,
    mimeType: version.mimeType,
    sizeBytes: version.sizeBytes,
    checksum: version.checksum,
    status: version.status,
    isCurrent: deriveWorkspaceVersionIsCurrent(
      document.currentVersionId,
      version.id,
    ),
    restoredFromVersionId: parseRestoredFromVersionId(
      version.changeNote,
    ),
    scan: scanMap.get(version.id),
  }));
}