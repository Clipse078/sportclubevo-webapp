/**
 * W09-07 — maps canonical availableActions to legacy command-bar tiers (web UX).
 */

import type { WorkspaceCommandContextState } from "./workspace-command-context";
import type { WorkspaceResourceAvailableActionsDto } from "./workspace-available-actions";

export type WorkspaceAvailableActionsDto = {
  primary: string[];
  secondary: string[];
  overflow: string[];
  destructive: string[];
  disabledReasons: Record<string, string>;
  /** Canonical boolean contract (mobile-ready). */
  capabilities: WorkspaceResourceAvailableActionsDto;
};

export function mapAvailableActionsToCommandTiers(
  actions: WorkspaceResourceAvailableActionsDto,
): Omit<WorkspaceAvailableActionsDto, "capabilities"> {
  const primary: string[] = [];
  const secondary: string[] = [];
  const overflow: string[] = [];
  const destructive: string[] = [];

  if (actions.uploadDocument) primary.push("upload");
  if (actions.createFolder) primary.push("create_folder");
  if (actions.download) primary.push("download");
  if (actions.uploadVersion) primary.push("new_version");
  if (actions.createTask) primary.push("create_task");
  if (actions.createRequirement) primary.push("create_requirement");
  if (actions.move) primary.push("move");

  if (actions.preview) secondary.push("preview");
  if (actions.view) secondary.push("version_history");

  if (actions.rename) overflow.push("rename");
  if (actions.manageAccess) overflow.push("manage_access");
  if (actions.archive) overflow.push("archive");
  if (actions.trash) overflow.push("trash");
  if (actions.manageAccess) overflow.push("manage_folder_access");

  if (actions.restore) primary.push("restore");
  if (actions.permanentDelete) destructive.push("permanent_delete");

  return {
    primary,
    secondary,
    overflow,
    destructive,
    disabledReasons: {},
  };
}

/** @deprecated Prefer `mapAvailableActionsToCommandTiers` + server `availableActions` on DTOs. */
export function stubWorkspaceAvailableActions(
  context: WorkspaceCommandContextState,
  canonical?: WorkspaceResourceAvailableActionsDto,
): WorkspaceAvailableActionsDto {
  const documentSelected = context.selection.kind === "DOCUMENT";
  const capabilities: WorkspaceResourceAvailableActionsDto = canonical ?? {
    view: true,
    preview: false,
    download: context.capabilities.canDownloadDocument,
    favorite: true,
    rename: context.capabilities.canEditDocument,
    move: context.capabilities.canEditDocument,
    createFolder: !documentSelected && context.capabilities.canCreateFolder,
    uploadDocument: !documentSelected && context.capabilities.canUpload,
    uploadVersion: context.capabilities.canUploadNewVersion,
    manageAccess: context.capabilities.canManageDocumentAccess,
    createTask: false,
    createRequirement: false,
    archive: context.capabilities.canEditDocument,
    trash: context.capabilities.canEditDocument,
    restore: false,
    permanentDelete: context.capabilities.canDelete,
  };

  const tiers = mapAvailableActionsToCommandTiers(capabilities);
  return { ...tiers, capabilities };
}
