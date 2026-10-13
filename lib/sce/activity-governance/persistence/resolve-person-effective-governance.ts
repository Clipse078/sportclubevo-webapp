import type { PermissionKey } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";
import {
  resolveEffectiveActivityGovernance,
  type ResolveEffectiveGovernanceInput,
} from "@/lib/sce/activity-governance/resolve-effective-governance";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { loadSceActivityClubGovernancePolicy } from "./load-club-governance-policy";

export async function resolvePersonEffectiveActivityGovernance(input: {
  tenantId: string;
  personId: string;
  activityType: SceActivityCreateKind;
  heldPermissions: ReadonlySet<PermissionKey>;
}): Promise<SceActivityEffectiveGovernance> {
  const clubPolicy = await loadSceActivityClubGovernancePolicy(input.tenantId);
  const base = resolveEffectiveActivityGovernance({
    activityType: input.activityType,
    personId: input.personId,
    heldPermissions: input.heldPermissions,
    clubPolicy,
  } satisfies ResolveEffectiveGovernanceInput);

  const creatorRow = await prisma.sceActivityGovernanceCreatorPolicy.findFirst({
    where: {
      tenantId: input.tenantId,
      personId: input.personId,
      typeConfig: { activityType: input.activityType },
    },
    select: { createEnabled: true, publicationAuthority: true },
  });

  if (creatorRow && !creatorRow.createEnabled) {
    return { ...base, mayCreate: false };
  }

  if (creatorRow?.publicationAuthority && base.mayCreate) {
    return { ...base, publicationAuthority: creatorRow.publicationAuthority };
  }

  return base;
}
