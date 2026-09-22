/**
 * WORKSPACE-03-A1 — client-side helpers for access grant editor (canonical mutation fields).
 */

import { WorkspaceAccessSubjectType } from "@prisma/client";

import type {
  WorkspaceAccessGrantMutationFieldsDto,
  WorkspaceAccessGrantRuleDto,
} from "@/lib/workspace/access/access-management-dto";
import { audienceKey, audienceRefFromGrant } from "@/lib/workspace/access/audience";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type { WorkspaceGrantFields } from "@/lib/workspace/access/types";

export function mutationFieldsToGrantFields(
  fields: WorkspaceAccessGrantMutationFieldsDto,
): WorkspaceGrantFields {
  return {
    subjectType: fields.subjectType as WorkspaceAccessSubjectType,
    accessLevel: fields.accessLevel,
    personId: fields.personId ?? null,
    orgUnitId: fields.orgUnitId ?? null,
    teamId: fields.teamId ?? null,
    roleFunctionKey: fields.roleFunctionKey ?? null,
    roleScopeOrgUnitId: fields.roleScopeOrgUnitId ?? null,
    roleScopeTeamId: fields.roleScopeTeamId ?? null,
  };
}

export function audienceKeyFromMutationFields(
  fields: WorkspaceAccessGrantMutationFieldsDto,
): string {
  return audienceKey(audienceRefFromGrant(mutationFieldsToGrantFields(fields)));
}

export function grantRulesToMutationPayload(
  rules: readonly WorkspaceAccessGrantRuleDto[],
): WorkspaceAccessGrantMutationFieldsDto[] {
  return rules.map((rule) => ({ ...rule.mutationFields }));
}

export function grantRulesFromExplicitList(
  explicitGrants: readonly WorkspaceAccessGrantRuleDto[],
): WorkspaceAccessGrantRuleDto[] {
  return explicitGrants.map((grant) => ({
    ...grant,
    mutationFields: { ...grant.mutationFields },
  }));
}

export function upsertGrantRule(
  rules: readonly WorkspaceAccessGrantRuleDto[],
  fields: WorkspaceAccessGrantMutationFieldsDto,
  labels: { audienceLabel: string; accessLevelLabel: string; accessLevelDescription: string },
): WorkspaceAccessGrantRuleDto[] {
  const key = audienceKeyFromMutationFields(fields);
  const next = rules.filter((rule) => rule.audienceKey !== key);
  const rule: WorkspaceAccessGrantRuleDto = {
    id: `draft-${key}`,
    audienceKind: fields.subjectType,
    audienceLabel: labels.audienceLabel,
    accessLevel: fields.accessLevel,
    accessLevelLabel: labels.accessLevelLabel,
    accessLevelDescription: labels.accessLevelDescription,
    mutationFields: { ...fields },
    audienceKey: key,
  };
  return [...next, rule];
}

export function removeGrantRuleByKey(
  rules: readonly WorkspaceAccessGrantRuleDto[],
  audienceKeyValue: string,
): WorkspaceAccessGrantRuleDto[] {
  return rules.filter((rule) => rule.audienceKey !== audienceKeyValue);
}

export function updateGrantRuleLevel(
  rules: readonly WorkspaceAccessGrantRuleDto[],
  audienceKeyValue: string,
  accessLevel: CanonicalResourceLevel,
  labels: { accessLevelLabel: string; accessLevelDescription: string },
): WorkspaceAccessGrantRuleDto[] {
  return rules.map((rule) => {
    if (rule.audienceKey !== audienceKeyValue) {
      return rule;
    }
    return {
      ...rule,
      accessLevel,
      accessLevelLabel: labels.accessLevelLabel,
      accessLevelDescription: labels.accessLevelDescription,
      mutationFields: { ...rule.mutationFields, accessLevel },
    };
  });
}

export type WorkspaceAudienceSearchResult = {
  type: WorkspaceAccessGrantMutationFieldsDto["subjectType"];
  id: string;
  label: string;
  functionKey?: string;
};

export function buildMutationFieldsFromAudienceSelection(input: {
  audienceType: WorkspaceAccessGrantMutationFieldsDto["subjectType"];
  selection: WorkspaceAudienceSearchResult | null;
  accessLevel: CanonicalResourceLevel;
  roleScopeOrgUnitId?: string | null;
  roleScopeTeamId?: string | null;
}): WorkspaceAccessGrantMutationFieldsDto | null {
  const { audienceType, selection, accessLevel } = input;
  if (audienceType === "ORGANISATION") {
    return { subjectType: "ORGANISATION", accessLevel };
  }
  if (!selection) {
    return null;
  }
  switch (audienceType) {
    case "ORG_UNIT":
      return {
        subjectType: "ORG_UNIT",
        accessLevel,
        orgUnitId: selection.id,
      };
    case "TEAM":
      return {
        subjectType: "TEAM",
        accessLevel,
        teamId: selection.id,
      };
    case "PERSON":
      return {
        subjectType: "PERSON",
        accessLevel,
        personId: selection.id,
      };
    case "ROLE":
      return {
        subjectType: "ROLE",
        accessLevel,
        roleFunctionKey: selection.functionKey ?? selection.id,
        roleScopeOrgUnitId: input.roleScopeOrgUnitId ?? null,
        roleScopeTeamId: input.roleScopeTeamId ?? null,
      };
    default:
      return null;
  }
}
