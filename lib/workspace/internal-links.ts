/**
 * WORKSPACE-06 — stable ID-based internal links (never grant access).
 */

export type WorkspaceInternalLinkTarget =
  | { type: "folder"; folderId: string }
  | { type: "document"; documentId: string; versionId?: string | null };

const STORAGE_OR_TOKEN_PATTERN =
  /(?:storage|blob|token|share|password|expires)=/i;

export function buildWorkspaceInternalLink(
  target: WorkspaceInternalLinkTarget,
): string {
  const params = new URLSearchParams();

  if (target.type === "folder") {
    params.set("folder", target.folderId);
  } else {
    params.set("document", target.documentId);
    if (target.versionId?.trim()) {
      params.set("version", target.versionId.trim());
    }
  }

  const qs = params.toString();
  const path = `/dashboard/workspace?${qs}`;

  if (STORAGE_OR_TOKEN_PATTERN.test(path)) {
    throw new Error("Internal workspace links must not embed storage or tokens.");
  }

  return path;
}

export function parseWorkspaceInternalLinkSearchParams(input: {
  folder?: string | null;
  document?: string | null;
  version?: string | null;
}): WorkspaceInternalLinkTarget | null {
  const documentId = input.document?.trim();
  const folderId = input.folder?.trim();
  const versionId = input.version?.trim();

  if (documentId) {
    return {
      type: "document",
      documentId,
      versionId: versionId || null,
    };
  }

  if (folderId) {
    return { type: "folder", folderId };
  }

  return null;
}
