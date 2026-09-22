/**
 * WORKSPACE-02 — shared resource authorization guards for routes/services.
 */

import { WorkspaceResourceType } from "@prisma/client";

import {
  assertWorkspaceAccess,
  canWorkspaceView,
  hasWorkspaceTenantManageCapability,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";

export function assertWorkspaceDocumentView(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWorkspaceAccess(actor, "VIEW", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  });
}

export function assertWorkspaceDocumentEdit(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWorkspaceAccess(actor, "EDIT", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  });
}

export function assertWorkspaceDocumentManage(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWorkspaceAccess(actor, "MANAGE", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  });
}

export function assertWorkspaceFolderView(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWorkspaceAccess(actor, "VIEW", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  });
}

export function assertWorkspaceFolderEdit(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWorkspaceAccess(actor, "EDIT", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  });
}

export function assertWorkspaceFolderManage(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWorkspaceAccess(actor, "MANAGE", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  });
}

export function canViewWorkspaceDocument(
  actor: WorkspaceActorContext,
  documentId: string,
): boolean {
  return canWorkspaceView(actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  });
}

/**
 * Upload destination authorization — folder uploads require folder EDIT;
 * root uploads require tenant manage capability (same API gate as W03).
 */
export function assertWorkspaceUploadDestinationEdit(
  actor: WorkspaceActorContext,
  folderId: string | null,
): void {
  if (folderId) {
    assertWorkspaceFolderEdit(actor, folderId);
    return;
  }

  if (!hasWorkspaceTenantManageCapability(actor.permissionKeys)) {
    throw new WorkspaceAuthorizationError(
      "Workspace upload destination is not authorized.",
    );
  }
}
