/**
 * WORKSPACE-02 — dynamic audience predicate evaluation for an actor.
 */

import type { AudienceRef } from "@/lib/workspace/access/audience";
import type { WorkspaceActorMembership } from "@/lib/workspace/access/membership-resolution";
import { actorMatchesPersonGrant } from "@/lib/workspace/access/identity";
import type { ActorWorkspaceIdentity } from "@/lib/workspace/access/types";

export function actorMatchesAudience(
  actor: ActorWorkspaceIdentity,
  membership: WorkspaceActorMembership,
  audience: AudienceRef,
): boolean {
  if (actor.tenantId !== membership.tenantId) {
    return false;
  }

  switch (audience.kind) {
    case "ORGANISATION":
      return actor.tenantId === membership.tenantId;
    case "PERSON":
      return actorMatchesPersonGrant(actor, audience.personId);
    case "ORG_UNIT":
      return membership.orgUnitIds.has(audience.orgUnitId);
    case "TEAM":
      return membership.teamIds.has(audience.teamId);
    case "ROLE":
      if (!membership.personId) {
        return false;
      }
      return membership.roleAssignments.some((assignment) => {
        if (assignment.functionKey !== audience.functionKey) {
          return false;
        }
        if (
          audience.roleScopeOrgUnitId &&
          assignment.orgUnitId !== audience.roleScopeOrgUnitId
        ) {
          return false;
        }
        if (
          audience.roleScopeTeamId &&
          assignment.teamId !== audience.roleScopeTeamId
        ) {
          return false;
        }
        return true;
      });
    default:
      return false;
  }
}

export function actorMatchesAllAudiences(
  actor: ActorWorkspaceIdentity,
  membership: WorkspaceActorMembership,
  audiences: readonly AudienceRef[],
): boolean {
  return audiences.every((audience) =>
    actorMatchesAudience(actor, membership, audience),
  );
}
