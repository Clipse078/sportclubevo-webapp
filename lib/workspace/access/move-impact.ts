/**
 * WORKSPACE-02-R1 — machine-readable folder move impact (backend contract for WORKSPACE-03).
 */

export const WORKSPACE_FOLDER_MOVE_OUTCOMES = [
  "ALLOWED_NO_ACCESS_CHANGE",
  "ALLOWED_ACCESS_REDUCTION",
  "DENIED_ACCESS_WIDENING",
  "DENIED_CROSS_TENANT",
  "DENIED_HIERARCHY_CYCLE",
  "DENIED_MALFORMED_GRAPH",
  "DENIED_INSUFFICIENT_SOURCE_ACCESS",
  "DENIED_INSUFFICIENT_DESTINATION_ACCESS",
  "DENIED_RESOURCE_NOT_FOUND",
] as const;

export type WorkspaceFolderMoveOutcome =
  (typeof WORKSPACE_FOLDER_MOVE_OUTCOMES)[number];

export type WorkspaceFolderMoveImpact = {
  outcome: WorkspaceFolderMoveOutcome;
  folderId: string;
  newParentId: string | null;
  /** Set when allowed or when denial is due to access envelope change. */
  accessChange?: "NONE" | "REDUCTION" | "WOULD_WIDEN";
};

export function isAllowedWorkspaceFolderMoveOutcome(
  outcome: WorkspaceFolderMoveOutcome,
): boolean {
  return (
    outcome === "ALLOWED_NO_ACCESS_CHANGE" ||
    outcome === "ALLOWED_ACCESS_REDUCTION"
  );
}

export const WORKSPACE_DOCUMENT_MOVE_OUTCOMES = [
  "ALLOWED_NO_ACCESS_CHANGE",
  "ALLOWED_ACCESS_REDUCTION",
  "DENIED_ACCESS_WIDENING",
  "DENIED_CROSS_TENANT",
  "DENIED_MALFORMED_GRAPH",
  "DENIED_INSUFFICIENT_SOURCE_ACCESS",
  "DENIED_INSUFFICIENT_DESTINATION_ACCESS",
  "DENIED_RESOURCE_NOT_FOUND",
  "DENIED_INVALID_DESTINATION",
] as const;

export type WorkspaceDocumentMoveOutcome =
  (typeof WORKSPACE_DOCUMENT_MOVE_OUTCOMES)[number];

export type WorkspaceDocumentMoveImpact = {
  outcome: WorkspaceDocumentMoveOutcome;
  documentId: string;
  newFolderId: string | null;
  accessChange?: "NONE" | "REDUCTION" | "WOULD_WIDEN";
};

export function isAllowedWorkspaceDocumentMoveOutcome(
  outcome: WorkspaceDocumentMoveOutcome,
): boolean {
  return (
    outcome === "ALLOWED_NO_ACCESS_CHANGE" ||
    outcome === "ALLOWED_ACCESS_REDUCTION"
  );
}
