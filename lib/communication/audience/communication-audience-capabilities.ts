import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import { tenantPermissionsIncludeDirectMessageSend } from "@/lib/communication/direct/route-access";

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
    if (!tenantPermissionsIncludeDirectMessageSend(tenant)) {
      return {
        wholeOrganisation: false,
        orgUnits: false,
        teams: false,
        targetGroups: false,
        roles: false,
        persons: false,
      };
    }

    const clubSend = has(PERMISSIONS.COMMUNICATION_CLUB_SEND);
    const teamSend = has(PERMISSIONS.COMMUNICATION_TEAM_SEND);
    const tenantAdmin = TENANT_ADMINISTRATION_PERMISSIONS.some((key) => has(key));
    const structuralSend = clubSend || teamSend || tenantAdmin;

    return {
      wholeOrganisation: clubSend || tenantAdmin,
      orgUnits: structuralSend,
      teams: structuralSend,
      targetGroups: clubSend || tenantAdmin,
      roles: structuralSend,
      persons: structuralSend,
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
