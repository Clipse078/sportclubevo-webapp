import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { assertWorkspaceDocumentMoveAllowed } from "@/lib/workspace/access/document-move-authorization";
import { WorkspaceMoveValidationError } from "@/lib/workspace/access/move-validation";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import {
  deriveWorkspaceDocumentLifecycle,
  WORKSPACE_ACTIVE_FOLDER_WHERE,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";

export type WorkspaceDocumentMoveServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "DUPLICATE_DOCUMENT_NAME"
  | "INVALID_LIFECYCLE_STATE"
  | "INVALID_DESTINATION"
  | "MOVE_DENIED"
  | "MOVE_FAILED";

export class WorkspaceDocumentMoveServiceError extends Error {
  readonly code: WorkspaceDocumentMoveServiceErrorCode;

  constructor(code: WorkspaceDocumentMoveServiceErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceDocumentMoveServiceError";
    this.code = code;
  }
}

function normalizeFolderId(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function moveWorkspaceDocument(input: {
  tenantId: string;
  actorUserId: string;
  actor: WorkspaceActorContext;
  documentId: string;
  newFolderId: string | null;
}): Promise<{ documentId: string; folderId: string | null }> {
  const tenantId = input.tenantId.trim();
  const actorUserId = input.actorUserId.trim();
  const documentId = input.documentId.trim();
  const newFolderId = normalizeFolderId(input.newFolderId);

  if (!tenantId || !actorUserId || !documentId) {
    throw new WorkspaceDocumentMoveServiceError(
      "INVALID_INPUT",
      "Ungültige Eingabe.",
    );
  }

  const existing = await prisma.workspaceDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      tenantId: true,
      folderId: true,
      name: true,
      status: true,
      archivedAt: true,
      trashedAt: true,
    },
  });

  if (!existing) {
    throw new WorkspaceDocumentMoveServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  if (existing.tenantId !== tenantId) {
    throw new WorkspaceDocumentMoveServiceError(
      "TENANT_FORBIDDEN",
      "Das Dokument gehört nicht zu diesem Mandanten.",
    );
  }

  if (deriveWorkspaceDocumentLifecycle(existing) !== "ACTIVE") {
    throw new WorkspaceDocumentMoveServiceError(
      "INVALID_LIFECYCLE_STATE",
      "Nur aktive Dokumente können verschoben werden.",
    );
  }

  if (existing.folderId === newFolderId) {
    return { documentId: existing.id, folderId: existing.folderId };
  }

  if (newFolderId) {
    const destination = await prisma.workspaceFolder.findFirst({
      where: {
        id: newFolderId,
        tenantId,
        ...WORKSPACE_ACTIVE_FOLDER_WHERE,
      },
      select: { id: true },
    });

    if (!destination) {
      throw new WorkspaceDocumentMoveServiceError(
        "INVALID_DESTINATION",
        "Der Zielordner ist nicht verfügbar.",
      );
    }
  }

  try {
    assertWorkspaceDocumentMoveAllowed({
      actor: input.actor,
      documentId,
      newFolderId,
    });
  } catch (error) {
    if (error instanceof WorkspaceMoveValidationError) {
      throw new WorkspaceDocumentMoveServiceError(
        "MOVE_DENIED",
        "Verschieben nicht möglich (Berechtigungen würden erweitert).",
      );
    }
    throw error;
  }

  const duplicate = await prisma.workspaceDocument.findFirst({
    where: {
      tenantId,
      folderId: newFolderId,
      status: WorkspaceDocumentStatus.ACTIVE,
      id: { not: documentId },
      name: { equals: existing.name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new WorkspaceDocumentMoveServiceError(
      "DUPLICATE_DOCUMENT_NAME",
      "Im Zielordner existiert bereits ein Dokument mit diesem Namen.",
    );
  }

  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.workspaceDocument.updateMany({
      where: {
        id: documentId,
        tenantId,
        status: WorkspaceDocumentStatus.ACTIVE,
        trashedAt: null,
        archivedAt: null,
      },
      data: {
        folderId: newFolderId,
        updatedByUserId: actorUserId,
      },
    });

    if (result.count !== 1) {
      throw new WorkspaceDocumentMoveServiceError(
        "MOVE_FAILED",
        "Das Dokument konnte nicht verschoben werden.",
      );
    }

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId,
      actorUserId,
      entityType: "WorkspaceDocument",
      entityId: documentId,
      documentId,
      folderId: newFolderId ?? undefined,
      action: WorkspaceAuditAction.DOCUMENT_MOVED,
      beforeJson: { folderId: existing.folderId },
      afterJson: { folderId: newFolderId },
    });

    return { documentId, folderId: newFolderId };
  });

  return moved;
}
