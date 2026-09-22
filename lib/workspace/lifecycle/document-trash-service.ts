import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";

export type WorkspaceDocumentTrashServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "DOCUMENT_ALREADY_TRASHED"
  | "INVALID_LIFECYCLE_STATE";

export class WorkspaceDocumentTrashServiceError extends Error {
  readonly code: WorkspaceDocumentTrashServiceErrorCode;

  constructor(
    code: WorkspaceDocumentTrashServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentTrashServiceError";
    this.code = code;
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new WorkspaceDocumentTrashServiceError(
      "INVALID_INPUT",
      `${fieldName} is required.`,
    );
  }
  return normalized;
}

export async function trashWorkspaceDocument(input: {
  tenantId: string;
  actorUserId: string;
  documentId: string;
}): Promise<{ documentId: string; trashedAt: Date }> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const actorUserId = normalizeRequiredText(input.actorUserId, "actorUserId");
  const documentId = normalizeRequiredText(input.documentId, "documentId");

  const existing = await prisma.workspaceDocument.findUnique({
    where: { id: documentId },
    select: { id: true, tenantId: true, status: true, archivedAt: true, trashedAt: true },
  });

  if (!existing) {
    throw new WorkspaceDocumentTrashServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }
  if (existing.tenantId !== tenantId) {
    throw new WorkspaceDocumentTrashServiceError(
      "TENANT_FORBIDDEN",
      "Das Dokument gehört nicht zu diesem Mandanten.",
    );
  }

  const lifecycle = deriveWorkspaceDocumentLifecycle(existing);
  if (lifecycle === "TRASHED") {
    throw new WorkspaceDocumentTrashServiceError(
      "DOCUMENT_ALREADY_TRASHED",
      "Das Dokument ist bereits im Papierkorb.",
    );
  }

  const trashedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceDocument.update({
      where: { id: documentId },
      data: {
        status: WorkspaceDocumentStatus.TRASHED,
        trashedAt,
        updatedByUserId: actorUserId,
      },
      select: { id: true, trashedAt: true },
    });

    if (!updated.trashedAt) {
      throw new Error("Trash update did not persist trashedAt.");
    }

    await writeAuditRecord(tx, {
      tenantId,
      actorUserId,
      moduleKey: "workspace",
      entityType: "WorkspaceDocument",
      entityId: documentId,
      action: "PRIVATE_DOCUMENT_TRASHED",
      beforeJson: { status: existing.status },
      afterJson: { status: WorkspaceDocumentStatus.TRASHED },
    });

    return { documentId: updated.id, trashedAt: updated.trashedAt };
  });
}

export async function restoreWorkspaceDocumentFromTrash(input: {
  tenantId: string;
  actorUserId: string;
  documentId: string;
}): Promise<{ documentId: string; status: WorkspaceDocumentStatus }> {
  const tenantId = normalizeRequiredText(input.tenantId, "tenantId");
  const actorUserId = normalizeRequiredText(input.actorUserId, "actorUserId");
  const documentId = normalizeRequiredText(input.documentId, "documentId");

  const existing = await prisma.workspaceDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      archivedAt: true,
      trashedAt: true,
      folderId: true,
      folder: { select: { trashedAt: true, archivedAt: true } },
    },
  });

  if (!existing) {
    throw new WorkspaceDocumentTrashServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }
  if (existing.tenantId !== tenantId) {
    throw new WorkspaceDocumentTrashServiceError(
      "TENANT_FORBIDDEN",
      "Das Dokument gehört nicht zu diesem Mandanten.",
    );
  }
  if (existing.status !== WorkspaceDocumentStatus.TRASHED) {
    throw new WorkspaceDocumentTrashServiceError(
      "INVALID_LIFECYCLE_STATE",
      "Das Dokument ist nicht im Papierkorb.",
    );
  }

  if (existing.folder?.trashedAt) {
    throw new WorkspaceDocumentTrashServiceError(
      "INVALID_LIFECYCLE_STATE",
      "Der übergeordnete Ordner ist im Papierkorb.",
    );
  }

  const restoreArchived =
    existing.archivedAt !== null ||
    existing.status === WorkspaceDocumentStatus.TRASHED;

  const nextStatus =
    existing.archivedAt !== null
      ? WorkspaceDocumentStatus.ARCHIVED
      : WorkspaceDocumentStatus.ACTIVE;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceDocument.update({
      where: { id: documentId },
      data: {
        status: nextStatus,
        trashedAt: null,
        archivedAt:
          nextStatus === WorkspaceDocumentStatus.ARCHIVED
            ? existing.archivedAt ?? new Date()
            : null,
        updatedByUserId: actorUserId,
      },
      select: { id: true, status: true },
    });

    await writeAuditRecord(tx, {
      tenantId,
      actorUserId,
      moduleKey: "workspace",
      entityType: "WorkspaceDocument",
      entityId: documentId,
      action: "PRIVATE_DOCUMENT_RESTORED_FROM_TRASH",
      beforeJson: { status: existing.status, restoreArchived },
      afterJson: { status: updated.status },
    });

    return { documentId: updated.id, status: updated.status };
  });
}
