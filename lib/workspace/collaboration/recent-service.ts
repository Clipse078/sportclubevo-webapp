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

const MAX_RECENT_ROWS = 50;
const MAX_RECENT_RETURN = 20;

export type WorkspaceRecentListItem = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  versionId: string | null;
  lifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED";
  accessedAt: string;
};

export async function recordWorkspaceRecentAccess(input: {
  tenantId: string;
  userId: string;
  actor: WorkspaceActorContext;
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  versionId?: string | null;
}): Promise<void> {
  const resourceId = input.resourceId.trim();
  if (!resourceId) return;

  if (input.resourceType === "FOLDER") {
    if (
      !canWorkspaceView(input.actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: resourceId,
      })
    ) {
      return;
    }

    await prisma.workspaceRecentAccess.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        resourceType: WorkspaceCollaborationResourceType.FOLDER,
        folderId: resourceId,
      },
    });
  } else {
    if (
      !canWorkspaceView(input.actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: resourceId,
      })
    ) {
      return;
    }

    await prisma.workspaceRecentAccess.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        resourceType: WorkspaceCollaborationResourceType.DOCUMENT,
        documentId: resourceId,
        versionId: input.versionId?.trim() || null,
      },
    });
  }

  const overflow = await prisma.workspaceRecentAccess.findMany({
    where: { tenantId: input.tenantId, userId: input.userId },
    orderBy: { accessedAt: "desc" },
    skip: MAX_RECENT_ROWS,
    select: { id: true },
  });

  if (overflow.length > 0) {
    await prisma.workspaceRecentAccess.deleteMany({
      where: { id: { in: overflow.map((r) => r.id) } },
    });
  }
}

export async function listWorkspaceRecent(input: {
  tenantId: string;
  userId: string;
  actor: WorkspaceActorContext;
}): Promise<WorkspaceRecentListItem[]> {
  const readable = computeAuthorizedReadableResourceIds(input.actor);

  const rows = await prisma.workspaceRecentAccess.findMany({
    where: { tenantId: input.tenantId, userId: input.userId },
    orderBy: { accessedAt: "desc" },
    take: MAX_RECENT_RETURN * 2,
  });

  const seen = new Set<string>();
  const items: WorkspaceRecentListItem[] = [];

  for (const row of rows) {
    if (row.folderId) {
      const key = `F:${row.folderId}`;
      if (seen.has(key)) continue;
      if (!readable.folderIds.includes(row.folderId)) continue;
      const folder = await prisma.workspaceFolder.findFirst({
        where: { id: row.folderId, tenantId: input.tenantId },
        select: { archivedAt: true, trashedAt: true },
      });
      if (!folder) continue;
      seen.add(key);
      items.push({
        resourceType: "FOLDER",
        resourceId: row.folderId,
        versionId: null,
        lifecycle: deriveWorkspaceFolderLifecycle(folder),
        accessedAt: row.accessedAt.toISOString(),
      });
    } else if (row.documentId) {
      const key = `D:${row.documentId}:${row.versionId ?? ""}`;
      if (seen.has(key)) continue;
      if (!readable.documentIds.includes(row.documentId)) continue;
      const document = await prisma.workspaceDocument.findFirst({
        where: { id: row.documentId, tenantId: input.tenantId },
        select: { status: true, archivedAt: true, trashedAt: true },
      });
      if (!document) continue;
      seen.add(key);
      items.push({
        resourceType: "DOCUMENT",
        resourceId: row.documentId,
        versionId: row.versionId,
        lifecycle: deriveWorkspaceDocumentLifecycle(document),
        accessedAt: row.accessedAt.toISOString(),
      });
    }

    if (items.length >= MAX_RECENT_RETURN) break;
  }

  return items;
}
