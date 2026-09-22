/**
 * WORKSPACE-02 — ACL grant mutation backend (MANAGE-protected, validated).
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  folderNodeFromGraph,
  documentNodeFromGraph,
} from "@/lib/workspace/access/resource-graph";
import {
  computeEffectiveAccessPaths,
  WorkspaceAccessBroadeningError,
} from "@/lib/workspace/access/effective-access";
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

async function resolveGrantValidationContext(input: {
  tenantId: string;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  grant: WorkspaceGrantFields;
}): Promise<Parameters<typeof validateWorkspaceAccessGrantMutation>[0]> {
  const base = {
    tenantId: input.tenantId,
    resource: input.resource,
    resourceTenantId: input.tenantId,
  };

  if (input.grant.personId) {
    const person = await prisma.person.findFirst({
      where: { id: input.grant.personId, tenantId: input.tenantId },
      select: { tenantId: true },
    });
    return { ...base, personTenantId: person?.tenantId ?? null };
  }

  if (input.grant.orgUnitId) {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: input.grant.orgUnitId, tenantId: input.tenantId },
      select: { tenantId: true },
    });
    return { ...base, orgUnitTenantId: orgUnit?.tenantId ?? null };
  }

  if (input.grant.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: input.grant.teamId, tenantId: input.tenantId },
      select: { tenantId: true, orgUnitId: true },
    });
    let teamBelongsToOrgUnit: boolean | null = null;
    if (input.grant.roleScopeOrgUnitId && team?.orgUnitId) {
      teamBelongsToOrgUnit =
        team.orgUnitId === input.grant.roleScopeOrgUnitId;
    }
    return {
      ...base,
      teamTenantId: team?.tenantId ?? null,
      teamBelongsToOrgUnit,
      roleScopeOrgUnitTenantId: input.grant.roleScopeOrgUnitId
        ? input.tenantId
        : null,
      roleScopeTeamTenantId: input.grant.roleScopeTeamId
        ? input.tenantId
        : null,
    };
  }

  return base;
}

function assertPolicyDoesNotBroaden(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  replaceGrants: readonly WorkspaceGrantFields[];
}): void {
  const graph = input.actor.graph;
  const node =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? folderNodeFromGraph(graph, input.resource.folderId)
      : documentNodeFromGraph(graph, input.resource.documentId);

  if (!node) {
    throw new WorkspaceGrantMutationError("Resource not found.");
  }

  const hypothetical = {
    ...node,
    accessInheritanceMode: input.accessInheritanceMode,
    grants: input.replaceGrants.map((grant, index) => ({
      ...grant,
      id: `hypothetical-${index}`,
      tenantId: node.tenantId,
      resourceType: node.resourceType,
      folderId:
        node.resourceType === WorkspaceResourceType.FOLDER ? node.id : null,
      documentId:
        node.resourceType === WorkspaceResourceType.DOCUMENT ? node.id : null,
    })),
  };

  const chain =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? buildFolderAccessChain(graph, input.resource.folderId)
      : buildDocumentAccessChain(graph, input.resource.documentId);

  if (!chain) {
    throw new WorkspaceGrantMutationError("Resource not found.");
  }

  const mergedChain = {
    ...chain,
    resource: hypothetical,
  };

  try {
    computeEffectiveAccessPaths(mergedChain);
  } catch (error) {
    if (error instanceof WorkspaceAccessBroadeningError) {
      throw new WorkspaceGrantMutationError(error.message);
    }
    throw error;
  }
}

export async function applyWorkspaceAccessPolicy(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  replaceGrants: readonly WorkspaceGrantFields[];
}): Promise<void> {
  await mutateWorkspaceAccessGrants({
    actor: input.actor,
    resource: input.resource,
    accessInheritanceMode: input.accessInheritanceMode,
    replaceGrants: input.replaceGrants,
  });
}

export async function mutateWorkspaceAccessGrants(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  accessInheritanceMode?: WorkspaceAccessInheritanceMode;
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

  const targetMode =
    input.accessInheritanceMode ??
    (input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? (
          await prisma.workspaceFolder.findFirst({
            where: { id: folderId!, tenantId },
            select: { accessInheritanceMode: true },
          })
        )?.accessInheritanceMode
      : (
          await prisma.workspaceDocument.findFirst({
            where: { id: documentId!, tenantId },
            select: { accessInheritanceMode: true },
          })
        )?.accessInheritanceMode) ??
    WorkspaceAccessInheritanceMode.INHERIT;

  const grantsToPersist =
    targetMode === WorkspaceAccessInheritanceMode.INHERIT
      ? []
      : input.replaceGrants;

  for (const grant of grantsToPersist) {
    const ctx = await resolveGrantValidationContext({
      tenantId,
      resource: input.resource,
      grant,
    });
    validateWorkspaceAccessGrantMutation(ctx, grant);
  }

  assertPolicyDoesNotBroaden({
    actor: input.actor,
    resource: input.resource,
    accessInheritanceMode: targetMode,
    replaceGrants: grantsToPersist,
  });

  await prisma.$transaction(async (tx) => {
    if (folderId) {
      await tx.workspaceFolder.update({
        where: { id: folderId },
        data: { accessInheritanceMode: targetMode },
      });
    } else if (documentId) {
      await tx.workspaceDocument.update({
        where: { id: documentId },
        data: { accessInheritanceMode: targetMode },
      });
    }

    if (folderId) {
      await tx.workspaceAccessGrant.deleteMany({
        where: { tenantId, folderId },
      });
    } else if (documentId) {
      await tx.workspaceAccessGrant.deleteMany({
        where: { tenantId, documentId },
      });
    }

    if (grantsToPersist.length > 0) {
      await tx.workspaceAccessGrant.createMany({
        data: grantsToPersist.map((grant) => ({
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
