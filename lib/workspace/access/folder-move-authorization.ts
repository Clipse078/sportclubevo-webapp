/**
 * WORKSPACE-02-R1 — folder move authorization + resulting-access validation.
 */

import { WorkspaceResourceType } from "@prisma/client";

import {
  buildChainAfterMove,
  assertForeignParentRejected,
  assertNoFolderCycle,
  validateMoveDoesNotWidenEffectiveAccess,
  WorkspaceMoveValidationError,
} from "@/lib/workspace/access/move-validation";
import type { WorkspaceFolderMoveImpact } from "@/lib/workspace/access/move-impact";
import {
  isAllowedWorkspaceFolderMoveOutcome,
  type WorkspaceFolderMoveOutcome,
} from "@/lib/workspace/access/move-impact";
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  folderNodeFromGraph,
  type WorkspaceResourceGraph,
} from "@/lib/workspace/access/resource-graph";
import type { WorkspaceResourceAccessNode } from "@/lib/workspace/access/types";
import {
  computeEffectiveAccessPaths,
  WorkspaceAccessBroadeningError,
} from "@/lib/workspace/access/effective-access";
import {
  canWorkspaceEdit,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";

export type WorkspaceFolderMoveAuthorizationResult = {
  allowed: boolean;
  impact: WorkspaceFolderMoveImpact;
  message?: string;
};

function parentLookup(graph: WorkspaceResourceGraph) {
  return (id: string): string | null =>
    graph.folders.get(id)?.parentId ?? null;
}

function cloneGraphWithParent(
  graph: WorkspaceResourceGraph,
  folderId: string,
  newParentId: string | null,
): WorkspaceResourceGraph {
  const folders = new Map(graph.folders);
  const existing = folders.get(folderId);
  if (!existing) {
    return graph;
  }
  folders.set(folderId, { ...existing, parentId: newParentId });
  return { ...graph, folders };
}

function collectDescendantFolderIds(
  graph: WorkspaceResourceGraph,
  rootFolderId: string,
): string[] {
  const descendants: string[] = [];
  const queue = [rootFolderId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    for (const [id, folder] of graph.folders) {
      if (folder.parentId === current && id !== rootFolderId) {
        descendants.push(id);
        queue.push(id);
      }
    }
  }

  return descendants;
}

function documentsInFolderSubtree(
  graph: WorkspaceResourceGraph,
  folderIds: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  for (const [documentId, document] of graph.documents) {
    if (document.folderId && folderIds.has(document.folderId)) {
      ids.push(documentId);
    }
  }
  return ids;
}

function folderAncestorNodes(
  graph: WorkspaceResourceGraph,
  folderId: string | null,
): WorkspaceResourceAccessNode[] {
  if (!folderId) {
    return [];
  }

  const nodes: WorkspaceResourceAccessNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null = folderId;

  while (currentId) {
    if (visited.has(currentId)) {
      return [];
    }
    visited.add(currentId);
    const node = folderNodeFromGraph(graph, currentId);
    if (!node) {
      return [];
    }
    nodes.unshift(node);
    currentId = graph.folders.get(currentId)?.parentId ?? null;
  }

  return nodes;
}

function accessPathsStrictness(pathCount: number): number {
  return pathCount;
}

function classifyEnvelopeChange(input: {
  beforeAudienceCount: number;
  afterAudienceCount: number;
}): "NONE" | "REDUCTION" {
  if (input.afterAudienceCount > input.beforeAudienceCount) {
    return "REDUCTION";
  }
  return "NONE";
}

function deny(
  outcome: WorkspaceFolderMoveOutcome,
  impact: Omit<WorkspaceFolderMoveImpact, "outcome">,
  message: string,
): WorkspaceFolderMoveAuthorizationResult {
  return {
    allowed: false,
    impact: { ...impact, outcome },
    message,
  };
}

function allow(
  outcome: Extract<
    WorkspaceFolderMoveOutcome,
    "ALLOWED_NO_ACCESS_CHANGE" | "ALLOWED_ACCESS_REDUCTION"
  >,
  impact: Omit<WorkspaceFolderMoveImpact, "outcome">,
): WorkspaceFolderMoveAuthorizationResult {
  return {
    allowed: true,
    impact: { ...impact, outcome },
  };
}

export function evaluateWorkspaceFolderMove(input: {
  actor: WorkspaceActorContext;
  folderId: string;
  newParentId: string | null;
}): WorkspaceFolderMoveAuthorizationResult {
  const { actor, folderId, newParentId } = input;
  const baseImpact = {
    folderId,
    newParentId,
  };

  if (actor.identity.tenantId !== actor.graph.tenantId) {
    return deny(
      "DENIED_CROSS_TENANT",
      baseImpact,
      "Cross-tenant workspace move is not allowed.",
    );
  }

  const folderMeta = actor.graph.folders.get(folderId);
  if (!folderMeta) {
    return deny(
      "DENIED_RESOURCE_NOT_FOUND",
      baseImpact,
      "Folder was not found.",
    );
  }

  if (newParentId != null && !actor.graph.folders.has(newParentId)) {
    return deny(
      "DENIED_RESOURCE_NOT_FOUND",
      baseImpact,
      "Target folder was not found.",
    );
  }

  try {
    assertForeignParentRejected({
      resourceTenantId: actor.graph.tenantId,
      parentTenantId: newParentId ? actor.graph.tenantId : null,
    });
    assertNoFolderCycle({
      folderId,
      newParentId,
      parentLookup: parentLookup(actor.graph),
    });
  } catch (error) {
    if (error instanceof WorkspaceMoveValidationError) {
      if (error.message.includes("cycle")) {
        return deny("DENIED_HIERARCHY_CYCLE", baseImpact, error.message);
      }
      return deny("DENIED_CROSS_TENANT", baseImpact, error.message);
    }
    throw error;
  }

  if (
    !canWorkspaceEdit(actor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId,
    })
  ) {
    return deny(
      "DENIED_INSUFFICIENT_SOURCE_ACCESS",
      baseImpact,
      "Edit access on the source folder is required.",
    );
  }

  if (newParentId) {
    if (
      !canWorkspaceEdit(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: newParentId,
      })
    ) {
      return deny(
        "DENIED_INSUFFICIENT_DESTINATION_ACCESS",
        baseImpact,
        "Edit access on the destination folder is required.",
      );
    }
  }

  const graphAfter = cloneGraphWithParent(actor.graph, folderId, newParentId);

  const subtreeFolderIds = new Set([
    folderId,
    ...collectDescendantFolderIds(actor.graph, folderId),
  ]);
  const subtreeDocumentIds = documentsInFolderSubtree(
    actor.graph,
    subtreeFolderIds,
  );

  const resourcesToValidate: (
    | { type: typeof WorkspaceResourceType.FOLDER; id: string }
    | { type: typeof WorkspaceResourceType.DOCUMENT; id: string }
  )[] = [
    { type: WorkspaceResourceType.FOLDER, id: folderId },
    ...collectDescendantFolderIds(actor.graph, folderId).map(
      (id): { type: typeof WorkspaceResourceType.FOLDER; id: string } => ({
        type: WorkspaceResourceType.FOLDER,
        id,
      }),
    ),
    ...subtreeDocumentIds.map(
      (id): { type: typeof WorkspaceResourceType.DOCUMENT; id: string } => ({
        type: WorkspaceResourceType.DOCUMENT,
        id,
      }),
    ),
  ];

  let anyReduction = false;

  for (const resource of resourcesToValidate) {
    const beforeChain =
      resource.type === WorkspaceResourceType.FOLDER
        ? buildFolderAccessChain(actor.graph, resource.id)
        : buildDocumentAccessChain(actor.graph, resource.id);

    if (!beforeChain) {
      return deny(
        "DENIED_MALFORMED_GRAPH",
        baseImpact,
        "Workspace authorization graph is malformed.",
      );
    }

    let afterChain;
    if (resource.type === WorkspaceResourceType.FOLDER) {
      const resourceNode = folderNodeFromGraph(graphAfter, resource.id);
      if (!resourceNode) {
        return deny(
          "DENIED_MALFORMED_GRAPH",
          baseImpact,
          "Workspace authorization graph is malformed.",
        );
      }
      const parentId = graphAfter.folders.get(resource.id)?.parentId ?? null;
      const ancestors = folderAncestorNodes(graphAfter, parentId);
      afterChain = buildChainAfterMove(resourceNode, ancestors);
    } else {
      afterChain = buildDocumentAccessChain(graphAfter, resource.id);
    }

    if (!afterChain) {
      return deny(
        "DENIED_MALFORMED_GRAPH",
        baseImpact,
        "Workspace authorization graph is malformed.",
      );
    }

    try {
      validateMoveDoesNotWidenEffectiveAccess({
        resourceChainBefore: beforeChain,
        resourceChainAfter: afterChain,
      });
    } catch (error) {
      if (
        error instanceof WorkspaceMoveValidationError ||
        error instanceof WorkspaceAccessBroadeningError
      ) {
        return deny("DENIED_ACCESS_WIDENING", {
          ...baseImpact,
          accessChange: "WOULD_WIDEN",
        }, error.message);
      }
      throw error;
    }

    let beforePaths;
    let afterPaths;
    try {
      beforePaths = computeEffectiveAccessPaths(beforeChain);
      afterPaths = computeEffectiveAccessPaths(afterChain);
    } catch (error) {
      if (error instanceof WorkspaceAccessBroadeningError) {
        return deny("DENIED_ACCESS_WIDENING", {
          ...baseImpact,
          accessChange: "WOULD_WIDEN",
        }, error.message);
      }
      throw error;
    }
    const beforeCount = accessPathsStrictness(
      beforePaths[0]?.requiredAudiences.length ?? 0,
    );
    const afterCount = accessPathsStrictness(
      afterPaths[0]?.requiredAudiences.length ?? 0,
    );
    if (
      classifyEnvelopeChange({
        beforeAudienceCount: beforeCount,
        afterAudienceCount: afterCount,
      }) === "REDUCTION"
    ) {
      anyReduction = true;
    }
  }

  if (anyReduction) {
    return allow("ALLOWED_ACCESS_REDUCTION", {
      ...baseImpact,
      accessChange: "REDUCTION",
    });
  }

  return allow("ALLOWED_NO_ACCESS_CHANGE", {
    ...baseImpact,
    accessChange: "NONE",
  });
}

export function assertWorkspaceFolderMoveAllowed(input: {
  actor: WorkspaceActorContext;
  folderId: string;
  newParentId: string | null;
}): WorkspaceFolderMoveImpact {
  const result = evaluateWorkspaceFolderMove(input);
  if (!result.allowed || !isAllowedWorkspaceFolderMoveOutcome(result.impact.outcome)) {
    throw new WorkspaceMoveValidationError(
      result.message ?? "Folder move denied by workspace authorization.",
    );
  }
  return result.impact;
}
