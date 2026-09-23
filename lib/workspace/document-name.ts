/**
 * Canonical workspace document display name normalization (server authority).
 */

export const MAX_WORKSPACE_DOCUMENT_NAME_LENGTH = 120;

export type WorkspaceDocumentNameValidationResult =
  | { ok: true; name: string }
  | { ok: false; code: "NAME_REQUIRED" | "NAME_INVALID"; message: string };

export function normalizeWorkspaceDocumentName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateWorkspaceDocumentName(
  raw: string,
): WorkspaceDocumentNameValidationResult {
  const name = normalizeWorkspaceDocumentName(raw);
  if (!name) {
    return {
      ok: false,
      code: "NAME_REQUIRED",
      message: "Der Name darf nicht leer sein.",
    };
  }
  if (name.length > MAX_WORKSPACE_DOCUMENT_NAME_LENGTH) {
    return {
      ok: false,
      code: "NAME_INVALID",
      message: `Der Name darf höchstens ${MAX_WORKSPACE_DOCUMENT_NAME_LENGTH} Zeichen haben.`,
    };
  }
  return { ok: true, name };
}
