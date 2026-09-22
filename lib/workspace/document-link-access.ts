/**
 * WORKSPACE-06 — lifecycle-aware direct link authorization (zero disclosure).
 */

import { WorkspaceDocumentStatus, WorkspaceResourceType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { resolveWorkspaceActorFromSessionUser } from "@/lib/workspace/access/actor-context";
import {
  canWorkspaceView,
  hasWorkspaceTenantViewCapability,
} from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceDocumentAccessContext } from "@/lib/workspace/document-access";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { deriveWorkspaceFolderLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";

export type WorkspaceDirectLinkAccess =
  | { allowed: false }
  | {
      allowed: true;
      lifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED";
      documentId: string;
      folderId: string | null;
    };

export async function resolveWorkspaceDocumentDirectLinkAccess(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
): Promise<WorkspaceDirectLinkAccess> {
  if (!hasWorkspaceTenantViewCapability(ctx.permissionKeys)) {
    return { allowed: false };
  }

  const row = await prisma.workspaceDocument.findFirst({
    where: { id: documentId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      folderId: true,
      status: true,
      archivedAt: true,
      trashedAt: true,
    },
  });

  if (!row) {
    return { allowed: false };
  }

  const actor = await resolveWorkspaceActorFromSessionUser({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    permissionKeys: ctx.permissionKeys,
  });

  const canView = canWorkspaceView(actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: row.id,
  });

  if (!canView) {
    return { allowed: false };
  }

  return {
    allowed: true,
    lifecycle: deriveWorkspaceDocumentLifecycle(row),
    documentId: row.id,
    folderId: row.folderId,
  };
}

export async function resolveWorkspaceFolderDirectLinkAccess(
  ctx: WorkspaceDocumentAccessContext,
  folderId: string,
): Promise<
  | { allowed: false }
  | { allowed: true; lifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED"; folderId: string }
> {
  if (!hasWorkspaceTenantViewCapability(ctx.permissionKeys)) {
    return { allowed: false };
  }

  const row = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, tenantId: ctx.tenantId },
    select: { id: true, archivedAt: true, trashedAt: true },
  });

  if (!row) {
    return { allowed: false };
  }

  const actor = await resolveWorkspaceActorFromSessionUser({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    permissionKeys: ctx.permissionKeys,
  });

  if (
    !canWorkspaceView(actor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: row.id,
    })
  ) {
    return { allowed: false };
  }

  return {
    allowed: true,
    lifecycle: deriveWorkspaceFolderLifecycle(row),
    folderId: row.id,
  };
}

/** Task picker remains ACTIVE-only; direct links use resolveWorkspaceDocumentDirectLinkAccess. */
export function isWorkspaceDocumentActiveForTaskPicker(row: {
  status: WorkspaceDocumentStatus;
  archivedAt: Date | null;
  trashedAt: Date | null;
}): boolean {
  return (
    row.status === WorkspaceDocumentStatus.ACTIVE &&
    row.archivedAt === null &&
    row.trashedAt === null
  );
}
