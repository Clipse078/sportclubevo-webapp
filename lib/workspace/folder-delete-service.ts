/**
 * lib/workspace/folder-delete-service.ts
 *
 * WORKSPACE-06 + WORKSPACE-08-03 — folder subtree permanent delete via purge eligibility.
 */

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { collectWorkspaceFolderSubtreeIds } from "@/lib/workspace/folder-subtree";
import {
  getWorkspaceDocumentDeletionBlockers,
  WORKSPACE_DELETION_BLOCKED_CODE,
  type WorkspaceDeletionBlocker,
} from "@/lib/workspace/deletion/deletion-blockers";
import { evaluateWorkspaceFolderPurgeEligibility } from "@/lib/workspace/governance/folder-purge-eligibility";
import {
  purgeWorkspaceDocumentPermanently,
  WorkspaceDocumentPurgeError,
} from "@/lib/workspace/governance/workspace-document-purge-service";

export type WorkspaceFolderDeleteServiceErrorCode =
  | "INVALID_INPUT"
  | "FOLDER_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "NOT_TRASHED"
  | "RETENTION_NOT_EXPIRED"
  | "ACTIVE_GOVERNANCE_HOLD"
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
  actorUserId?: string | null,
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

  const folderEligibility = await evaluateWorkspaceFolderPurgeEligibility(
    prisma,
    { tenantId: cleanTenantId, folderId: cleanFolderId },
  );

  if (!folderEligibility) {
    throw new WorkspaceFolderDeleteServiceError(
      "FOLDER_NOT_FOUND",
      "Ordner nicht gefunden.",
    );
  }

  if (!folderEligibility.eligible) {
    const code =
      folderEligibility.status === "NOT_TRASHED"
        ? "NOT_TRASHED"
        : folderEligibility.status === "RETENTION_NOT_EXPIRED"
          ? "RETENTION_NOT_EXPIRED"
          : "ACTIVE_GOVERNANCE_HOLD";
    throw new WorkspaceFolderDeleteServiceError(
      code,
      "Ordner kann derzeit nicht endgültig gelöscht werden.",
    );
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(
    cleanTenantId,
    cleanFolderId,
  );

  const documents = await prisma.workspaceDocument.findMany({
    where: { tenantId: cleanTenantId, folderId: { in: subtreeIds } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const doc of documents) {
    try {
      await purgeWorkspaceDocumentPermanently({
        tenantId: cleanTenantId,
        documentId: doc.id,
        actorUserId: actorUserId ?? null,
        source: "folder-permanent-delete",
        requireTrashed: true,
      });
    } catch (err) {
      if (err instanceof WorkspaceDocumentPurgeError) {
        await prisma.$transaction(async (tx) => {
          await writeWorkspaceGovernanceAudit(tx, {
            tenantId: cleanTenantId,
            actorUserId: actorUserId ?? null,
            entityType: "WorkspaceFolder",
            entityId: cleanFolderId,
            folderId: cleanFolderId,
            action: WorkspaceAuditAction.FOLDER_PERMANENT_DELETE_BLOCKED,
            outcome: "DENIED",
            reason: err.eligibility?.status ?? err.code,
            afterJson: { documentId: doc.id },
          });
        });
        throw new WorkspaceFolderDeleteServiceError(
          err.code === WORKSPACE_DELETION_BLOCKED_CODE
            ? WORKSPACE_DELETION_BLOCKED_CODE
            : "ACTIVE_GOVERNANCE_HOLD",
          "Ordner kann nicht gelöscht werden: mindestens ein Dokument blockiert die Löschung.",
          err.eligibility && "blockers" in err.eligibility
            ? err.eligibility.blockers
            : undefined,
        );
      }
      throw err;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceFolder"
      WHERE "id" = ${cleanFolderId} AND "tenantId" = ${cleanTenantId}
      FOR UPDATE
    `;

    await tx.workspaceBreakGlassSession.deleteMany({
      where: {
        tenantId: cleanTenantId,
        workspaceFolderId: { in: subtreeIds },
      },
    });

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: cleanTenantId,
      actorUserId: actorUserId ?? null,
      entityType: "WorkspaceFolder",
      entityId: cleanFolderId,
      folderId: cleanFolderId,
      action: WorkspaceAuditAction.FOLDER_PERMANENTLY_DELETED,
      afterJson: {
        deletedFolderCount: subtreeIds.length,
        documentCount: documents.length,
      },
    });

    await tx.workspaceFolder.deleteMany({
      where: { tenantId: cleanTenantId, id: { in: subtreeIds } },
    });
  });

  return {
    folderId: cleanFolderId,
    folderName: folder.name,
    deletedFolderCount: subtreeIds.length,
    impact: {
      descendantFolderCount: subtreeIds.length - 1,
      documentCount: documents.length,
    },
  };
}
