/**
 * WORKSPACE-08-07 — authorized subtree operation status reads (zero disclosure).
 */

import { prisma } from "@/lib/db/prisma";
import {
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceFolderManage } from "@/lib/workspace/workspace-resource-guards";
import {
  toWorkspaceSubtreeOperationStatusDto,
  WorkspaceSubtreeOperationError,
} from "@/lib/workspace/subtree/workspace-subtree-operation-service";
import type { WorkspaceSubtreeOperationStatusDto } from "@/lib/workspace/subtree/subtree-operation-dto";

export async function getWorkspaceSubtreeOperationStatusForActor(input: {
  tenantId: string;
  operationId: string;
  actor: WorkspaceActorContext;
  /** Tenant-level workspace.delete (folder permanent delete). */
  hasWorkspaceDelete: boolean;
}): Promise<WorkspaceSubtreeOperationStatusDto | null> {
  const tenantId = input.tenantId.trim();
  const operationId = input.operationId.trim();

  if (!tenantId || !operationId) {
    return null;
  }

  const operation = await prisma.workspaceSubtreeOperation.findFirst({
    where: { id: operationId, tenantId },
  });

  if (!operation) {
    return null;
  }

  const isRequester =
    operation.requestedByUserId === input.actor.identity.userId;

  if (!isRequester && !input.hasWorkspaceDelete) {
    try {
      assertWorkspaceFolderManage(input.actor, operation.rootFolderId);
    } catch (error) {
      if (error instanceof WorkspaceAuthorizationError) {
        return null;
      }
      throw error;
    }
  }

  return toWorkspaceSubtreeOperationStatusDto(operation);
}

export async function assertWorkspaceSubtreeOperationTenantMatch(input: {
  tenantId: string;
  operationId: string;
}): Promise<void> {
  const operation = await prisma.workspaceSubtreeOperation.findFirst({
    where: { id: input.operationId.trim(), tenantId: input.tenantId.trim() },
    select: { id: true },
  });

  if (!operation) {
    throw new WorkspaceSubtreeOperationError(
      "OPERATION_NOT_FOUND",
      "Operation not found.",
    );
  }
}
