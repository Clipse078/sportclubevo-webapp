/**
 * lib/workspace/document-delete-service.ts
 *
 * WORKSPACE-06 — reference-safe permanent hard-delete for WorkspaceDocument.
 */

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { workspaceStorageProvider } from "@/lib/workspace/upload-storage";
import {
  canPermanentlyDeleteWorkspaceDocument,
  getWorkspaceDocumentDeletionBlockers,
  WORKSPACE_DELETION_BLOCKED_CODE,
  type WorkspaceDeletionBlocker,
} from "@/lib/workspace/deletion/deletion-blockers";

export type WorkspaceDocumentDeleteServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | typeof WORKSPACE_DELETION_BLOCKED_CODE;

export class WorkspaceDocumentDeleteServiceError extends Error {
  readonly code: WorkspaceDocumentDeleteServiceErrorCode;
  readonly blockers?: WorkspaceDeletionBlocker[];

  constructor(
    code: WorkspaceDocumentDeleteServiceErrorCode,
    message: string,
    blockers?: WorkspaceDeletionBlocker[],
  ) {
    super(message);
    this.name = "WorkspaceDocumentDeleteServiceError";
    this.code = code;
    this.blockers = blockers;
  }
}

export type DocumentDeletionImpact = {
  versionCount: number;
  referenceBlockers: WorkspaceDeletionBlocker[];
};

export type DeleteWorkspaceDocumentResult = {
  documentId: string;
  documentName: string;
  impact: Omit<DocumentDeletionImpact, "referenceBlockers">;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceDocumentDeleteServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

export async function getWorkspaceDocumentDeletionImpact(
  tenantId: string,
  documentId: string,
): Promise<DocumentDeletionImpact | null> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanDocumentId = normalizeRequiredText(documentId, "documentId");

  const document = await prisma.workspaceDocument.findUnique({
    where: { id: cleanDocumentId },
    select: {
      id: true,
      tenantId: true,
      _count: { select: { versions: true } },
    },
  });

  if (!document || document.tenantId !== cleanTenantId) {
    return null;
  }

  const referenceBlockers = await getWorkspaceDocumentDeletionBlockers(
    prisma,
    cleanTenantId,
    cleanDocumentId,
  );

  return {
    versionCount: document._count.versions,
    referenceBlockers,
  };
}

export async function deleteWorkspaceDocumentPermanently(
  tenantId: string,
  documentId: string,
  actorUserId?: string | null,
): Promise<DeleteWorkspaceDocumentResult> {
  const cleanTenantId = normalizeRequiredText(tenantId, "tenantId");
  const cleanDocumentId = normalizeRequiredText(documentId, "documentId");

  const storageReferences: string[] = [];
  let documentName = "";
  let versionCount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT "id" FROM "WorkspaceDocument"
      WHERE "id" = ${cleanDocumentId} AND "tenantId" = ${cleanTenantId}
      FOR UPDATE
    `;

    const document = await tx.workspaceDocument.findFirst({
      where: { id: cleanDocumentId, tenantId: cleanTenantId },
      select: {
        id: true,
        name: true,
        versions: {
          select: { storageKey: true },
        },
      },
    });

    if (!document) {
      throw new WorkspaceDocumentDeleteServiceError(
        "DOCUMENT_NOT_FOUND",
        "Dokument nicht gefunden.",
      );
    }

    const deletionCheck = await canPermanentlyDeleteWorkspaceDocument(
      tx,
      cleanTenantId,
      cleanDocumentId,
    );

    if (!deletionCheck.allowed) {
      await writeWorkspaceGovernanceAudit(tx, {
        tenantId: cleanTenantId,
        actorUserId: actorUserId ?? null,
        entityType: "WorkspaceDocument",
        entityId: cleanDocumentId,
        documentId: cleanDocumentId,
        action: WorkspaceAuditAction.DOCUMENT_PERMANENT_DELETE_BLOCKED,
        outcome: "DENIED",
        reason: "RESOURCE_REFERENCED",
        afterJson: {
          blockerCount: deletionCheck.blockers.length,
          blockerKinds: deletionCheck.blockers.map((b) => b.kind),
        },
      });
      throw new WorkspaceDocumentDeleteServiceError(
        WORKSPACE_DELETION_BLOCKED_CODE,
        "Das Dokument kann nicht endgültig gelöscht werden, solange durable Referenzen bestehen.",
        deletionCheck.blockers,
      );
    }

    documentName = document.name;
    versionCount = document.versions.length;
    storageReferences.push(...document.versions.map((v) => v.storageKey));

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId: cleanTenantId,
      actorUserId: actorUserId ?? null,
      entityType: "WorkspaceDocument",
      entityId: cleanDocumentId,
      documentId: cleanDocumentId,
      action: WorkspaceAuditAction.DOCUMENT_PERMANENTLY_DELETED,
      afterJson: { versionCount },
    });

    await tx.workspaceDocument.delete({
      where: { id: cleanDocumentId },
    });
  });

  for (const ref of storageReferences) {
    try {
      await workspaceStorageProvider.delete(ref);
    } catch (err) {
      console.warn("[workspace-document-delete] storage cleanup failed", {
        operation: "delete",
        documentId: cleanDocumentId,
        errorCategory:
          err instanceof Error && err.name ? err.name : "UnknownError",
      });
    }
  }

  return {
    documentId: cleanDocumentId,
    documentName,
    impact: { versionCount },
  };
}
