/**
 * WORKSPACE-04 — canonical server-side Workspace upload policy.
 */

export {
  ALLOWED_WORKSPACE_MIME_TYPES,
  MAX_WORKSPACE_FILE_SIZE_BYTES,
  isAllowedWorkspaceMimeType,
  sanitizeWorkspaceFilename,
  validateWorkspaceUploadFile,
  type AllowedWorkspaceMimeType,
  type WorkspaceUploadValidationResult,
} from "@/lib/workspace/upload-types";

import {
  TeamDocumentValidationError,
  validateTeamDocumentUpload,
  type ValidatedTeamDocumentUpload,
} from "@/lib/teams/team-document-validation";

const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "ps1",
  "vbs",
  "js",
  "jse",
  "wsf",
  "sh",
  "bash",
  "php",
  "html",
  "htm",
  "svg",
  "dll",
  "app",
  "dmg",
  "jar",
]);

export function getFilenameExtension(filename: string): string {
  const leaf = filename.replaceAll("\\", "/").split("/").pop() ?? filename;
  const index = leaf.lastIndexOf(".");
  return index > -1 ? leaf.slice(index + 1).toLowerCase() : "";
}

export function isBlockedWorkspaceUploadExtension(filename: string): boolean {
  const extension = getFilenameExtension(filename);
  return extension.length > 0 && BLOCKED_UPLOAD_EXTENSIONS.has(extension);
}

export function assertAllowedWorkspaceUploadExtension(filename: string): void {
  if (isBlockedWorkspaceUploadExtension(filename)) {
    throw new TeamDocumentValidationError(
      "TYPE_NOT_ALLOWED",
      "Dieser Dateityp ist für Workspace-Uploads nicht erlaubt.",
    );
  }
}

export async function validateWorkspaceDocumentUpload(input: {
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
}): Promise<ValidatedTeamDocumentUpload> {
  assertAllowedWorkspaceUploadExtension(input.filename);
  return validateTeamDocumentUpload(input);
}

export { TeamDocumentValidationError };
