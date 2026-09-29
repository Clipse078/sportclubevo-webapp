/**
 * Requirement draft audience resolution — canonical Person-id projection before activation.
 */

import { prisma } from "@/lib/db/prisma";
import {
  resolveRequirementAudiencePersonIdsFromComposition,
  resolveRequirementAudiencePersonIdsFromDraftInput,
} from "./requirement-audience-composition";
import {
  legacyFlatInputToRequirementAudienceComposition,
  parseRequirementAudienceCompositionJson,
  requirementAudienceCompositionIsEmpty,
} from "./requirement-audience-composition-model";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "./requirement-audience-resolvers";
import type { RequirementDraftAudienceInput } from "./types";

export type RequirementDraftAudienceSnapshot = {
  persons: ReadonlyArray<{ personId: string }>;
  teams: ReadonlyArray<{ teamId: string }>;
  orgUnits: ReadonlyArray<{ orgUnitId: string }>;
  roles: ReadonlyArray<{ roleId: string }>;
  targetGroups: ReadonlyArray<{ targetGroupId: string }>;
};

function dedupePersonIds(personIds: readonly string[]): string[] {
  return [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
}

/**
 * Resolves explicit draft person rows only (EXPLICIT_PERSONS). Used by legacy callers/tests.
 */
export function resolveRequirementAudiencePersonIdsFromDraftRows(
  draftAudience: ReadonlyArray<{ personId: string }>,
): string[] {
  return dedupePersonIds(draftAudience.map((entry) => entry.personId));
}

export async function resolveRequirementAudiencePersonIdsFromSnapshot(
  tenantId: string,
  snapshot: RequirementDraftAudienceSnapshot,
  compositionJson?: unknown,
): Promise<string[]> {
  const input: RequirementDraftAudienceInput = {
    personIds: snapshot.persons.map((entry) => entry.personId),
    teamIds: snapshot.teams.map((entry) => entry.teamId),
    orgUnitIds: snapshot.orgUnits.map((entry) => entry.orgUnitId),
    roleIds: snapshot.roles.map((entry) => entry.roleId),
    targetGroupIds: snapshot.targetGroups.map((entry) => entry.targetGroupId),
  };
  return resolveRequirementAudiencePersonIdsFromDraftInput(tenantId, input, compositionJson);
}

/**
 * Resolves draft audience to canonical subject Person ids before activation snapshot.
 */
export async function resolveRequirementAudiencePersonIds(
  tenantId: string,
  requirementId: string,
): Promise<string[]> {
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, tenantId },
    select: {
      draftAudienceCompositionJson: true,
      draftAudience: { select: { personId: true } },
      draftAudienceTeams: { select: { teamId: true } },
      draftAudienceOrgUnits: { select: { orgUnitId: true } },
      draftAudienceRoles: { select: { roleId: true } },
      draftAudienceTargetGroups: { select: { targetGroupId: true } },
    },
  });
  if (!requirement) {
    return [];
  }

  return resolveRequirementAudiencePersonIdsFromSnapshot(
    tenantId,
    {
      persons: requirement.draftAudience,
      teams: requirement.draftAudienceTeams,
      orgUnits: requirement.draftAudienceOrgUnits,
      roles: requirement.draftAudienceRoles,
      targetGroups: requirement.draftAudienceTargetGroups,
    },
    requirement.draftAudienceCompositionJson,
  );
}

export async function resolveRequirementAudiencePersonIdsFromAudienceInput(
  tenantId: string,
  input: RequirementDraftAudienceInput,
): Promise<string[]> {
  if (input.composition && !requirementAudienceCompositionIsEmpty(input.composition)) {
    return resolveRequirementAudiencePersonIdsFromComposition(tenantId, input.composition);
  }
  return resolveRequirementAudiencePersonIdsFromDraftInput(tenantId, input);
}

/** @deprecated Prefer composition resolver; kept for tests referencing legacy union expansion. */
export async function resolveRequirementAudiencePersonIdsFromSnapshotLegacyUnion(
  tenantId: string,
  snapshot: RequirementDraftAudienceSnapshot,
): Promise<string[]> {
  const explicitPersonIds = resolveRequirementAudiencePersonIdsFromDraftRows(snapshot.persons);
  const [teamPersonIds, orgUnitPersonIds, rolePersonIds, targetGroupPersonIds] = await Promise.all([
    resolveTeamAudiencePersonIds(
      tenantId,
      snapshot.teams.map((entry) => entry.teamId),
    ),
    resolveOrgUnitAudiencePersonIds(
      tenantId,
      snapshot.orgUnits.map((entry) => entry.orgUnitId),
    ),
    resolveRoleAudiencePersonIds(
      tenantId,
      snapshot.roles.map((entry) => entry.roleId),
    ),
    resolveTargetGroupAudiencePersonIds(
      tenantId,
      snapshot.targetGroups.map((entry) => entry.targetGroupId),
    ),
  ]);

  return dedupePersonIds([
    ...explicitPersonIds,
    ...teamPersonIds,
    ...orgUnitPersonIds,
    ...rolePersonIds,
    ...targetGroupPersonIds,
  ]);
}

export { resolveRequirementAudiencePersonIdsFromComposition } from "./requirement-audience-composition";
export {
  legacyFlatInputToRequirementAudienceComposition,
  parseRequirementAudienceCompositionJson,
} from "./requirement-audience-composition-model";
