/**
 * WORKSPACE-07 — tenant-safe WorkspaceDocumentVersion link validation.
 */

import { prisma } from "@/lib/db/prisma";
import {
  assertWorkspaceDocumentLinkable,
  type WorkspaceDocumentAccessContext,
} from "@/lib/workspace/document-access";

export class WorkspaceVersionLinkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceVersionLinkValidationError";
  }
}

export type ResolvedWorkspaceDocumentVersionLink = {
  tenantId: string;
  documentId: string;
  workspaceDocumentVersionId: string;
  versionNumber: number;
};

export async function resolveWorkspaceDocumentVersionForLink(
  ctx: WorkspaceDocumentAccessContext,
  input: {
    documentId: string;
    workspaceDocumentVersionId?: string | null;
  },
): Promise<ResolvedWorkspaceDocumentVersionLink> {
  const documentId = input.documentId.trim();
  if (!documentId) {
    throw new WorkspaceVersionLinkValidationError("documentId is required");
  }

  await assertWorkspaceDocumentLinkable(ctx, documentId);

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: documentId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      currentVersionId: true,
    },
  });

  if (!document) {
    throw new WorkspaceVersionLinkValidationError("Document not found");
  }

  const requestedVersionId = input.workspaceDocumentVersionId?.trim() || null;
  const versionId = requestedVersionId ?? document.currentVersionId?.trim() ?? null;

  if (!versionId) {
    throw new WorkspaceVersionLinkValidationError("Document has no version");
  }

  const version = await prisma.workspaceDocumentVersion.findFirst({
    where: {
      id: versionId,
      tenantId: ctx.tenantId,
      documentId: document.id,
    },
    select: {
      id: true,
      tenantId: true,
      documentId: true,
      versionNumber: true,
    },
  });

  if (!version) {
    throw new WorkspaceVersionLinkValidationError("Version not found for document");
  }

  if (version.tenantId !== ctx.tenantId || document.tenantId !== ctx.tenantId) {
    throw new WorkspaceVersionLinkValidationError("Tenant mismatch");
  }

  return {
    tenantId: ctx.tenantId,
    documentId: document.id,
    workspaceDocumentVersionId: version.id,
    versionNumber: version.versionNumber,
  };
}

export async function listAuthorizedWorkspaceDocumentVersions(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
): Promise<
  | {
      ok: true;
      currentVersionId: string | null;
      versions: { id: string; versionNumber: number; filename: string; createdAt: string }[];
    }
  | { ok: false }
> {
  try {
    await assertWorkspaceDocumentLinkable(ctx, documentId.trim());
  } catch {
    return { ok: false };
  }

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: documentId.trim(), tenantId: ctx.tenantId },
    select: {
      currentVersionId: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          filename: true,
          createdAt: true,
        },
      },
    },
  });

  if (!document) return { ok: false };

  return {
    ok: true,
    currentVersionId: document.currentVersionId,
    versions: document.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      filename: v.filename,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

export async function loadWorkspaceDocumentVersionForTenantValidation(
  ctx: WorkspaceDocumentAccessContext,
  workspaceDocumentVersionId: string,
): Promise<ResolvedWorkspaceDocumentVersionLink> {
  const versionId = workspaceDocumentVersionId.trim();
  if (!versionId) {
    throw new WorkspaceVersionLinkValidationError("workspaceDocumentVersionId is required");
  }

  const version = await prisma.workspaceDocumentVersion.findFirst({
    where: { id: versionId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      documentId: true,
      versionNumber: true,
      document: { select: { id: true, tenantId: true } },
    },
  });

  if (!version || version.document.tenantId !== ctx.tenantId) {
    throw new WorkspaceVersionLinkValidationError("Version not found");
  }

  await assertWorkspaceDocumentLinkable(ctx, version.documentId);

  return {
    tenantId: ctx.tenantId,
    documentId: version.documentId,
    workspaceDocumentVersionId: version.id,
    versionNumber: version.versionNumber,
  };
}
