/**
 * WORKSPACE-01 — folder/document move validation (no effective-access widening).
 */

import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import {
  computeEffectiveAccessPaths,
  type ResourceAccessChain,
} from "@/lib/workspace/access/effective-access";
import type { WorkspaceResourceAccessNode } from "@/lib/workspace/access/types";

export class WorkspaceMoveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceMoveValidationError";
  }
}

export function wouldFolderCycle(
  folderId: string,
  newParentId: string | null,
  parentLookup: (id: string) => string | null,
): boolean {
  if (!newParentId) return false;
  if (newParentId === folderId) return true;

  const visited = new Set<string>();
  let current: string | null = newParentId;
  while (current) {
    if (current === folderId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentLookup(current);
  }
  return false;
}

export function assertNoFolderCycle(input: {
  folderId: string;
  newParentId: string | null;
  parentLookup: (id: string) => string | null;
}): void {
  if (wouldFolderCycle(input.folderId, input.newParentId, input.parentLookup)) {
    throw new WorkspaceMoveValidationError(
      "Folder move would create an ancestry cycle.",
    );
  }
}

export function validateMoveDoesNotWidenEffectiveAccess(input: {
  resourceChainBefore: ResourceAccessChain;
  resourceChainAfter: ResourceAccessChain;
}): void {
  const before = computeEffectiveAccessPaths(input.resourceChainBefore);
  const after = computeEffectiveAccessPaths(input.resourceChainAfter);

  const beforeMax = before.reduce(
    (max, path) => Math.max(max, path.requiredAudiences.length),
    0,
  );
  const afterMax = after.reduce(
    (max, path) => Math.max(max, path.requiredAudiences.length),
    0,
  );

  if (afterMax < beforeMax) {
    return;
  }

  for (const afterPath of after) {
    const match = before.find(
      (b) =>
        b.effectiveLevel === afterPath.effectiveLevel &&
        b.requiredAudiences.length === afterPath.requiredAudiences.length,
    );
    if (!match && before.length > 0) {
      const narrowed = afterPath.requiredAudiences.length >= before[0].requiredAudiences.length;
      if (!narrowed) {
        throw new WorkspaceMoveValidationError(
          "Move would widen effective access relative to previous parent envelope.",
        );
      }
    }
  }
}

export function buildChainAfterMove(
  resource: WorkspaceResourceAccessNode,
  newAncestors: readonly WorkspaceResourceAccessNode[],
): ResourceAccessChain {
  return {
    ancestors: newAncestors,
    resource,
  };
}

export function assertForeignParentRejected(input: {
  resourceTenantId: string;
  parentTenantId: string | null;
}): void {
  if (input.parentTenantId != null && input.parentTenantId !== input.resourceTenantId) {
    throw new WorkspaceMoveValidationError(
      "Cannot attach resource to a parent folder in another tenant.",
    );
  }
}

export function preserveExplicitRestrictionOnRoot(input: {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
}): boolean {
  return input.accessInheritanceMode === WorkspaceAccessInheritanceMode.EXPLICIT;
}

export function documentMoveUsesFolderEnvelope(): true {
  return true;
}
