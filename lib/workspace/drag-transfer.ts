/**
 * WORKSPACE-03 — distinguish internal workspace drags from external file uploads.
 */

export const WORKSPACE_INTERNAL_DRAG_MIME =
  "application/x-sce-workspace-resource+json";

export type WorkspaceInternalDragPayload =
  | { kind: "FOLDER"; folderId: string; folderName: string }
  | { kind: "DOCUMENT"; documentId: string; documentName: string };

export function isExternalFileDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (dataTransfer.types.includes(WORKSPACE_INTERNAL_DRAG_MIME)) {
    return false;
  }
  return (
    dataTransfer.types.includes("Files") ||
    dataTransfer.types.includes("application/x-moz-file")
  );
}

export function readInternalDragPayload(
  dataTransfer: DataTransfer,
): WorkspaceInternalDragPayload | null {
  const raw = dataTransfer.getData(WORKSPACE_INTERNAL_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkspaceInternalDragPayload;
    if (parsed.kind === "FOLDER" && parsed.folderId) return parsed;
    if (parsed.kind === "DOCUMENT" && parsed.documentId) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeInternalDragPayload(
  dataTransfer: DataTransfer,
  payload: WorkspaceInternalDragPayload,
): void {
  dataTransfer.setData(
    WORKSPACE_INTERNAL_DRAG_MIME,
    JSON.stringify(payload),
  );
  dataTransfer.effectAllowed = "move";
}
