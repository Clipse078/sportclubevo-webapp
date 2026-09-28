import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

export type CommunicationAudienceCapabilities = {
  wholeOrganisation: boolean;
  orgUnits: boolean;
  teams: boolean;
  targetGroups: boolean;
  roles: boolean;
  persons: boolean;
};

export async function resolveCommunicationAudienceCapabilities(input: {
  tenantId: string;
  userId: string;
  context: CommunicationContextRef;
}): Promise<CommunicationAudienceCapabilities> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({
    userId: input.userId,
    tenantId: input.tenantId,
  });

  const has = (key: string) => tenant.includes(key);

  if (input.context.kind === "DIRECT") {
    const clubSend = has(PERMISSIONS.COMMUNICATION_CLUB_SEND);
    const teamSend = has(PERMISSIONS.COMMUNICATION_TEAM_SEND);
    const canSend = clubSend || teamSend;
    return {
      wholeOrganisation: clubSend,
      orgUnits: canSend,
      teams: canSend,
      targetGroups: clubSend,
      roles: canSend,
      persons: canSend,
    };
  }

  const canSend = has(PERMISSIONS.COMMUNICATION_CLUB_SEND);
  return {
    wholeOrganisation: canSend,
    orgUnits: canSend,
    teams: canSend,
    targetGroups: canSend,
    roles: canSend,
    persons: canSend,
  };
}
