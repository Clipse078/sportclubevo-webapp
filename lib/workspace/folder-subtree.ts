import { prisma } from "@/lib/db/prisma";

/**
 * Collects folder IDs in the subtree rooted at rootFolderId (inclusive).
 */
export async function collectWorkspaceFolderSubtreeIds(
  tenantId: string,
  rootFolderId: string,
): Promise<string[]> {
  const ids: string[] = [];
  const queue: string[] = [rootFolderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    ids.push(currentId);

    const children = await prisma.workspaceFolder.findMany({
      where: { tenantId, parentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      queue.push(child.id);
    }
  }

  return ids;
}
