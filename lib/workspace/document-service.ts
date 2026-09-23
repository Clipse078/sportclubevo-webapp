import {
  WorkspaceAccessInheritanceMode,
  WorkspaceDocumentStatus,
  WorkspaceDocumentVersionStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  nestedResourceInheritPolicy,
  rootDocumentPolicyCreateInput,
} from "@/lib/workspace/access/policy-persistence";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { createPendingWorkspaceVersionScanRecord } from "@/lib/workspace/malware-scan/version-scan-write";
import type {
  CreateWorkspaceDocumentInput,
  GetWorkspaceDocumentForDownloadInput,
  ListWorkspaceDocumentsInput,
  WorkspaceDocumentDownloadDto,
  WorkspaceDocumentDto,
  WorkspaceDocumentListItemDto,
} from "@/lib/workspace/document-dto";
import { assertUserSuppliedChangeNoteAllowed } from "@/lib/workspace/version/version-domain";

export type WorkspaceDocumentServiceErrorCode =
  "INVALID_INPUT" | "FOLDER_NOT_FOUND" | "DUPLICATE_DOCUMENT_NAME";

export class WorkspaceDocumentServiceError extends Error {
  readonly code: WorkspaceDocumentServiceErrorCode;

  constructor(code: WorkspaceDocumentServiceErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceDocumentServiceError";
    this.code = code;
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentServiceError(
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
    throw new WorkspaceDocumentServiceError(
      "INVALID_INPUT",
      "sizeBytes must be a non-negative safe integer.",
    );
  }

  return sizeBytes;
}

export async function createWorkspaceDocumentWithInitialVersion(
  input: CreateWorkspaceDocumentInput,
): Promise<WorkspaceDocumentDto> {
  const documentId = normalizeRequiredText(
    input.documentId,
    "documentId",
  );
  const versionId = normalizeRequiredText(input.versionId, "versionId");
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const actorUserId = normalizeRequiredText(input.actorUserId, "actorUserId");
  const name = normalizeRequiredText(input.name, "name");
  const filename = normalizeRequiredText(input.filename, "filename");
  const mimeType = normalizeRequiredText(input.mimeType, "mimeType");
  const storageKey = normalizeRequiredText(input.storageKey, "storageKey");
  const sizeBytes = validateSizeBytes(input.sizeBytes);

  const folderId = normalizeOptionalText(input.folderId);
  const storageUrl = normalizeOptionalText(input.storageUrl);
  const checksum = normalizeOptionalText(input.checksum);
  const changeNote = normalizeOptionalText(input.changeNote);

  try {
    assertUserSuppliedChangeNoteAllowed(changeNote);
  } catch {
    throw new WorkspaceDocumentServiceError(
      "INVALID_INPUT",
      "Der Versionskommentar ist ungültig.",
    );
  }

  if (folderId) {
    const folder = await prisma.workspaceFolder.findFirst({
      where: {
        id: folderId,
        tenantId,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!folder) {
      throw new WorkspaceDocumentServiceError(
        "FOLDER_NOT_FOUND",
        "The selected Workspace folder does not exist or is archived.",
      );
    }
  }

  const duplicate = await prisma.workspaceDocument.findFirst({
    where: {
      tenantId,
      folderId,
      status: WorkspaceDocumentStatus.ACTIVE,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new WorkspaceDocumentServiceError(
      "DUPLICATE_DOCUMENT_NAME",
      "An active document with this name already exists in the selected folder.",
    );
  }

  const creatorPerson = await prisma.person.findFirst({
    where: { tenantId, userId: actorUserId },
    select: { id: true },
  });

  const isRootDocument = folderId == null;

  return prisma.$transaction(async (transaction) => {
    const document = await transaction.workspaceDocument.create({
      data: {
        id: documentId,
        tenantId,
        folderId,
        name,
        status: WorkspaceDocumentStatus.ACTIVE,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        accessInheritanceMode: isRootDocument
          ? WorkspaceAccessInheritanceMode.EXPLICIT
          : nestedResourceInheritPolicy().accessInheritanceMode,
      },
      select: {
        id: true,
      },
    });

    if (isRootDocument) {
      const policy = rootDocumentPolicyCreateInput({
        tenantId,
        documentId: document.id,
        creatorPersonId: creatorPerson?.id ?? null,
      });
      await transaction.workspaceAccessGrant.createMany({
        data: policy.accessGrants.create.map((grant) => ({
          tenantId: grant.tenantId,
          resourceType: grant.resourceType,
          folderId: null,
          documentId: document.id,
          subjectType: grant.subjectType,
          accessLevel: grant.accessLevel,
          personId: grant.personId ?? null,
          orgUnitId: grant.orgUnitId ?? null,
          teamId: grant.teamId ?? null,
          roleFunctionKey: grant.roleFunctionKey ?? null,
          roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
          roleScopeTeamId: grant.roleScopeTeamId ?? null,
        })),
      });
    }

    const version = await transaction.workspaceDocumentVersion.create({
      data: {
        id: versionId,
        tenantId,
        documentId: document.id,
        versionNumber: 1,
        status: WorkspaceDocumentVersionStatus.CURRENT,
        filename,
        mimeType,
        sizeBytes,
        storageKey,
        storageUrl,
        checksum,
        changeNote,
        createdByUserId: actorUserId,
      },
      select: {
        id: true,
      },
    });

    await createPendingWorkspaceVersionScanRecord(transaction, {
      tenantId,
      workspaceDocumentVersionId: version.id,
      documentId: document.id,
      actorUserId,
      source: "upload",
    });

    const completedDocument = await transaction.workspaceDocument.update({
      where: {
        id: document.id,
      },
      data: {
        currentVersionId: version.id,
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
      entityType: "WorkspaceDocument",
      entityId: document.id,
      action: WorkspaceAuditAction.DOCUMENT_VERSION_CREATED,
      workspaceDocumentVersionId: version.id,
      documentId: document.id,
      folderId,
      afterJson: {
        versionId: version.id,
        mimeType,
        sizeBytes,
      },
    });
    return completedDocument;
  });
}
export async function listWorkspaceDocuments(
  input: ListWorkspaceDocumentsInput,
): Promise<WorkspaceDocumentListItemDto[]> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const folderId = normalizeOptionalText(input.folderId);

  const authorizedIds = input.authorizedDocumentIds;
  const idFilter =
    authorizedIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedIds] };

  return prisma.workspaceDocument.findMany({
    where: {
      tenantId,
      folderId,
      status: WorkspaceDocumentStatus.ACTIVE,
      archivedAt: null,
      id: idFilter,
    },
    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      folderId: true,
      name: true,
      status: true,
      currentVersionId: true,
      createdByUserId: true,
      updatedByUserId: true,
      createdAt: true,
      updatedAt: true,
      currentVersion: {
        select: {
          id: true,
          versionNumber: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  });
}
export async function getWorkspaceDocumentForDownload(
  input: GetWorkspaceDocumentForDownloadInput,
): Promise<WorkspaceDocumentDownloadDto | null> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
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
      id: true,
      name: true,
      currentVersion: {
        select: {
          id: true,
          versionNumber: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          storageKey: true,
          checksum: true,
        },
      },
    },
  });

  if (!document?.currentVersion) {
    return null;
  }

  return {
    documentId: document.id,
    documentName: document.name,
    versionId: document.currentVersion.id,
    versionNumber: document.currentVersion.versionNumber,
    filename: document.currentVersion.filename,
    mimeType: document.currentVersion.mimeType,
    sizeBytes: document.currentVersion.sizeBytes,
    storageKey: document.currentVersion.storageKey,
    checksum: document.currentVersion.checksum,
  };
}
