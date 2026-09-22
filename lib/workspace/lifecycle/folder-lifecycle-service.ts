import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { collectWorkspaceFolderSubtreeIds } from "@/lib/workspace/folder-subtree";
import {
  deriveWorkspaceFolderLifecycle,
  workspaceArchivedFolderWhere,
  workspaceTrashedFolderWhere,
} from "@/lib/workspace/lifecycle/lifecycle-domain";

export type WorkspaceFolderLifecycleServiceErrorCode =
  | "INVALID_INPUT"
  | "FOLDER_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "FOLDER_HAS_ACTIVE_CHILDREN"
  | "PARENT_NOT_ACTIVE"
  | "INVALID_LIFECYCLE_STATE";

export class WorkspaceFolderLifecycleServiceError extends Error {
  readonly code: WorkspaceFolderLifecycleServiceErrorCode;

  constructor(
    code: WorkspaceFolderLifecycleServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceFolderLifecycleServiceError";
    this.code = code;
  }
}

function normalizeFolderId(value: string): string {
  const id = value.trim();
  if (!id) {
    throw new WorkspaceFolderLifecycleServiceError(
      "INVALID_INPUT",
      "folderId is required.",
    );
  }
  return id;
}

export async function archiveWorkspaceFolder(input: {
  tenantId: string;
  actorUserId: string;
  folderId: string;
}): Promise<void> {
  const tenantId = input.tenantId.trim();
  const folderId = normalizeFolderId(input.folderId);

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, tenantId, archivedAt: null, trashedAt: null },
    select: { id: true },
  });

  if (!folder) {
    throw new WorkspaceFolderLifecycleServiceError(
      "FOLDER_NOT_FOUND",
      "Ordner nicht gefunden.",
    );
  }

  const activeChildCount = await prisma.workspaceFolder.count({
    where: { tenantId, parentId: folderId, archivedAt: null, trashedAt: null },
  });

  if (activeChildCount > 0) {
    throw new WorkspaceFolderLifecycleServiceError(
      "FOLDER_HAS_ACTIVE_CHILDREN",
      "Der Ordner enthält aktive Unterordner.",
    );
  }

  await prisma.workspaceFolder.update({
    where: { id: folderId },
    data: { archivedAt: new Date(), updatedByUserId: input.actorUserId },
  });
}

export async function restoreWorkspaceFolderFromArchive(input: {
  tenantId: string;
  actorUserId: string;
  folderId: string;
}): Promise<void> {
  const tenantId = input.tenantId.trim();
  const folderId = normalizeFolderId(input.folderId);

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, tenantId, ...workspaceArchivedFolderWhere() },
    select: { id: true, parentId: true },
  });

  if (!folder) {
    throw new WorkspaceFolderLifecycleServiceError(
      "FOLDER_NOT_FOUND",
      "Archivierter Ordner nicht gefunden.",
    );
  }

  if (folder.parentId) {
    const parent = await prisma.workspaceFolder.findFirst({
      where: { id: folder.parentId, tenantId },
      select: { archivedAt: true, trashedAt: true },
    });
    if (!parent || parent.trashedAt || parent.archivedAt) {
      throw new WorkspaceFolderLifecycleServiceError(
        "PARENT_NOT_ACTIVE",
        "Der übergeordnete Ordner ist nicht aktiv.",
      );
    }
  }

  await prisma.workspaceFolder.update({
    where: { id: folderId },
    data: { archivedAt: null, updatedByUserId: input.actorUserId },
  });
}

export async function trashWorkspaceFolderSubtree(input: {
  tenantId: string;
  actorUserId: string;
  folderId: string;
}): Promise<{ trashedFolderCount: number; trashedDocumentCount: number }> {
  const tenantId = input.tenantId.trim();
  const folderId = normalizeFolderId(input.folderId);

  const root = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, tenantId },
    select: { id: true, trashedAt: true, archivedAt: true },
  });

  if (!root) {
    throw new WorkspaceFolderLifecycleServiceError(
      "FOLDER_NOT_FOUND",
      "Ordner nicht gefunden.",
    );
  }

  if (deriveWorkspaceFolderLifecycle(root) === "TRASHED") {
    throw new WorkspaceFolderLifecycleServiceError(
      "INVALID_LIFECYCLE_STATE",
      "Der Ordner ist bereits im Papierkorb.",
    );
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(tenantId, folderId);
  const trashedAt = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.workspaceFolder.updateMany({
      where: { tenantId, id: { in: subtreeIds }, trashedAt: null },
      data: { trashedAt, updatedByUserId: input.actorUserId },
    });

    const docUpdate = await tx.workspaceDocument.updateMany({
      where: {
        tenantId,
        folderId: { in: subtreeIds },
        status: { not: WorkspaceDocumentStatus.TRASHED },
      },
      data: {
        status: WorkspaceDocumentStatus.TRASHED,
        trashedAt,
        updatedByUserId: input.actorUserId,
      },
    });

    await writeAuditRecord(tx, {
      tenantId,
      actorUserId: input.actorUserId,
      moduleKey: "workspace",
      entityType: "WorkspaceFolder",
      entityId: folderId,
      action: "WORKSPACE_FOLDER_TRASHED",
      afterJson: { subtreeFolderCount: subtreeIds.length },
    });

    return {
      trashedFolderCount: subtreeIds.length,
      trashedDocumentCount: docUpdate.count,
    };
  });
}

export async function restoreWorkspaceFolderFromTrash(input: {
  tenantId: string;
  actorUserId: string;
  folderId: string;
}): Promise<void> {
  const tenantId = input.tenantId.trim();
  const folderId = normalizeFolderId(input.folderId);

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, tenantId, ...workspaceTrashedFolderWhere() },
    select: { id: true, parentId: true, archivedAt: true },
  });

  if (!folder) {
    throw new WorkspaceFolderLifecycleServiceError(
      "FOLDER_NOT_FOUND",
      "Ordner im Papierkorb nicht gefunden.",
    );
  }

  if (folder.parentId) {
    const parent = await prisma.workspaceFolder.findFirst({
      where: { id: folder.parentId, tenantId },
      select: { trashedAt: true },
    });
    if (!parent || parent.trashedAt) {
      throw new WorkspaceFolderLifecycleServiceError(
        "PARENT_NOT_ACTIVE",
        "Der übergeordnete Ordner ist noch im Papierkorb.",
      );
    }
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(tenantId, folderId);

  await prisma.$transaction(async (tx) => {
    await tx.workspaceFolder.updateMany({
      where: { tenantId, id: { in: subtreeIds } },
      data: {
        trashedAt: null,
        archivedAt: null,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.workspaceDocument.updateMany({
      where: {
        tenantId,
        folderId: { in: subtreeIds },
        status: WorkspaceDocumentStatus.TRASHED,
      },
      data: {
        status: WorkspaceDocumentStatus.ACTIVE,
        trashedAt: null,
        updatedByUserId: input.actorUserId,
      },
    });
  });
}
