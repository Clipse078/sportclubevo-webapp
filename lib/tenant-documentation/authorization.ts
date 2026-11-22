/**
 * Tenant Documentation — resource authorization (tenant + ACL grants).
 */

import {
  TenantDocumentationAccessLevel,
  TenantDocumentationAccessSubjectType,
  TenantDocumentationResourceType,
  type TenantDocumentationAccessGrant,
} from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasTenantDocumentationModuleView } from "@/lib/tenant-documentation/tenant-documentation-route-permissions";
import { actorMatchesAudience } from "@/lib/workspace/access/audience-match";
import type { AudienceRef } from "@/lib/workspace/access/audience";
import { resolveWorkspaceActor } from "@/lib/workspace/access/actor-context";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";

const LEVEL_RANK: Record<TenantDocumentationAccessLevel, number> = {
  VIEW: 1,
  EDIT: 2,
  PUBLISH: 3,
  MANAGE: 4,
};

export type TenantDocumentationActorContext = WorkspaceActorContext;

export async function resolveTenantDocumentationActor(input: {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
}): Promise<TenantDocumentationActorContext> {
  return resolveWorkspaceActor(input);
}

function grantToAudience(grant: TenantDocumentationAccessGrant): AudienceRef | null {
  switch (grant.subjectType) {
    case TenantDocumentationAccessSubjectType.CLUB:
      return { kind: "ORGANISATION" };
    case TenantDocumentationAccessSubjectType.PERSON:
      return grant.personId ? { kind: "PERSON", personId: grant.personId } : null;
    case TenantDocumentationAccessSubjectType.ORG_UNIT:
      return grant.orgUnitId ? { kind: "ORG_UNIT", orgUnitId: grant.orgUnitId } : null;
    case TenantDocumentationAccessSubjectType.TEAM:
      return grant.teamId ? { kind: "TEAM", teamId: grant.teamId } : null;
    case TenantDocumentationAccessSubjectType.ROLE_FUNCTION:
      return grant.roleFunctionKey
        ? {
            kind: "ROLE",
            functionKey: grant.roleFunctionKey,
            roleScopeOrgUnitId: grant.roleScopeOrgUnitId,
            roleScopeTeamId: grant.roleScopeTeamId,
          }
        : null;
    default:
      return null;
  }
}

function maxAccessLevel(
  levels: readonly TenantDocumentationAccessLevel[],
): TenantDocumentationAccessLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((best, cur) =>
    LEVEL_RANK[cur] > LEVEL_RANK[best] ? cur : best,
  );
}

function tenantPermissionFloor(
  permissionKeys: readonly string[],
): TenantDocumentationAccessLevel | null {
  if (permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE)) {
    return TenantDocumentationAccessLevel.MANAGE;
  }
  if (permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH)) {
    return TenantDocumentationAccessLevel.PUBLISH;
  }
  if (permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_EDIT)) {
    return TenantDocumentationAccessLevel.EDIT;
  }
  if (permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_VIEW)) {
    return TenantDocumentationAccessLevel.VIEW;
  }
  return null;
}

export { hasTenantDocumentationModuleView } from "@/lib/tenant-documentation/tenant-documentation-route-permissions";

export function evaluateGrantLevelForActor(
  actor: TenantDocumentationActorContext,
  grants: readonly TenantDocumentationAccessGrant[],
): TenantDocumentationAccessLevel | null {
  const matched: TenantDocumentationAccessLevel[] = [];
  for (const grant of grants) {
    const audience = grantToAudience(grant);
    if (!audience) continue;
    if (
      actorMatchesAudience(actor.identity, actor.membership, audience)
    ) {
      matched.push(grant.accessLevel);
    }
  }
  return maxAccessLevel(matched);
}

export function resolveEffectivePageAccess(
  actor: TenantDocumentationActorContext,
  input: {
    spaceGrants: readonly TenantDocumentationAccessGrant[];
    pageGrants: readonly TenantDocumentationAccessGrant[];
    spaceHasExplicitGrants: boolean;
  },
): TenantDocumentationAccessLevel | null {
  const tenantFloor = tenantPermissionFloor(actor.permissionKeys);
  if (!tenantFloor) return null;

  const grantLevel = maxAccessLevel(
    [
      evaluateGrantLevelForActor(actor, input.spaceGrants) ?? undefined,
      evaluateGrantLevelForActor(actor, input.pageGrants) ?? undefined,
    ].filter((v): v is TenantDocumentationAccessLevel => v != null),
  );

  if (input.spaceHasExplicitGrants && !grantLevel) {
    return null;
  }

  if (!grantLevel) {
    return tenantFloor;
  }

  return LEVEL_RANK[grantLevel] > LEVEL_RANK[tenantFloor] ? grantLevel : tenantFloor;
}

export function accessLevelPermits(
  effective: TenantDocumentationAccessLevel | null,
  required: TenantDocumentationAccessLevel,
): boolean {
  if (!effective) return false;
  return LEVEL_RANK[effective] >= LEVEL_RANK[required];
}

export class TenantDocumentationAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantDocumentationAuthorizationError";
  }
}

export function assertTenantDocumentationAccess(
  effective: TenantDocumentationAccessLevel | null,
  required: TenantDocumentationAccessLevel,
): void {
  if (!accessLevelPermits(effective, required)) {
    throw new TenantDocumentationAuthorizationError("Forbidden");
  }
}

export function resourceTypeFromGrant(
  grant: TenantDocumentationAccessGrant,
): TenantDocumentationResourceType {
  return grant.resourceType;
}