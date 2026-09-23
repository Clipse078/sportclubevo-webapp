/**
 * W09-01 stub — full server DTO planned for W09-07 (mobile/BFF).
 */

import type { WorkspaceCommandContextState } from "./workspace-command-context";

export type WorkspaceAvailableActionsDto = {
  primary: string[];
  secondary: string[];
  overflow: string[];
  destructive: string[];
  disabledReasons: Record<string, string>;
};

export function stubWorkspaceAvailableActions(
  context: WorkspaceCommandContextState,
): WorkspaceAvailableActionsDto {
  const primary: string[] = [];
  const secondary: string[] = [];
  const overflow: string[] = [];
  const destructive: string[] = [];

  if (context.lifecycleView === "active") {
    if (context.selection.kind === "NONE" || context.selection.kind === "FOLDER") {
      if (context.capabilities.canCreateFolder) primary.push("create_folder");
      if (context.capabilities.canUpload) primary.push("upload");
    }
    if (context.selection.kind === "DOCUMENT") {
      if (context.capabilities.canDownloadDocument) primary.push("download");
      if (context.capabilities.canUploadNewVersion) primary.push("new_version");
      if (context.capabilities.canOpenVersionHistory) {
        secondary.push("version_history");
      }
    }
  }

  if (context.capabilities.canManageFolder) overflow.push("manage_folder_access");

  return {
    primary,
    secondary,
    overflow,
    destructive,
    disabledReasons: {},
  };
}
