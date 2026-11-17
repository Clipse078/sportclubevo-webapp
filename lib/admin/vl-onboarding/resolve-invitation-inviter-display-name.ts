import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveAuditActorDisplayName } from "@/lib/registrations/actor-display";
import { INVITATION_PREVIEW_NEUTRAL_INVITER_ATTRIBUTION } from "@/lib/email/templates/invitation-preview-samples";

/**
 * Human-readable inviter for invitation copy — effective actor (impersonation-aware
 * via the caller's chosen user id), not an arbitrary fixture person row.
 */
export async function resolveInvitationInviterDisplayName(
  actorUserId: string | undefined,
): Promise<string | undefined> {
  if (!actorUserId?.trim()) {
    return undefined;
  }

  const user = await prisma.user.findUnique({
    where: { id: actorUserId.trim() },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
  });

  return resolveAuditActorDisplayName(user ?? undefined) ?? undefined;
}

/** Sample attribution when preview intentionally lacks a resolved actor name. */
export function resolveInvitationPreviewInviterDisplayName(
  resolvedActorName: string | undefined,
): string | undefined {
  if (resolvedActorName?.trim()) {
    return resolvedActorName.trim();
  }
  return INVITATION_PREVIEW_NEUTRAL_INVITER_ATTRIBUTION;
}