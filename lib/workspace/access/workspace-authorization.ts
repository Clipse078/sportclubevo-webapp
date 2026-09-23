/**
 * WORKSPACE-02 — executable resource authorization (effective access + assertions).
 */

import { WorkspaceResourceType } from "@prisma/client";

import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  actorMatchesAllAudiences,
} from "@/lib/workspace/access/audience-match";
import {
  computeEffectiveAccessPaths,
} from "@/lib/workspace/access/effective-access";
import type { WorkspaceActorMembership } from "@/lib/workspace/access/membership-resolution";
import {
  levelPermits,
  toCanonicalResourceLevel,
  UnsupportedWorkspaceAccessLevelError,
  type CanonicalResourceLevel,
} from "@/lib/workspace/access/resource-level";
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  loadWorkspaceResourceGraph,
  type WorkspaceResourceGraph,
} from "@/lib/workspace/access/resource-graph";
import type { ActorWorkspaceIdentity } from "@/lib/workspace/access/types";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export class WorkspaceAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAuthorizationError";
  }
}

export type WorkspaceActorContext = {
  identity: ActorWorkspaceIdentity;
  membership: WorkspaceActorMembership;
  permissionKeys: readonly string[];
  graph: WorkspaceResourceGraph;
  /** Dynamic tenant Club Admin (club_admin__{tenantKey}) — not a persisted Workspace ACL grant. */
  isCanonicalTenantClubAdmin: boolean;
};

export function hasWorkspaceTenantViewCapability(
  permissionKeys: readonly string[],
): boolean {
  return (
    permissionKeys.includes(PERMISSIONS.WORKSPACE_VIEW) ||
    permissionKeys.includes(PERMISSIONS.WORKSPACE_MANAGE)
  );
}

export function hasWorkspaceTenantManageCapability(
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.includes(PERMISSIONS.WORKSPACE_MANAGE);
}

function maxLevel(
  levels: readonly CanonicalResourceLevel[],
): CanonicalResourceLevel | null {
  if (levels.length === 0) {
    return null;
  }
  const rank = { VIEW: 1, EDIT: 2, MANAGE: 3 } as const;
  return levels.reduce((best, cur) => (rank[cur] > rank[best] ? cur : best));
}

function resolveResourceAccessChain(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
) {
  return input.resourceType === WorkspaceResourceType.FOLDER
    ? buildFolderAccessChain(actor.graph, input.folderId)
    : buildDocumentAccessChain(actor.graph, input.documentId);
}

/** Effective level from Workspace ACL paths only (no Club Admin tenant override). */
export function getWorkspaceResourceAclEffectiveAccessLevel(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): CanonicalResourceLevel | null {
  if (
    actor.identity.tenantId !== actor.membership.tenantId ||
    actor.identity.tenantId !== actor.graph.tenantId
  ) {
    return null;
  }

  if (pureWorkspaceAclGrantsResourceAccess({ permissionKeys: actor.permissionKeys })) {
    return null;
  }

  const chain = resolveResourceAccessChain(actor, input);

  if (!chain) {
    return null;
  }

  let paths;
  try {
    paths = computeEffectiveAccessPaths(chain);
  } catch {
    return null;
  }

  const matched: CanonicalResourceLevel[] = [];

  for (const path of paths) {
    if (
      actorMatchesAllAudiences(
        actor.identity,
        actor.membership,
        path.requiredAudiences,
      )
    ) {
      matched.push(path.effectiveLevel);
    }
  }

  return maxLevel(matched);
}

export function getWorkspaceEffectiveAccessLevel(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): CanonicalResourceLevel | null {
  if (
    actor.identity.tenantId !== actor.membership.tenantId ||
    actor.identity.tenantId !== actor.graph.tenantId
  ) {
    return null;
  }

  const chain = resolveResourceAccessChain(actor, input);
  if (!chain) {
    return null;
  }

  if (actor.isCanonicalTenantClubAdmin) {
    return "MANAGE";
  }

  return getWorkspaceResourceAclEffectiveAccessLevel(actor, input);
}

