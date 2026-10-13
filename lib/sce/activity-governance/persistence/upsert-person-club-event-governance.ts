import { prisma } from "@/lib/db/prisma";
import { ensureClubEventGovernanceTypeConfig } from "./load-club-governance-policy";
import type { SceActivityPublicationAuthority } from "@/lib/sce/activity-governance/types";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";
import { loadSceActivityClubGovernancePolicy } from "./load-club-governance-policy";

export async function upsertPersonClubEventGovernance(input: {
  tenantId: string;
  personId: string;
  createEnabled: boolean;
  publicationAuthority: SceActivityPublicationAuthority;
}) {
  const typeConfig = await ensureClubEventGovernanceTypeConfig(input.tenantId);

  await prisma.sceActivityGovernanceCreatorPolicy.upsert({
    where: {
      typeConfigId_personId: {
        typeConfigId: typeConfig.id,
        personId: input.personId,
      },
    },
    create: {
      tenantId: input.tenantId,
      typeConfigId: typeConfig.id,
      personId: input.personId,
      createEnabled: input.createEnabled,
      publicationAuthority: input.publicationAuthority,
    },
    update: {
      createEnabled: input.createEnabled,
      publicationAuthority: input.publicationAuthority,
    },
  });

  const policy = await loadSceActivityClubGovernancePolicy(input.tenantId);
  const issues = validateActivityGovernanceConfiguration(policy);
  if (issues.length > 0) {
    throw new Error(issues[0]?.message ?? "Ungültige Freigabe-Konfiguration.");
  }
}

export async function setClubEventValidatorPool(input: {
  tenantId: string;
  validatorPersonIds: readonly string[];
}) {
  const typeConfig = await ensureClubEventGovernanceTypeConfig(input.tenantId);
  await prisma.sceActivityGovernanceValidator.deleteMany({
    where: { typeConfigId: typeConfig.id, tenantId: input.tenantId },
  });
  if (input.validatorPersonIds.length > 0) {
    await prisma.sceActivityGovernanceValidator.createMany({
      data: input.validatorPersonIds.map((personId) => ({
        tenantId: input.tenantId,
        typeConfigId: typeConfig.id,
        personId,
      })),
    });
  }
}
