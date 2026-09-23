import {
  WorkspaceCollaborationResourceType,
  WorkspaceResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import {
  canWorkspaceView,
  computeAuthorizedReadableResourceIds,
} from "@/lib/workspace/access/workspace-authorization";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { deriveWorkspaceFolderLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";
import { loadCollaborationResourceDisplay } from "@/lib/workspace/collaboration/enrich-collaboration-list-item";

export type WorkspaceFavoriteListItem = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  lifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED";
  createdAt: string;
  name: string;
  parentFolderName: string | null;
};

export async function toggleWorkspaceFavorite(input: {
  tenantId: string;
  userId: string;
  actor: WorkspaceActorContext;
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
}): Promise<{ favorited: boolean }> {
  const resourceId = input.resourceId.trim();
  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  if (input.resourceType === "FOLDER") {
    const canView = canWorkspaceView(input.actor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: resourceId,
    });
    if (!canView) {
      throw new Error("Resource not accessible.");
    }

    const existing = await prisma.workspaceFavorite.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        folderId: resourceId,
      },
    });

    if (existing) {
      await prisma.workspaceFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await prisma.workspaceFavorite.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        resourceType: WorkspaceCollaborationResourceType.FOLDER,
        folderId: resourceId,
      },
    });
    return { favorited: true };
  }

  const canView = canWorkspaceView(input.actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: resourceId,
  });
  if (!canView) {
    throw new Error("Resource not accessible.");
  }

  const existing = await prisma.workspaceFavorite.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      documentId: resourceId,
    },
  });

  if (existing) {
    await prisma.workspaceFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }

  await prisma.workspaceFavorite.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      resourceType: WorkspaceCollaborationResourceType.DOCUMENT,
      documentId: resourceId,
    },
  });

  return { favorited: true };
}

export async function listWorkspaceFavorites(input: {
  tenantId: string;
  userId: string;
  actor: WorkspaceActorContext;
}): Promise<WorkspaceFavoriteListItem[]> {
  const readable = computeAuthorizedReadableResourceIds(input.actor);

  const rows = await prisma.workspaceFavorite.findMany({
    where: { tenantId: input.tenantId, userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const items: WorkspaceFavoriteListItem[] = [];

  for (const row of rows) {
    if (row.folderId) {
      if (!readable.folderIds.includes(row.folderId)) continue;
      const folder = await prisma.workspaceFolder.findFirst({
        where: { id: row.folderId, tenantId: input.tenantId },
        select: { archivedAt: true, trashedAt: true },
      });
      if (!folder) continue;
      const display = await loadCollaborationResourceDisplay({
        tenantId: input.tenantId,
        resourceType: "FOLDER",
        resourceId: row.folderId,
      });
      if (!display) continue;
      items.push({
        resourceType: "FOLDER",
        resourceId: row.folderId,
        lifecycle: deriveWorkspaceFolderLifecycle(folder),
        createdAt: row.createdAt.toISOString(),
        name: display.name,
        parentFolderName: display.parentFolderName,
      });
      continue;
    }

    if (row.documentId) {
      if (!readable.documentIds.includes(row.documentId)) continue;
      const document = await prisma.workspaceDocument.findFirst({
        where: { id: row.documentId, tenantId: input.tenantId },
        select: { status: true, archivedAt: true, trashedAt: true },
      });
      if (!document) continue;
      const display = await loadCollaborationResourceDisplay({
        tenantId: input.tenantId,
        resourceType: "DOCUMENT",
        resourceId: row.documentId,
      });
      if (!display) continue;
      items.push({
        resourceType: "DOCUMENT",
        resourceId: row.documentId,
        lifecycle: deriveWorkspaceDocumentLifecycle(document),
        createdAt: row.createdAt.toISOString(),
        name: display.name,
        parentFolderName: display.parentFolderName,
      });
    }
  }

  return items;
}
