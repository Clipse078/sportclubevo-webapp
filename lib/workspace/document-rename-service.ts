import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { writeWorkspaceGovernanceAudit } from "@/lib/workspace/audit/workspace-audit-write";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import {
  validateWorkspaceDocumentName,
  type WorkspaceDocumentNameValidationResult,
} from "@/lib/workspace/document-name";

export type WorkspaceDocumentRenameServiceErrorCode =
  | "INVALID_INPUT"
  | "DOCUMENT_NOT_FOUND"
  | "TENANT_FORBIDDEN"
  | "DUPLICATE_DOCUMENT_NAME"
  | "INVALID_LIFECYCLE_STATE"
  | "RENAME_FAILED";

export class WorkspaceDocumentRenameServiceError extends Error {
  readonly code: WorkspaceDocumentRenameServiceErrorCode;

  constructor(
    code: WorkspaceDocumentRenameServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceDocumentRenameServiceError";
    this.code = code;
  }
}

function mapNameValidation(
  result: Extract<WorkspaceDocumentNameValidationResult, { ok: false }>,
): never {
  throw new WorkspaceDocumentRenameServiceError(
    result.code === "NAME_REQUIRED" ? "INVALID_INPUT" : "INVALID_INPUT",
    result.message,
  );
}

export async function renameWorkspaceDocument(input: {
  tenantId: string;
  actorUserId: string;
  documentId: string;
  name: string;
}): Promise<{ documentId: string; name: string }> {
  const tenantId = input.tenantId.trim();
  const actorUserId = input.actorUserId.trim();
  const documentId = input.documentId.trim();

  if (!tenantId || !actorUserId || !documentId) {
    throw new WorkspaceDocumentRenameServiceError(
      "INVALID_INPUT",
      "Ungültige Eingabe.",
    );
  }

  const validation = validateWorkspaceDocumentName(input.name);
  if (!validation.ok) {
    mapNameValidation(validation);
  }
  const name = validation.name;

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
    throw new WorkspaceDocumentRenameServiceError(
      "DOCUMENT_NOT_FOUND",
      "Dokument nicht gefunden.",
    );
  }

  if (existing.tenantId !== tenantId) {
    throw new WorkspaceDocumentRenameServiceError(
      "TENANT_FORBIDDEN",
      "Das Dokument gehört nicht zu diesem Mandanten.",
    );
  }

  if (deriveWorkspaceDocumentLifecycle(existing) !== "ACTIVE") {
    throw new WorkspaceDocumentRenameServiceError(
      "INVALID_LIFECYCLE_STATE",
      "Nur aktive Dokumente können umbenannt werden.",
    );
  }

  if (existing.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0) {
    return { documentId: existing.id, name: existing.name };
  }

  const duplicate = await prisma.workspaceDocument.findFirst({
    where: {
      tenantId,
      folderId: existing.folderId,
      status: WorkspaceDocumentStatus.ACTIVE,
      id: { not: existing.id },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new WorkspaceDocumentRenameServiceError(
      "DUPLICATE_DOCUMENT_NAME",
      "In diesem Ordner existiert bereits ein Dokument mit diesem Namen.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.workspaceDocument.updateMany({
      where: {
        id: documentId,
        tenantId,
        status: WorkspaceDocumentStatus.ACTIVE,
        trashedAt: null,
        archivedAt: null,
      },
      data: {
        name,
        updatedByUserId: actorUserId,
      },
    });

    if (row.count !== 1) {
      throw new WorkspaceDocumentRenameServiceError(
        "RENAME_FAILED",
        "Das Dokument konnte nicht umbenannt werden.",
      );
    }

    await writeWorkspaceGovernanceAudit(tx, {
      tenantId,
      actorUserId,
      entityType: "WorkspaceDocument",
      entityId: documentId,
      documentId,
      action: WorkspaceAuditAction.DOCUMENT_RENAMED,
      beforeJson: { name: existing.name },
      afterJson: { name },
    });

    return { documentId, name };
  });

  return updated;
}
