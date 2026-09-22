/**
 * WORKSPACE-06-A1 — subtree destructive authorization (permanent folder delete).
 *
 * MANAGE on the ancestor must not bypass restrictive descendant ACLs.
 */

import { prisma } from "@/lib/db/prisma";
import { collectWorkspaceFolderSubtreeIds } from "@/lib/workspace/folder-subtree";
import { loadWorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import {
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import {
  assertWorkspaceDocumentManage,
  assertWorkspaceFolderManage,
} from "@/lib/workspace/workspace-resource-guards";

export async function assertWorkspaceFolderDestructiveSubtreeManage(
  actor: WorkspaceActorContext,
  tenantId: string,
  rootFolderId: string,
): Promise<void> {
  const lifecycleGraph = await loadWorkspaceResourceGraph(tenantId, {
    includeAllLifecycleStates: true,
  });
  const authActor: WorkspaceActorContext = { ...actor, graph: lifecycleGraph };

  const subtreeIds = await collectWorkspaceFolderSubtreeIds(tenantId, rootFolderId);

  for (const folderId of subtreeIds) {
    try {
      assertWorkspaceFolderManage(authActor, folderId);
    } catch (error) {
      if (error instanceof WorkspaceAuthorizationError) {
        throw error;
      }
      throw error;
    }
  }

  const documents = await prisma.workspaceDocument.findMany({
    where: { tenantId, folderId: { in: subtreeIds } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const document of documents) {
    assertWorkspaceDocumentManage(authActor, document.id);
  }
}
