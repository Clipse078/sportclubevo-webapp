import {
  WorkspaceBreakGlassScopeType,
  type WorkspaceBreakGlassSession,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { collectWorkspaceFolderSubtreeIds } from "@/lib/workspace/folder-subtree";

export type BreakGlassTargetInput =
  | { scopeType: typeof WorkspaceBreakGlassScopeType.DOCUMENT; documentId: string }
  | { scopeType: typeof WorkspaceBreakGlassScopeType.FOLDER_SUBTREE; folderId: string };

export async function validateBreakGlassTargetInTenant(
  tenantId: string,
  target: BreakGlassTargetInput,
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "CROSS_TENANT" }> {
  if (target.scopeType === WorkspaceBreakGlassScopeType.DOCUMENT) {
    const doc = await prisma.workspaceDocument.findFirst({
      where: { id: target.documentId, tenantId },
      select: { id: true },
    });
    return doc ? { ok: true } : { ok: false, code: "NOT_FOUND" };
  }

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: target.folderId, tenantId },
    select: { id: true },
  });
  return folder ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

export async function documentMatchesBreakGlassSessionScope(
  tenantId: string,
  documentId: string,
  session: Pick<
    WorkspaceBreakGlassSession,
    "tenantId" | "scopeType" | "workspaceDocumentId" | "workspaceFolderId"
  >,
): Promise<boolean> {
  if (session.tenantId !== tenantId) {
    return false;
  }

  if (session.scopeType === WorkspaceBreakGlassScopeType.DOCUMENT) {
    return session.workspaceDocumentId === documentId;
  }

  if (!session.workspaceFolderId) {
    return false;
  }

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: documentId, tenantId },
    select: { folderId: true },
  });

  if (!document?.folderId) {
    return false;
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(
    tenantId,
    session.workspaceFolderId,
  );
  return subtreeIds.includes(document.folderId);
}

export async function folderMatchesBreakGlassSessionScope(
  tenantId: string,
  folderId: string,
  session: Pick<
    WorkspaceBreakGlassSession,
    "tenantId" | "scopeType" | "workspaceFolderId"
  >,
): Promise<boolean> {
  if (session.tenantId !== tenantId) {
    return false;
  }

  if (session.scopeType !== WorkspaceBreakGlassScopeType.FOLDER_SUBTREE) {
    return false;
  }

  if (!session.workspaceFolderId) {
    return false;
  }

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(
    tenantId,
    session.workspaceFolderId,
  );
  return subtreeIds.includes(folderId);
}
