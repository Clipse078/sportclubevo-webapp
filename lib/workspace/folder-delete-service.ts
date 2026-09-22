/**
 * lib/workspace/folder-delete-service.ts
 *
 * WORKSPACE-06 — permanent folder subtree delete without orphan documents.
 */

import { prisma } from "@/lib/db/prisma";
import { workspaceStorageProvider } from "@/lib/workspace/upload-storage";
import { collectWorkspaceFolderSubtreeIds } from "@/lib/workspace/folder-subtree";
import {
  canPermanentlyDeleteWorkspaceDocument,
  getWorkspaceDocumentDeletionBlockers,
  WORKSPACE_DELETION_BLOCKED_CODE,
  type WorkspaceDeletionBlocker,
} from "@/lib/workspace/deletion/deletion-blockers";

export type WorkspaceFolderDeleteServiceErrorCode =
  | "INVALID_INPUT"
  | "FOLDER_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | typeof WORKSPACE_DELETION_BLOCKED_CODE;

export class WorkspaceFolderDeleteServiceError extends Error {
  readonly code: WorkspaceFolderDeleteServiceErrorCode;
  readonly blockers?: WorkspaceDeletionBlocker[];

  constructor(
    code: WorkspaceFolderDeleteServiceErrorCode,
    message: string,
    blockers?: WorkspaceDeletionBlocker[],
  ) {
    super(message);
    this.name = "WorkspaceFolderDeleteServiceError";
    this.code = code;
    this.blockers = blockers;
  }
}

export type FolderDeletionImpact = {
  descendantFolderCount: number;
  documentCount: number;
  referenceBlockers: WorkspaceDeletionBlocker[];
};

export type DeleteWorkspaceFolderResult = {
  folderId: string;
  folderName: string;
  deletedFolderCount: number;
  impact: Omit<FolderDeletionImpact, "referenceBlockers">;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceFolderDeleteServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

export async function getWorkspaceFolderDeletionImpact(
  tenantId: string,
  folderId: string,
): Promise<FolderDeletionImpact | null> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanFolderId = normalizeRequiredText(folderId, "folderId");

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: cleanFolderId, tenantId: cleanTenantId },
    select: { id: true },
  });

  if (!folder) {
    return null;
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(
    cleanTenantId,
    cleanFolderId,
  );
  const descendantIds = subtreeIds.filter((id) => id !== cleanFolderId);

  const documents = await prisma.workspaceDocument.findMany({
    where: { tenantId: cleanTenantId, folderId: { in: subtreeIds } },
    select: { id: true },
  });

  const referenceBlockers: WorkspaceDeletionBlocker[] = [];
  for (const doc of documents) {
    referenceBlockers.push(
      ...(await getWorkspaceDocumentDeletionBlockers(
        prisma,
        cleanTenantId,
        doc.id,
      )),
    );
  }

  return {
    descendantFolderCount: descendantIds.length,
    documentCount: documents.length,
    referenceBlockers,
  };
}

export async function deleteWorkspaceFolderPermanently(
  tenantId: string,
  folderId: string,
): Promise<DeleteWorkspaceFolderResult> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanFolderId = normalizeRequiredText(folderId, "folderId");

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: cleanFolderId },
    select: { id: true, tenantId: true, name: true },
  });

  if (!folder) {
    throw new WorkspaceFolderDeleteServiceError(
      "FOLDER_NOT_FOUND",
      "Ordner nicht gefunden.",
    );
  }

  if (folder.tenantId !== cleanTenantId) {
    throw new WorkspaceFolderDeleteServiceError(
      "TENANT_FORBIDDEN",
      "Der Ordner gehört nicht zu diesem Mandanten.",
    );
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(
    cleanTenantId,
    cleanFolderId,
  );

  const storageReferences: string[] = [];
  let documentCount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceFolder"
      WHERE "id" = ${cleanFolderId} AND "tenantId" = ${cleanTenantId}
      FOR UPDATE
    `;

    const documents = await tx.workspaceDocument.findMany({
      where: { tenantId: cleanTenantId, folderId: { in: subtreeIds } },
      select: {
        id: true,
        versions: { select: { storageKey: true } },
      },
      orderBy: { id: "asc" },
    });

    documentCount = documents.length;

    for (const doc of documents) {
      await tx.$executeRaw`
        SELECT "id" FROM "WorkspaceDocument"
        WHERE "id" = ${doc.id} AND "tenantId" = ${cleanTenantId}
        FOR UPDATE
      `;

      const check = await canPermanentlyDeleteWorkspaceDocument(
        tx,
        cleanTenantId,
        doc.id,
      );
      if (!check.allowed) {
        throw new WorkspaceFolderDeleteServiceError(
          WORKSPACE_DELETION_BLOCKED_CODE,
          "Ordner kann nicht gelöscht werden: mindestens ein Dokument ist referenziert.",
          check.blockers,
        );
      }

      storageReferences.push(...doc.versions.map((v) => v.storageKey));

      await tx.workspaceDocument.delete({
        where: { id: doc.id },
      });
    }

    await tx.workspaceFolder.deleteMany({
      where: { tenantId: cleanTenantId, id: { in: subtreeIds } },
    });
  });

  for (const ref of storageReferences) {
    try {
      await workspaceStorageProvider.delete(ref);
    } catch (err) {
      console.warn("[workspace-folder-delete] storage cleanup failed", {
        folderId: cleanFolderId,
        errorCategory:
          err instanceof Error && err.name ? err.name : "UnknownError",
      });
    }
  }

  return {
    folderId: cleanFolderId,
    folderName: folder.name,
    deletedFolderCount: subtreeIds.length,
    impact: {
      descendantFolderCount: subtreeIds.length - 1,
      documentCount,
    },
  };
}
