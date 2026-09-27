/**
 * SCE-COMM-11 — canonical club audience builders (no parallel recipient engine).
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export function wholeOrganisationAudienceSpec(): CommunicationAudienceSpec {
  return {
    composition: "UNION",
    components: [{ structural: { wholeOrganisation: true } }],
  };
}

export function audienceSpecFromSavedTargetGroupIds(targetGroupIds: readonly string[]): CommunicationAudienceSpec {
  const ids = [...new Set(targetGroupIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new TeamCommunicationValidationError("at least one saved target group is required");
  }
  return {
    composition: "UNION",
    components: ids.map((id) => ({ savedTargetGroupIds: [id] })),
  };
}

export function audienceSpecFromStructuralSelectors(
  selectors: StructuralAudienceSelectors,
): CommunicationAudienceSpec {
  return {
    composition: "UNION",
    components: [{ structural: selectors }],
  };
}

export async function assertTenantOwnedTargetGroupIds(input: {
  tenantId: string;
  targetGroupIds: readonly string[];
}): Promise<void> {
  const ids = [...new Set(input.targetGroupIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return;

  const rows = await prisma.targetGroup.findMany({
    where: { id: { in: ids }, tenantId: input.tenantId },
    select: { id: true, status: true },
  });
  if (rows.length !== ids.length) {
    throw new TeamCommunicationValidationError("target group not found for tenant");
  }
  const archived = rows.filter((r) => r.status === "ARCHIVED");
  if (archived.length > 0) {
    throw new TeamCommunicationValidationError("archived target group cannot be used for dispatch");
  }
}

export async function assertTenantOwnedStructuralSelectors(input: {
  tenantId: string;
  selectors: StructuralAudienceSelectors;
}): Promise<void> {
  const { tenantId, selectors } = input;
  if (selectors.orgUnitIds?.length) {
    const count = await prisma.orgUnit.count({
      where: { tenantId, id: { in: selectors.orgUnitIds } },
    });
    if (count !== selectors.orgUnitIds.length) {
      throw new TeamCommunicationValidationError("org unit not found for tenant");
    }
  }
  if (selectors.teamIds?.length) {
    const count = await prisma.team.count({
      where: { tenantId, id: { in: selectors.teamIds } },
    });
    if (count !== selectors.teamIds.length) {
      throw new TeamCommunicationValidationError("team not found for tenant");
    }
  }
  if (selectors.roleIds?.length) {
    const count = await prisma.role.count({
      where: { tenantId, id: { in: selectors.roleIds }, scope: "TENANT" },
    });
    if (count !== selectors.roleIds.length) {
      throw new TeamCommunicationValidationError("role not found for tenant");
    }
  }
}
