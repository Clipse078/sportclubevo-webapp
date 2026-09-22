/**
 * WORKSPACE-05 — canonical version-domain contract (immutable historical facts).
 *
 * Invariants V1–V15 are documented in docs/workspace/WORKSPACE-05-INVARIANTS.md.
 */

export type WorkspaceDocumentVersionRef = {
  tenantId: string;
  documentId: string;
  versionId: string;
};

export const WORKSPACE_VERSION_RESTORE_CHANGE_NOTE_PREFIX =
  "RESTORED_FROM_VERSION:" as const;

/** Fields that must never be rewritten on an existing version row. */
export const WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS = [
  "id",
  "documentId",
  "versionNumber",
  "storageKey",
  "sizeBytes",
  "mimeType",
  "checksum",
  "createdAt",
  "createdByUserId",
] as const;

export function buildWorkspaceDocumentVersionRef(input: {
  tenantId: string;
  documentId: string;
  versionId: string;
}): WorkspaceDocumentVersionRef {
  return {
    tenantId: input.tenantId.trim(),
    documentId: input.documentId.trim(),
    versionId: input.versionId.trim(),
  };
}

/**
 * Future acknowledgement / Task / Requirement references must target an exact
 * version id — never implicit "latest".
 */
export function isValidImmutableVersionReferenceTarget(versionId: string): boolean {
  return versionId.trim().length > 0;
}

export function deriveWorkspaceVersionIsCurrent(
  documentCurrentVersionId: string | null,
  versionId: string,
): boolean {
  return documentCurrentVersionId === versionId;
}

export function compareWorkspaceDocumentVersionOrder(
  left: { versionNumber: number; createdAt: Date; id: string },
  right: { versionNumber: number; createdAt: Date; id: string },
): number {
  if (left.versionNumber !== right.versionNumber) {
    return right.versionNumber - left.versionNumber;
  }

  const leftTime = left.createdAt.getTime();
  const rightTime = right.createdAt.getTime();
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.id.localeCompare(left.id);
}

export function userChangeNoteSpoofsRestoreProvenance(
  changeNote: string | null | undefined,
): boolean {
  if (!changeNote) return false;

  const firstLine = changeNote.split("\n")[0]?.trim() ?? "";
  return firstLine.startsWith(WORKSPACE_VERSION_RESTORE_CHANGE_NOTE_PREFIX);
}

/**
 * Restore provenance prefix is reserved for server-side restore flows only.
 */
export function assertUserSuppliedChangeNoteAllowed(
  changeNote: string | null | undefined,
): void {
  if (userChangeNoteSpoofsRestoreProvenance(changeNote)) {
    throw new Error(
      "WORKSPACE_CHANGE_NOTE_RESTORE_PROVENANCE_RESERVED",
    );
  }
}

export function formatRestoreProvenanceChangeNote(
  restoredFromVersionId: string,
  userNote?: string | null,
): string {
  const base = `${WORKSPACE_VERSION_RESTORE_CHANGE_NOTE_PREFIX}${restoredFromVersionId.trim()}`;
  const note = userNote?.trim();
  return note ? `${base}\n${note}` : base;
}

export function parseRestoredFromVersionId(
  changeNote: string | null | undefined,
): string | null {
  if (!changeNote) return null;

  const firstLine = changeNote.split("\n")[0]?.trim() ?? "";
  if (!firstLine.startsWith(WORKSPACE_VERSION_RESTORE_CHANGE_NOTE_PREFIX)) {
    return null;
  }

  const versionId = firstLine.slice(
    WORKSPACE_VERSION_RESTORE_CHANGE_NOTE_PREFIX.length,
  );

  return versionId.trim() || null;
}
