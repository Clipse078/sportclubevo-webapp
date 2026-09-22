import {
  WorkspaceDocumentStatus,
  type WorkspaceDocument,
  type WorkspaceFolder,
} from "@prisma/client";

/** Canonical document lifecycle (permanent delete is not a visible state). */
export type WorkspaceDocumentLifecycleState =
  | "ACTIVE"
  | "ARCHIVED"
  | "TRASHED";

/** Canonical folder lifecycle derived from archivedAt / trashedAt. */
export type WorkspaceFolderLifecycleState =
  | "ACTIVE"
  | "ARCHIVED"
  | "TRASHED";

export function deriveWorkspaceDocumentLifecycle(
  document: Pick<WorkspaceDocument, "status" | "archivedAt" | "trashedAt">,
): WorkspaceDocumentLifecycleState {
  if (document.status === WorkspaceDocumentStatus.TRASHED) {
    return "TRASHED";
  }
  if (
    document.status === WorkspaceDocumentStatus.ARCHIVED ||
    document.archivedAt !== null
  ) {
    return "ARCHIVED";
  }
  return "ACTIVE";
}

export function deriveWorkspaceFolderLifecycle(
  folder: Pick<WorkspaceFolder, "archivedAt" | "trashedAt">,
): WorkspaceFolderLifecycleState {
  if (folder.trashedAt !== null) {
    return "TRASHED";
  }
  if (folder.archivedAt !== null) {
    return "ARCHIVED";
  }
  return "ACTIVE";
}

export function assertDocumentLifecycleConsistent(
  document: Pick<WorkspaceDocument, "status" | "archivedAt" | "trashedAt">,
): void {
  if (document.status === WorkspaceDocumentStatus.TRASHED) {
    if (document.trashedAt === null) {
      throw new Error("TRASHED document requires trashedAt.");
    }
    return;
  }
  if (document.trashedAt !== null) {
    throw new Error("Non-trashed document must not carry trashedAt.");
  }
  if (
    document.status === WorkspaceDocumentStatus.ACTIVE &&
    document.archivedAt !== null
  ) {
    throw new Error("ACTIVE document must not carry archivedAt.");
  }
  if (
    document.status === WorkspaceDocumentStatus.ARCHIVED &&
    document.archivedAt === null
  ) {
    throw new Error("ARCHIVED document requires archivedAt.");
  }
}

export function assertFolderLifecycleConsistent(
  folder: Pick<WorkspaceFolder, "archivedAt" | "trashedAt">,
): void {
  if (folder.trashedAt !== null && folder.archivedAt !== null) {
    // Allowed when trashing from archived — archivedAt preserved for restore target.
    return;
  }
  if (folder.trashedAt !== null && folder.archivedAt === null) {
    return;
  }
  if (folder.trashedAt === null && folder.archivedAt !== null) {
    return;
  }
}

/** Prisma filter: active documents only (default workspace lists). */
export const WORKSPACE_ACTIVE_DOCUMENT_WHERE = {
  status: WorkspaceDocumentStatus.ACTIVE,
  archivedAt: null,
  trashedAt: null,
} as const;

/** Prisma filter: active folders only. */
export const WORKSPACE_ACTIVE_FOLDER_WHERE = {
  archivedAt: null,
  trashedAt: null,
} as const;

export function workspaceArchivedDocumentWhere(): {
  status: typeof WorkspaceDocumentStatus.ARCHIVED;
  trashedAt: null;
} {
  return {
    status: WorkspaceDocumentStatus.ARCHIVED,
    trashedAt: null,
  };
}

export function workspaceTrashedDocumentWhere(): {
  status: typeof WorkspaceDocumentStatus.TRASHED;
  trashedAt: { not: null };
} {
  return {
    status: WorkspaceDocumentStatus.TRASHED,
    trashedAt: { not: null },
  };
}

export function workspaceArchivedFolderWhere(): {
  archivedAt: { not: null };
  trashedAt: null;
} {
  return {
    archivedAt: { not: null },
    trashedAt: null,
  };
}

export function workspaceTrashedFolderWhere(): {
  trashedAt: { not: null };
} {
  return {
    trashedAt: { not: null },
  };
}
