/**
 * WORKSPACE-02 — secure list/query predicates (authorized IDs at query boundary).
 *
 * Unauthorized resources are excluded via ID sets derived from effective ACL —
 * not by loading full rows and filtering in presentation code.
 *
 * Scalability (W02-R1 / benchmark C2): authorization cost scales with hierarchy
 * and audience grants. Actor organisational membership is resolved once per
 * request when building `WorkspaceActorContext`; readable IDs are computed in
 * one pass over the in-memory tenant graph (no per-resource DB membership queries).
 */

import type { Prisma } from "@prisma/client";

import {
  computeAuthorizedReadableResourceIds,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";

export type WorkspaceReadWhere = {
  folderIds: readonly string[];
  documentIds: readonly string[];
  folderWhere: Prisma.WorkspaceFolderWhereInput;
  documentWhere: Prisma.WorkspaceDocumentWhereInput;
};

const IMPOSSIBLE_ID = "__workspace_unauthorized__";

function idInFilter(ids: readonly string[]): { in: string[] } {
  if (ids.length === 0) {
    return { in: [IMPOSSIBLE_ID] };
  }
  return { in: [...ids] };
}

export function buildWorkspaceReadWhereFromIds(input: {
  tenantId: string;
  folderIds: readonly string[];
  documentIds: readonly string[];
}): WorkspaceReadWhere {
  return {
    folderIds: input.folderIds,
    documentIds: input.documentIds,
    folderWhere: {
      tenantId: input.tenantId,
      archivedAt: null,
      trashedAt: null,
      id: idInFilter(input.folderIds),
    },
    documentWhere: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      archivedAt: null,
      trashedAt: null,
      id: idInFilter(input.documentIds),
    },
  };
}

export async function buildWorkspaceReadWhere(
  actor: WorkspaceActorContext,
): Promise<WorkspaceReadWhere> {
  const { folderIds, documentIds } =
    computeAuthorizedReadableResourceIds(actor);

  return buildWorkspaceReadWhereFromIds({
    tenantId: actor.identity.tenantId,
    folderIds,
    documentIds,
  });
}
