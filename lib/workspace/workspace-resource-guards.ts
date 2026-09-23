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
import { recordWorkspaceAccessDeniedAudit } from "@/lib/workspace/audit/workspace-audit-denied";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";

function assertWithDeniedAudit(
  actor: WorkspaceActorContext,
  required: CanonicalResourceLevel,
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
  operation: "VIEW" | "EDIT" | "MANAGE" | "DOWNLOAD" | "PREVIEW" | "MUTATION",
): void {
  try {
    assertWorkspaceAccess(actor, required, resource);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      void recordWorkspaceAccessDeniedAudit({
        actor,
        required,
        resource,
        operation,
      });
    }
    throw error;
  }
}

export function assertWorkspaceDocumentView(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWithDeniedAudit(actor, "VIEW", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  }, "VIEW");
}

export function assertWorkspaceDocumentDownload(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWithDeniedAudit(actor, "VIEW", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  }, "DOWNLOAD");
}

export function assertWorkspaceDocumentEdit(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWithDeniedAudit(actor, "EDIT", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  }, "MUTATION");
}

export function assertWorkspaceDocumentManage(
  actor: WorkspaceActorContext,
  documentId: string,
): void {
  assertWithDeniedAudit(actor, "MANAGE", {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId,
  }, "MUTATION");
}

export function assertWorkspaceFolderView(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWithDeniedAudit(actor, "VIEW", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  }, "VIEW");
}

export function assertWorkspaceFolderEdit(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWithDeniedAudit(actor, "EDIT", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  }, "MUTATION");
}

export function assertWorkspaceFolderManage(
  actor: WorkspaceActorContext,
  folderId: string,
): void {
  assertWithDeniedAudit(actor, "MANAGE", {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId,
  }, "MUTATION");
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
