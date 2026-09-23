/**
 * W09-07 — canonical Workspace action capability (server-derived; not a security boundary).
 */

import { WorkspaceDocumentStatus } from "@prisma/client";

import {
  canWorkspaceEdit,
  canWorkspaceManage,
  canWorkspaceView,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { WorkspaceResourceType } from "@prisma/client";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { deriveWorkspaceFolderLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export type WorkspaceResourceAvailableActionsDto = {
  view: boolean;
  preview: boolean;
  download: boolean;
  favorite: boolean;
  rename: boolean;
  move: boolean;
  createFolder: boolean;
  uploadDocument: boolean;
  uploadVersion: boolean;
  manageAccess: boolean;
  createTask: boolean;
  createRequirement: boolean;
  archive: boolean;
  trash: boolean;
  restore: boolean;
  permanentDelete: boolean;
};

export type WorkspaceDocumentActionInput = {
  status: WorkspaceDocumentStatus;
  archivedAt: Date | null;
  trashedAt: Date | null;
  hasCurrentVersion: boolean;
  mimeType: string | null;
  contentAvailable: boolean;
};

export type WorkspaceFolderActionInput = {
  archivedAt: Date | null;
  trashedAt: Date | null;
};

export type WorkspaceDualDomainWorkflowFlags = {
  canCreateTask: boolean;
  canCreateRequirement: boolean;
};

function tenantHasDeletePermission(permissionKeys: readonly string[]): boolean {
  return permissionKeys.includes(PERMISSIONS.WORKSPACE_DELETE);
}

export function computeWorkspaceDocumentAvailableActions(input: {
  actor: WorkspaceActorContext;
  documentId: string;
  document: WorkspaceDocumentActionInput;
  tenantCanDelete: boolean;
  workflow?: WorkspaceDualDomainWorkflowFlags;
}): WorkspaceResourceAvailableActionsDto {
  const workflow = input.workflow ?? {
    canCreateTask: false,
    canCreateRequirement: false,
  };

  const canView = canWorkspaceView(input.actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: input.documentId,
  });

  if (!canView) {
    return emptyAvailableActions();
  }

  const lifecycle = deriveWorkspaceDocumentLifecycle({
    status: input.document.status,
    archivedAt: input.document.archivedAt,
    trashedAt: input.document.trashedAt,
  });

  const canEdit = canWorkspaceEdit(input.actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: input.documentId,
  });
  const canManage = canWorkspaceManage(input.actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: input.documentId,
  });

  const hasVersion = input.document.hasCurrentVersion;
  const contentOk = input.document.contentAvailable;
  const mime = input.document.mimeType ?? "";
  const previewMimeOk = isWorkspaceInlinePreviewSupported(mime);

  const active = lifecycle === "ACTIVE";
  const archived = lifecycle === "ARCHIVED";
  const trashed = lifecycle === "TRASHED";

  return {
    view: true,
    preview: hasVersion && contentOk && previewMimeOk,
    download: hasVersion && contentOk,
    favorite: true,
    rename: canEdit && active,
    move: canEdit && active,
    createFolder: false,
    uploadDocument: false,
    uploadVersion: canEdit && active && hasVersion,
    manageAccess: canManage,
    createTask: workflow.canCreateTask && (active || archived),
    createRequirement: workflow.canCreateRequirement && active,
    archive: canEdit && active,
    trash: canEdit && (active || archived),
    restore: canEdit && (archived || trashed),
    permanentDelete:
      input.tenantCanDelete && canManage && trashed,
  };
}

export function computeWorkspaceFolderAvailableActions(input: {
  actor: WorkspaceActorContext;
  folderId: string;
  folder: WorkspaceFolderActionInput;
  tenantCanDelete: boolean;
}): WorkspaceResourceAvailableActionsDto {
  const canView = canWorkspaceView(input.actor, {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId: input.folderId,
  });

  if (!canView) {
    return emptyAvailableActions();
  }

  const lifecycle = deriveWorkspaceFolderLifecycle(input.folder);
  const canEdit = canWorkspaceEdit(input.actor, {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId: input.folderId,
  });
  const canManage = canWorkspaceManage(input.actor, {
    resourceType: WorkspaceResourceType.FOLDER,
    folderId: input.folderId,
  });

  const active = lifecycle === "ACTIVE";
  const archived = lifecycle === "ARCHIVED";
  const trashed = lifecycle === "TRASHED";

  return {
    view: true,
    preview: false,
    download: false,
    favorite: true,
    rename: canEdit && active,
    move: canEdit && active,
    createFolder: canEdit && active,
    uploadDocument: canEdit && active,
    uploadVersion: false,
    manageAccess: canManage,
    createTask: false,
    createRequirement: false,
    archive: canEdit && active,
    trash: canEdit && (active || archived),
    restore: canEdit && (archived || trashed),
    permanentDelete:
      input.tenantCanDelete && canManage && trashed,
  };
}

export function emptyAvailableActions(): WorkspaceResourceAvailableActionsDto {
  return {
    view: false,
    preview: false,
    download: false,
    favorite: false,
    rename: false,
    move: false,
    createFolder: false,
    uploadDocument: false,
    uploadVersion: false,
    manageAccess: false,
    createTask: false,
    createRequirement: false,
    archive: false,
    trash: false,
    restore: false,
    permanentDelete: false,
  };
}

export function tenantCanDeleteWorkspaceResources(
  permissionKeys: readonly string[],
): boolean {
  return tenantHasDeletePermission(permissionKeys);
}
