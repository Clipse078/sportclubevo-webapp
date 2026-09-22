import { WorkspaceDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  WorkspaceArchivedFolderDto,
  WorkspaceFolderDto,
  WorkspaceFolderRecord,
} from "@/lib/workspace/dto";
import {
  workspaceArchivedFolderWhere,
  workspaceTrashedFolderWhere,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
import { buildWorkspaceFolderTree } from "@/lib/workspace/tree";

const WORKSPACE_FOLDER_SELECT = {
  id: true,
  parentId: true,
  name: true,
  description: true,
  displayOrder: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeTenantId(tenantId: string): string {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    throw new Error("Workspace query requires an authenticated tenant.");
  }

  return normalizedTenantId;
}

function toWorkspaceFolderDto(
  folder: WorkspaceFolderRecord,
): WorkspaceFolderDto {
  return {
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    description: folder.description,
    displayOrder: folder.displayOrder,
    createdByUserId: folder.createdByUserId,
    updatedByUserId: folder.updatedByUserId,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    children: [],
  };
}

/**
 * Returns the active Workspace folder tree for exactly one tenant,
 * restricted to folders the actor may VIEW (WORKSPACE-02 query boundary).
 */
export async function getWorkspaceFolderTree(
  tenantId: string,
  authorizedFolderIds: readonly string[],
): Promise<WorkspaceFolderDto[]> {
  const normalizedTenantId = normalizeTenantId(tenantId);

  const idFilter =
    authorizedFolderIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedFolderIds] };

  const folders = await prisma.workspaceFolder.findMany({
    where: {
      tenantId: normalizedTenantId,
      archivedAt: null,
      trashedAt: null,
      id: idFilter,
    },
    orderBy: [
      { displayOrder: "asc" },
      { name: "asc" },
      { id: "asc" },
    ],
    select: WORKSPACE_FOLDER_SELECT,
  });

  return buildWorkspaceFolderTree(
    folders satisfies WorkspaceFolderRecord[],
  );
}

/**
 * Returns one active Workspace folder belonging to exactly one tenant.
 *
 * A folder from another tenant is returned as null.
 */
export async function getWorkspaceFolderById(
  tenantId: string,
  folderId: string,
  authorizedFolderIds?: readonly string[],
): Promise<WorkspaceFolderDto | null> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const normalizedFolderId = folderId.trim();

  if (!normalizedFolderId) {
    return null;
  }

  const folder = await prisma.workspaceFolder.findFirst({
    where: {
      id: normalizedFolderId,
      tenantId: normalizedTenantId,
      archivedAt: null,
      trashedAt: null,
    },
    select: WORKSPACE_FOLDER_SELECT,
  });

  if (!folder) {
    return null;
  }

  if (
    authorizedFolderIds &&
    !authorizedFolderIds.includes(normalizedFolderId)
  ) {
    return null;
  }

  return toWorkspaceFolderDto(
    folder satisfies WorkspaceFolderRecord,
  );
}

export async function getWorkspaceFolderByIdIncludingLifecycle(
  tenantId: string,
  folderId: string,
  authorizedFolderIds: readonly string[],
): Promise<WorkspaceFolderDto | null> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const normalizedFolderId = folderId.trim();
  if (!normalizedFolderId) return null;

  if (!authorizedFolderIds.includes(normalizedFolderId)) {
    return null;
  }

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: normalizedFolderId, tenantId: normalizedTenantId },
    select: WORKSPACE_FOLDER_SELECT,
  });

  if (!folder) return null;

  return toWorkspaceFolderDto(folder satisfies WorkspaceFolderRecord);
}

/**
 * Returns archived Workspace folders for exactly one tenant.
 */
export async function getArchivedWorkspaceFolders(
  tenantId: string,
  authorizedFolderIds: readonly string[],
): Promise<WorkspaceArchivedFolderDto[]> {
  const normalizedTenantId = normalizeTenantId(tenantId);

  const idFilter =
    authorizedFolderIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedFolderIds] };

  const folders = await prisma.workspaceFolder.findMany({
    where: {
      tenantId: normalizedTenantId,
      ...workspaceArchivedFolderWhere(),
      id: idFilter,
    },
    orderBy: [
      { updatedAt: "desc" },
      { name: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      parentId: true,
      name: true,
      description: true,
      archivedAt: true,
      updatedAt: true,
    },
  });

  return folders.flatMap((folder) => {
    if (!folder.archivedAt) {
      return [];
    }

    return [
      {
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        description: folder.description,
        archivedAt: folder.archivedAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
    ];
  });
}

export type WorkspaceLifecycleFolderListItem = WorkspaceArchivedFolderDto & {
  trashedAt?: string;
};

export async function getTrashedWorkspaceFolders(
  tenantId: string,
  authorizedFolderIds: readonly string[],
): Promise<WorkspaceLifecycleFolderListItem[]> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const idFilter =
    authorizedFolderIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedFolderIds] };

  const folders = await prisma.workspaceFolder.findMany({
    where: {
      tenantId: normalizedTenantId,
      ...workspaceTrashedFolderWhere(),
      id: idFilter,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      description: true,
      archivedAt: true,
      trashedAt: true,
      updatedAt: true,
    },
  });

  return folders.flatMap((folder) => {
    if (!folder.trashedAt) return [];
    return [
      {
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        description: folder.description,
        archivedAt: folder.archivedAt?.toISOString() ?? folder.trashedAt.toISOString(),
        trashedAt: folder.trashedAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
    ];
  });
}

export type WorkspaceLifecycleDocumentListItem = {
  id: string;
  name: string;
  folderId: string | null;
  archivedAt: string | null;
  trashedAt: string | null;
  updatedAt: string;
};

export async function getArchivedWorkspaceDocuments(
  tenantId: string,
  authorizedDocumentIds: readonly string[],
): Promise<WorkspaceLifecycleDocumentListItem[]> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const idFilter =
    authorizedDocumentIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedDocumentIds] };

  const rows = await prisma.workspaceDocument.findMany({
    where: {
      tenantId: normalizedTenantId,
      status: WorkspaceDocumentStatus.ARCHIVED,
      trashedAt: null,
      id: idFilter,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      folderId: true,
      archivedAt: true,
      trashedAt: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    folderId: row.folderId,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getTrashedWorkspaceDocuments(
  tenantId: string,
  authorizedDocumentIds: readonly string[],
): Promise<WorkspaceLifecycleDocumentListItem[]> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const idFilter =
    authorizedDocumentIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedDocumentIds] };

  const rows = await prisma.workspaceDocument.findMany({
    where: {
      tenantId: normalizedTenantId,
      status: WorkspaceDocumentStatus.TRASHED,
      trashedAt: { not: null },
      id: idFilter,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      folderId: true,
      archivedAt: true,
      trashedAt: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    folderId: row.folderId,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
