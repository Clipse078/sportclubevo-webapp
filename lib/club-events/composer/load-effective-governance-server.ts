import { auth } from "@/auth";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasPermission } from "@/lib/permissions/has-permission";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { resolvePersonEffectiveActivityGovernance } from "@/lib/sce/activity-governance/persistence/resolve-person-effective-governance";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";

export async function loadClubEventEffectiveGovernanceForSession(input: {
  tenantId: string;
}): Promise<SceActivityEffectiveGovernance | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const personId = await resolvePersonIdForUser(input.tenantId, session.user.id);
  if (!personId) {
    return {
      activityType: "CLUB_EVENT",
      personId: "unlinked",
      mayCreate: hasPermission(session, PERMISSIONS.EVENTS_MANAGE),
      publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
      approvalStrategy: "ANY_ONE",
      validatorPersonIds: [],
    };
  }

  const held = new Set(
    Object.values(PERMISSIONS).filter((key) => hasPermission(session, key)),
  );

  return resolvePersonEffectiveActivityGovernance({
    tenantId: input.tenantId,
    personId,
    activityType: "CLUB_EVENT",
    heldPermissions: held,
  });
}
