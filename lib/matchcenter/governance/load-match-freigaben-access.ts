import type { Session } from "next-auth";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { prisma } from "@/lib/db/prisma";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import {
  resolveMatchFreigabenAccessFromContext,
  type MatchFreigabenAccess,
} from "./resolve-match-freigaben-access";

export async function loadMatchFreigabenAccess(input: {
  session: Session;
  tenantId: string;
}): Promise<MatchFreigabenAccess> {
  const { platform, tenant } = await getRequestEffectivePermissions(
    input.session.user.id,
    input.tenantId,
  );

  const personId = await resolvePersonIdForUser(input.tenantId, input.session.user.id);

  const typeConfig = await prisma.sceActivityGovernanceTypeConfig.findUnique({
    where: {
      tenantId_activityType: {
        tenantId: input.tenantId,
        activityType: "MATCH",
      },
    },
    include: {
      validators: { select: { personId: true } },
    },
  });

  const validatorPersonIds = typeConfig?.validators.map((row) => row.personId) ?? [];

  return resolveMatchFreigabenAccessFromContext({
    platformPermissions: platform as readonly PermissionKey[],
    tenantPermissions: tenant as readonly PermissionKey[],
    personId,
    validatorPersonIds,
  });
}