export function canWorkspaceView(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): boolean {
  if (!hasWorkspaceTenantViewCapability(actor.permissionKeys)) {
    return false;
  }

  const level = getWorkspaceEffectiveAccessLevel(actor, input);
  return level != null && levelPermits(level, "VIEW");
}

export function canWorkspaceEdit(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): boolean {
  if (!hasWorkspaceTenantManageCapability(actor.permissionKeys)) {
    return false;
  }

  const level = getWorkspaceEffectiveAccessLevel(actor, input);
  return level != null && levelPermits(level, "EDIT");
}

export function canWorkspaceManage(
  actor: WorkspaceActorContext,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): boolean {
  if (!hasWorkspaceTenantManageCapability(actor.permissionKeys)) {
    return false;
  }

  const level = getWorkspaceEffectiveAccessLevel(actor, input);
  return level != null && levelPermits(level, "MANAGE");
}

export function assertWorkspaceAccess(
  actor: WorkspaceActorContext,
  required: CanonicalResourceLevel,
  input:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string },
): void {
  if (!hasWorkspaceTenantViewCapability(actor.permissionKeys)) {
    throw new WorkspaceAuthorizationError("Tenant workspace capability required.");
  }

  if (
    required !== "VIEW" &&
    !hasWorkspaceTenantManageCapability(actor.permissionKeys)
  ) {
    throw new WorkspaceAuthorizationError("Tenant workspace manage capability required.");
  }

  const level = getWorkspaceEffectiveAccessLevel(actor, input);
  if (level == null || !levelPermits(level, required)) {
    throw new WorkspaceAuthorizationError("Resource access denied.");
  }
}

export type AuthorizedWorkspaceResourceIds = {
  folderIds: readonly string[];
  documentIds: readonly string[];
};

export function computeAuthorizedReadableResourceIds(
  actor: WorkspaceActorContext,
): AuthorizedWorkspaceResourceIds {
  if (!hasWorkspaceTenantViewCapability(actor.permissionKeys)) {
    return { folderIds: [], documentIds: [] };
  }

  const folderIds: string[] = [];
  for (const folderId of actor.graph.folders.keys()) {
    if (
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId,
      })
    ) {
      folderIds.push(folderId);
    }
  }

  const documentIds: string[] = [];
  for (const documentId of actor.graph.documents.keys()) {
    if (
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId,
      })
    ) {
      documentIds.push(documentId);
    }
  }

  return { folderIds, documentIds };
}

export async function createWorkspaceActorContext(input: {
  tenantId: string;
  userId: string;
  personId: string | null;
  permissionKeys: readonly string[];
  graph?: WorkspaceResourceGraph;
  isCanonicalTenantClubAdmin?: boolean;
}): Promise<WorkspaceActorContext> {
  const { loadWorkspaceActorMembership } = await import(
    "@/lib/workspace/access/membership-resolution"
  );
  const { prisma } = await import("@/lib/db/prisma");
  const { isTenantClubAdmin } = await import("@/lib/roles/is-tenant-club-admin");

  const [membership, graph, tenant] = await Promise.all([
    loadWorkspaceActorMembership(input.tenantId, input.personId),
    input.graph ?? loadWorkspaceResourceGraph(input.tenantId),
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { key: true },
    }),
  ]);

  let isCanonicalTenantClubAdmin = input.isCanonicalTenantClubAdmin ?? false;
  if (input.isCanonicalTenantClubAdmin === undefined && tenant?.key) {
    isCanonicalTenantClubAdmin = await isTenantClubAdmin(
      input.userId,
      input.tenantId,
      tenant.key,
    );
  }

  return {
    identity: {
      tenantId: input.tenantId,
      userId: input.userId,
      personId: input.personId,
    },
    membership,
    permissionKeys: input.permissionKeys,
    graph,
    isCanonicalTenantClubAdmin,
  };
}

export function safeCanonicalLevelFromGrant(
  level: Parameters<typeof toCanonicalResourceLevel>[0],
): CanonicalResourceLevel | null {
  try {
    return toCanonicalResourceLevel(level);
  } catch (error) {
    if (error instanceof UnsupportedWorkspaceAccessLevelError) {
      return null;
    }
    throw error;
  }
}
