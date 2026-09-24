import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canSeeMeeting } from "@/lib/meetings/queries";
import type { ActorContext } from "@/lib/visibility/actor-context";

export type PersonalMeetingProjectionActor = {
  userId: string;
  tenantId: string;
  permissionKeys: string[];
  orgUnitIds?: string[];
  roleKeys?: string[];
};

export type PersonalMeetingAuthorizationRow = {
  id: string;
  tenantId: string;
  status: string;
  visibilityScope: string;
  createdByUserId: string | null;
  visibleRoleRefs: unknown;
  visibleUserRefs: unknown;
  visibleTeamRefs: unknown;
  visibleOrgUnitRefs: unknown;
  visiblePersonRefs: unknown;
  visibleTargetGroupRefs?: unknown;
};

function hasAnyPermission(actor: PersonalMeetingProjectionActor, keys: string[]): boolean {
  return keys.some((k) => actor.permissionKeys.includes(k));
}

export function actorContextFromMeetingProjectionActor(
  actor: PersonalMeetingProjectionActor,
): ActorContext {
  return {
    userId: actor.userId,
    tenantId: actor.tenantId,
    permissionKeys: actor.permissionKeys,
    roleKeys: actor.roleKeys ?? [],
    orgUnitIds: actor.orgUnitIds ?? [],
    targetGroupIds: [],
  };
}

/**
 * Personal programme meeting visibility (authorization layer).
 * Call only after participant or organiser personal relevance is established.
 */
export function canIncludeMeetingInPersonalProgramme(
  actor: PersonalMeetingProjectionActor,
  meeting: PersonalMeetingAuthorizationRow,
): boolean {
  if (meeting.tenantId !== actor.tenantId) {
    return false;
  }
  if (!hasAnyPermission(actor, [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE])) {
    return false;
  }
  const actorCtx = actorContextFromMeetingProjectionActor(actor);
  return canSeeMeeting(meeting, actorCtx);
}
