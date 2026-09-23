/**
 * W09-01 — client-side command context (visibility convenience only; server is authoritative).
 */

export type WorkspaceLifecycleView = "active" | "archived" | "trash";

export type WorkspaceCommandSelection =
  | { kind: "NONE" }
  | { kind: "DOCUMENT"; documentId: string }
  | { kind: "FOLDER"; folderId: string };

export type WorkspaceCommandCapabilities = {
  canUpload: boolean;
  canCreateFolder: boolean;
  canManageFolder: boolean;
  canDelete: boolean;
  /** Document selected — download allowed when a current version exists. */
  canDownloadDocument: boolean;
  /** W09-03 — new version upload (document EDIT, active lifecycle). */
  canUploadNewVersion: boolean;
  canEditDocument: boolean;
  canManageDocumentAccess: boolean;
  canCopyDocumentLink: boolean;
  canOpenVersionHistory: boolean;
};

export type WorkspaceCommandContextState = {
  lifecycleView: WorkspaceLifecycleView;
  folderId: string;
  folderName: string;
  selection: WorkspaceCommandSelection;
  capabilities: WorkspaceCommandCapabilities;
};

export function buildActiveFolderCommandContext(input: {
  folderId: string;
  folderName: string;
  canUpload: boolean;
  canCreateFolder: boolean;
  canManageFolder: boolean;
  canDelete: boolean;
  lifecycleView?: WorkspaceLifecycleView;
}): WorkspaceCommandContextState {
  return {
    lifecycleView: input.lifecycleView ?? "active",
    folderId: input.folderId,
    folderName: input.folderName,
    selection: { kind: "NONE" },
    capabilities: {
      canUpload: input.canUpload,
      canCreateFolder: input.canCreateFolder,
      canManageFolder: input.canManageFolder,
      canDelete: input.canDelete,
      canDownloadDocument: false,
      canUploadNewVersion: false,
      canEditDocument: false,
      canManageDocumentAccess: false,
      canCopyDocumentLink: false,
      canOpenVersionHistory: false,
    },
  };
}

export function withDocumentSelection(
  base: WorkspaceCommandContextState,
  document: {
    id: string;
    hasCurrentVersion: boolean;
    canEditDocument: boolean;
    canManageAccess: boolean;
    contentDeliveryAvailable?: boolean;
  },
): WorkspaceCommandContextState {
  const contentOk = document.contentDeliveryAvailable ?? true;
  return {
    ...base,
    selection: { kind: "DOCUMENT", documentId: document.id },
    capabilities: {
      ...base.capabilities,
      canDownloadDocument: document.hasCurrentVersion && contentOk,
      canUploadNewVersion:
        document.canEditDocument && document.hasCurrentVersion,
      canEditDocument: document.canEditDocument,
      canManageDocumentAccess: document.canManageAccess,
      canCopyDocumentLink: true,
      canOpenVersionHistory: true,
    },
  };
}
