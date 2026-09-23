/**
 * WORKSPACE-02-R1 — document move authorization (folder envelope inheritance).
 */

import { WorkspaceResourceType } from "@prisma/client";

import {
  buildChainAfterMove,
  assertForeignParentRejected,
  validateMoveDoesNotWidenEffectiveAccess,
  WorkspaceMoveValidationError,
} from "@/lib/workspace/access/move-validation";
import type { WorkspaceDocumentMoveImpact } from "@/lib/workspace/access/move-impact";
import {
  isAllowedWorkspaceDocumentMoveOutcome,
  type WorkspaceDocumentMoveOutcome,
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

export type WorkspaceDocumentMoveAuthorizationResult = {
  allowed: boolean;
  impact: WorkspaceDocumentMoveImpact;
  message?: string;
};

function cloneGraphWithDocumentFolder(
  graph: WorkspaceResourceGraph,
  documentId: string,
  newFolderId: string | null,
): WorkspaceResourceGraph {
  const documents = new Map(graph.documents);
  const existing = documents.get(documentId);
  if (!existing) {
    return graph;
  }
  documents.set(documentId, { ...existing, folderId: newFolderId });
  return { ...graph, documents };
}

function folderAncestorNodes(
  graph: WorkspaceResourceGraph,
  folderId: string | null,
): WorkspaceResourceAccessNode[] {
  if (!folderId) {
    return [];
  }
  const chain = buildFolderAccessChain(graph, folderId);
  if (!chain) {
    return [];
  }
  return [...chain.ancestors, chain.resource];
}

function deny(
  outcome: WorkspaceDocumentMoveOutcome,
  impact: Omit<WorkspaceDocumentMoveImpact, "outcome">,
  message: string,
): WorkspaceDocumentMoveAuthorizationResult {
  return {
    allowed: false,
    impact: { ...impact, outcome },
    message,
  };
}

function allow(
  outcome: Extract<
    WorkspaceDocumentMoveOutcome,
    "ALLOWED_NO_ACCESS_CHANGE" | "ALLOWED_ACCESS_REDUCTION"
  >,
  impact: Omit<WorkspaceDocumentMoveImpact, "outcome">,
): WorkspaceDocumentMoveAuthorizationResult {
  return {
    allowed: true,
    impact: { ...impact, outcome },
  };
}

export function evaluateWorkspaceDocumentMove(input: {
  actor: WorkspaceActorContext;
  documentId: string;
  newFolderId: string | null;
}): WorkspaceDocumentMoveAuthorizationResult {
  const { actor, documentId, newFolderId } = input;
  const baseImpact = { documentId, newFolderId };

  if (actor.identity.tenantId !== actor.graph.tenantId) {
    return deny(
      "DENIED_CROSS_TENANT",
      baseImpact,
      "Cross-tenant workspace move is not allowed.",
    );
  }

  const documentMeta = actor.graph.documents.get(documentId);
  if (!documentMeta) {
    return deny(
      "DENIED_RESOURCE_NOT_FOUND",
      baseImpact,
      "Document was not found.",
    );
  }

  if (newFolderId != null && !actor.graph.folders.has(newFolderId)) {
    return deny(
      "DENIED_RESOURCE_NOT_FOUND",
      baseImpact,
      "Target folder was not found.",
    );
  }

  if (documentMeta.folderId === newFolderId) {
    return allow("ALLOWED_NO_ACCESS_CHANGE", {
      ...baseImpact,
      accessChange: "NONE",
    });
  }

  try {
    assertForeignParentRejected({
      resourceTenantId: actor.graph.tenantId,
      parentTenantId: newFolderId ? actor.graph.tenantId : null,
    });
  } catch (error) {
    if (error instanceof WorkspaceMoveValidationError) {
      return deny("DENIED_CROSS_TENANT", baseImpact, error.message);
    }
    throw error;
  }

  if (
    !canWorkspaceEdit(actor, {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId,
    })
  ) {
    return deny(
      "DENIED_INSUFFICIENT_SOURCE_ACCESS",
      baseImpact,
      "Edit access on the document is required.",
    );
  }

  if (newFolderId) {
    if (
      !canWorkspaceEdit(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: newFolderId,
      })
    ) {
      return deny(
        "DENIED_INSUFFICIENT_DESTINATION_ACCESS",
        baseImpact,
        "Edit access on the destination folder is required.",
      );
    }
  }

  const graphAfter = cloneGraphWithDocumentFolder(
    actor.graph,
    documentId,
    newFolderId,
  );

  const beforeChain = buildDocumentAccessChain(actor.graph, documentId);
  const afterChain = buildDocumentAccessChain(graphAfter, documentId);

  if (!beforeChain || !afterChain) {
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
      return deny(
        "DENIED_ACCESS_WIDENING",
        { ...baseImpact, accessChange: "WOULD_WIDEN" },
        error.message,
      );
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
      return deny(
        "DENIED_ACCESS_WIDENING",
        { ...baseImpact, accessChange: "WOULD_WIDEN" },
        error.message,
      );
    }
    throw error;
  }

  const beforeCount = beforePaths[0]?.requiredAudiences.length ?? 0;
  const afterCount = afterPaths[0]?.requiredAudiences.length ?? 0;

  if (afterCount > beforeCount) {
    return allow("ALLOWED_ACCESS_REDUCTION", {
      ...baseImpact,
      accessChange: "REDUCTION",
    });
  }

  if (afterCount < beforeCount) {
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

export function assertWorkspaceDocumentMoveAllowed(input: {
  actor: WorkspaceActorContext;
  documentId: string;
  newFolderId: string | null;
}): WorkspaceDocumentMoveImpact {
  const result = evaluateWorkspaceDocumentMove(input);
  if (
    !result.allowed ||
    !isAllowedWorkspaceDocumentMoveOutcome(result.impact.outcome)
  ) {
    throw new WorkspaceMoveValidationError(
      result.message ?? "Document move denied by workspace authorization.",
    );
  }
  return result.impact;
}
