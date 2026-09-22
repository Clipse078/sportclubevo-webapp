/**
 * AUFGABEN-06G7 — server-side draft audience preview (canonical 06G6 resolver only).
 */

import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "./requirement-audience-resolvers";
import {
  resolveRequirementAudiencePersonIdsFromDraftRows,
  resolveRequirementAudiencePersonIdsFromSnapshot,
} from "./requirement-audience";
import type { RequirementDraftAudienceInput } from "./types";
import { RequirementTenantMismatchError } from "./errors";

export type RequirementAudiencePreviewBreakdown = {
  explicitPersonCount: number;
  teamPersonCount: number;
  orgUnitPersonCount: number;
  rolePersonCount: number;
  targetGroupPersonCount: number;
  resolvedTotal: number;
};

function dedupe(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function previewRequirementDraftAudience(
  tenantId: string,
  input: RequirementDraftAudienceInput,
): Promise<RequirementAudiencePreviewBreakdown> {
  const personIds = dedupe(input.personIds ?? []);
  const teamIds = dedupe(input.teamIds ?? []);
  const orgUnitIds = dedupe(input.orgUnitIds ?? []);
  const roleIds = dedupe(input.roleIds ?? []);
  const targetGroupIds = dedupe(input.targetGroupIds ?? []);

  try {
    const [teamPersonIds, orgUnitPersonIds, rolePersonIds, targetGroupPersonIds] =
      await Promise.all([
        teamIds.length ? resolveTeamAudiencePersonIds(tenantId, teamIds) : Promise.resolve([]),
        orgUnitIds.length
          ? resolveOrgUnitAudiencePersonIds(tenantId, orgUnitIds)
          : Promise.resolve([]),
        roleIds.length ? resolveRoleAudiencePersonIds(tenantId, roleIds) : Promise.resolve([]),
        targetGroupIds.length
          ? resolveTargetGroupAudiencePersonIds(tenantId, targetGroupIds)
          : Promise.resolve([]),
      ]);

    const explicitPersonIds = resolveRequirementAudiencePersonIdsFromDraftRows(
      personIds.map((personId) => ({ personId })),
    );

    const resolvedTotal = await resolveRequirementAudiencePersonIdsFromSnapshot(tenantId, {
      persons: personIds.map((personId) => ({ personId })),
      teams: teamIds.map((teamId) => ({ teamId })),
      orgUnits: orgUnitIds.map((orgUnitId) => ({ orgUnitId })),
      roles: roleIds.map((roleId) => ({ roleId })),
      targetGroups: targetGroupIds.map((targetGroupId) => ({ targetGroupId })),
    });

    return {
      explicitPersonCount: explicitPersonIds.length,
      teamPersonCount: teamPersonIds.length,
      orgUnitPersonCount: orgUnitPersonIds.length,
      rolePersonCount: rolePersonIds.length,
      targetGroupPersonCount: targetGroupPersonIds.length,
      resolvedTotal: resolvedTotal.length,
    };
  } catch {
    throw new RequirementTenantMismatchError("One or more audience selectors are invalid for this tenant");
  }
}
