import { prisma } from "@/lib/db/prisma";
import type {
  SceActivityClubGovernancePolicy,
  SceActivityTypeGovernancePolicy,
} from "@/lib/sce/activity-governance/types";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";

const ACTIVITY_TYPE_MAP = {
  CLUB_EVENT: "CLUB_EVENT",
  TRAINING: "TRAINING",
  MATCH: "MATCH",
  TOURNAMENT: "TOURNAMENT",
} as const satisfies Record<SceActivityCreateKind, string>;

export async function loadSceActivityClubGovernancePolicy(
  tenantId: string,
): Promise<SceActivityClubGovernancePolicy> {
  const configs = await prisma.sceActivityGovernanceTypeConfig.findMany({
    where: { tenantId },
    include: {
      creatorPolicies: true,
      validators: true,
    },
  });

  const activityTypes: SceActivityTypeGovernancePolicy[] = configs.map((config) => {
    const activityType = config.activityType as SceActivityCreateKind;
    void ACTIVITY_TYPE_MAP[activityType];
    return {
      activityType,
      defaultPublicationAuthority: config.defaultPublicationAuthority,
      validatorPersonIds: config.validators.map((v) => v.personId),
      creatorPolicies: config.creatorPolicies.map((p) => ({
        personId: p.personId,
        publicationAuthority:
          p.publicationAuthority ?? config.defaultPublicationAuthority,
      })),
    };
  });

  return { tenantId, activityTypes };
}

export async function ensureClubEventGovernanceTypeConfig(tenantId: string) {
  return prisma.sceActivityGovernanceTypeConfig.upsert({
    where: {
      tenantId_activityType: { tenantId, activityType: "CLUB_EVENT" },
    },
    create: {
      tenantId,
      activityType: "CLUB_EVENT",
      defaultPublicationAuthority: "DIRECT_PUBLISH",
    },
    update: {},
  });
}
