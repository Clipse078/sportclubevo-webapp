import { loadRequirementAudienceLabels } from "@/lib/requirements/audience-selector-search";
import { prisma } from "@/lib/db/prisma";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";

export async function loadZielgruppeDefinitionLabels(
  tenantId: string,
  definition: ZielgruppeEditorDefinition,
) {
  const audienceLabels = await loadRequirementAudienceLabels({
    tenantId,
    teamIds: definition.teamIds,
    orgUnitIds: definition.orgUnitIds,
    roleIds: definition.roleIds,
    targetGroupIds: [],
  });

  const personIds = [...definition.includePersonIds, ...definition.excludePersonIds];
  const persons =
    personIds.length > 0
      ? await prisma.person.findMany({
          where: { tenantId, id: { in: personIds } },
          select: { id: true, firstName: true, lastName: true, displayName: true },
        })
      : [];

  const personMap: Record<string, string> = {};
  for (const p of persons) {
    personMap[p.id] = p.displayName?.trim() || `${p.firstName} ${p.lastName}`.trim();
  }

  return {
    orgUnits: Object.fromEntries(audienceLabels.orgUnits.map((r) => [r.orgUnitId, r.label])),
    teams: Object.fromEntries(audienceLabels.teams.map((r) => [r.teamId, r.label])),
    roles: Object.fromEntries(audienceLabels.roles.map((r) => [r.roleId, r.label])),
    persons: personMap,
  };
}
