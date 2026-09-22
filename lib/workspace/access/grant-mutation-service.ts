/**
 * WORKSPACE-02 — ACL grant mutation backend (MANAGE-protected, validated).
 */

import { WorkspaceResourceType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  validateWorkspaceAccessGrantMutation,
  WorkspaceAccessGrantValidationError,
} from "@/lib/workspace/access/grant-validation";
import {
  assertWorkspaceAccess,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceGrantFields } from "@/lib/workspace/access/types";

export class WorkspaceGrantMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceGrantMutationError";
  }
}

export async function mutateWorkspaceAccessGrants(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  replaceGrants: readonly WorkspaceGrantFields[];
}): Promise<void> {
  const tenantId = input.actor.identity.tenantId;

  try {
    assertWorkspaceAccess(input.actor, "MANAGE", input.resource);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      throw new WorkspaceGrantMutationError(error.message);
    }
    throw error;
  }

  const folderId =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? input.resource.folderId
      : null;
  const documentId =
    input.resource.resourceType === WorkspaceResourceType.DOCUMENT
      ? input.resource.documentId
      : null;

  const resourceRow =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? await prisma.workspaceFolder.findFirst({
          where: { id: folderId!, tenantId },
          select: { id: true, tenantId: true, parentId: true },
        })
      : await prisma.workspaceDocument.findFirst({
          where: { id: documentId!, tenantId },
          select: { id: true, tenantId: true, folderId: true },
        });

  if (!resourceRow) {
    throw new WorkspaceGrantMutationError("Resource not found.");
  }

  for (const grant of input.replaceGrants) {
    validateWorkspaceAccessGrantMutation(
      {
        tenantId,
        resource:
          input.resource.resourceType === WorkspaceResourceType.FOLDER
            ? { resourceType: WorkspaceResourceType.FOLDER, folderId: folderId! }
            : {
                resourceType: WorkspaceResourceType.DOCUMENT,
                documentId: documentId!,
              },
        resourceTenantId: tenantId,
      },
      grant,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (folderId) {
      await tx.workspaceAccessGrant.deleteMany({
        where: { tenantId, folderId },
      });
    } else if (documentId) {
      await tx.workspaceAccessGrant.deleteMany({
        where: { tenantId, documentId },
      });
    }

    if (input.replaceGrants.length > 0) {
      await tx.workspaceAccessGrant.createMany({
        data: input.replaceGrants.map((grant) => ({
          tenantId,
          resourceType: input.resource.resourceType,
          folderId,
          documentId,
          subjectType: grant.subjectType,
          accessLevel: grant.accessLevel,
          personId: grant.personId ?? null,
          orgUnitId: grant.orgUnitId ?? null,
          teamId: grant.teamId ?? null,
          roleFunctionKey: grant.roleFunctionKey ?? null,
          roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
          roleScopeTeamId: grant.roleScopeTeamId ?? null,
        })),
      });
    }
  });
}

export { WorkspaceAccessGrantValidationError };
