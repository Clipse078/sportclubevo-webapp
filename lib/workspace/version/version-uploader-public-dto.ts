/** Neutral label when version actor identity cannot be resolved safely. */
export const WORKSPACE_VERSION_UPLOADER_UNAVAILABLE = "Nicht verfügbar";

export type WorkspaceVersionUploaderPublicDto = {
  displayName: string;
};

export function toWorkspaceVersionUploaderPublicDto(
  createdByUserId: string | null | undefined,
  displayNames: ReadonlyMap<string, string>,
): WorkspaceVersionUploaderPublicDto {
  if (!createdByUserId?.trim()) {
    return { displayName: WORKSPACE_VERSION_UPLOADER_UNAVAILABLE };
  }

  const displayName = displayNames.get(createdByUserId.trim());
  if (!displayName) {
    return { displayName: WORKSPACE_VERSION_UPLOADER_UNAVAILABLE };
  }

  return { displayName };
}
