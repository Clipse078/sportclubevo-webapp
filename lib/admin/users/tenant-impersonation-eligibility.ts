/**
 * Client-safe impersonation target eligibility (no DB imports).
 * Actor permission must be resolved on the server and passed in.
 */

import { resolvePersonAccessStatus } from "@/lib/admin/users/person-access-status";

/** UI visibility for People & Access impersonation start (server-derived actor flag + target snapshot). */
export function canShowImpersonateTenantUserAction(input: {
  actorCanImpersonate: boolean;
  actorUserId: string;
  targetUserId: string;
  pendingInvitation: boolean;
  membershipIsActive: boolean;
  userIsActive: boolean;
  isPlatformSystemIdentity: boolean;
}): boolean {
  if (!input.actorCanImpersonate) return false;
  if (input.actorUserId === input.targetUserId) return false;
  if (input.isPlatformSystemIdentity) return false;

  return resolvePersonAccessStatus({
    pendingInvitation: input.pendingInvitation,
    membershipIsActive: input.membershipIsActive,
    userIsActive: input.userIsActive,
  }).isFullyActive;
}
