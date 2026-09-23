import type { Prisma, PrismaClient } from "@prisma/client";

type FolderClient = Pick<PrismaClient, "workspaceFolder">;

/**
 * Returns true when ancestorFolderId is on the folder chain of descendantFolderId
 * (inclusive — same id counts as ancestor).
 */
export async function isWorkspaceFolderAncestorOf(
  client: FolderClient,
  tenantId: string,
  ancestorFolderId: string,
  descendantFolderId: string | null | undefined,
): Promise<boolean> {
  if (!descendantFolderId) {
    return false;
  }
  if (ancestorFolderId === descendantFolderId) {
    return true;
  }

  let currentId: string | null = descendantFolderId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === ancestorFolderId) {
      return true;
    }
    const row: { parentId: string | null } | null =
      await client.workspaceFolder.findFirst({
        where: { id: currentId, tenantId },
        select: { parentId: true },
      });
    if (!row) {
      return false;
    }
    currentId = row.parentId;
  }

  return false;
}

export type FolderAncestorClient = Pick<
  Prisma.TransactionClient,
  "workspaceFolder"
>;
