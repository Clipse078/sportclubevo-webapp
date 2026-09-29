/**
 * Client-safe Requirement audience composition model (no DB resolvers).
 */

import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import type { RequirementDraftAudienceInput } from "./types";

export const REQUIREMENT_AUDIENCE_COMPOSITION_VERSION = 1 as const;

export type RequirementAudienceTermType = Extract<
  SceSelectorSourceType,
  "PERSON" | "TEAM" | "ORG_UNIT" | "ROLE" | "TARGET_GROUP"
>;

export type RequirementAudienceTerm = {
  type: RequirementAudienceTermType;
  id: string;
};

export type RequirementAudienceConnector = "AND" | "OR";

export type RequirementAudienceCondition = {
  connector?: RequirementAudienceConnector;
  term: RequirementAudienceTerm;
};

export type RequirementAudienceComposition = {
  version: typeof REQUIREMENT_AUDIENCE_COMPOSITION_VERSION;
  conditions: RequirementAudienceCondition[];
  excludePersonIds: string[];
};

export type RequirementAudienceCompositionSegment = {
  terms: RequirementAudienceTerm[];
};

function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function requirementAudienceCompositionIsEmpty(
  composition: RequirementAudienceComposition | null | undefined,
): boolean {
  if (!composition) return true;
  return composition.conditions.length === 0 && composition.excludePersonIds.length === 0;
}

export function segmentsFromRequirementAudienceComposition(
  composition: RequirementAudienceComposition,
): RequirementAudienceCompositionSegment[] {
  const segments: RequirementAudienceCompositionSegment[] = [];
  let current: RequirementAudienceTerm[] = [];

  for (let i = 0; i < composition.conditions.length; i++) {
    const row = composition.conditions[i]!;
    const connector = i === 0 ? undefined : row.connector ?? "OR";

    if (i === 0 || connector === "OR") {
      if (current.length > 0) {
        segments.push({ terms: current });
      }
      current = [row.term];
    } else {
      current.push(row.term);
    }
  }

  if (current.length > 0) {
    segments.push({ terms: current });
  }

  return segments;
}

export function legacyFlatInputToRequirementAudienceComposition(
  input: RequirementDraftAudienceInput,
): RequirementAudienceComposition {
  const conditions: RequirementAudienceCondition[] = [];
  const pushTerm = (type: RequirementAudienceTermType, id: string) => {
    conditions.push({
      connector: conditions.length === 0 ? undefined : "OR",
      term: { type, id },
    });
  };

  for (const personId of dedupeIds(input.personIds ?? [])) {
    pushTerm("PERSON", personId);
  }
  for (const teamId of dedupeIds(input.teamIds ?? [])) {
    pushTerm("TEAM", teamId);
  }
  for (const orgUnitId of dedupeIds(input.orgUnitIds ?? [])) {
    pushTerm("ORG_UNIT", orgUnitId);
  }
  for (const roleId of dedupeIds(input.roleIds ?? [])) {
    pushTerm("ROLE", roleId);
  }
  for (const targetGroupId of dedupeIds(input.targetGroupIds ?? [])) {
    pushTerm("TARGET_GROUP", targetGroupId);
  }

  return {
    version: REQUIREMENT_AUDIENCE_COMPOSITION_VERSION,
    conditions,
    excludePersonIds: dedupeIds(input.excludePersonIds ?? []),
  };
}

export function flattenRequirementAudienceCompositionToLegacyInput(
  composition: RequirementAudienceComposition,
): RequirementDraftAudienceInput {
  const personIds: string[] = [];
  const teamIds: string[] = [];
  const orgUnitIds: string[] = [];
  const roleIds: string[] = [];
  const targetGroupIds: string[] = [];

  for (const row of composition.conditions) {
    const { type, id } = row.term;
    if (type === "PERSON") personIds.push(id);
    if (type === "TEAM") teamIds.push(id);
    if (type === "ORG_UNIT") orgUnitIds.push(id);
    if (type === "ROLE") roleIds.push(id);
    if (type === "TARGET_GROUP") targetGroupIds.push(id);
  }

  return {
    personIds: dedupeIds(personIds),
    teamIds: dedupeIds(teamIds),
    orgUnitIds: dedupeIds(orgUnitIds),
    roleIds: dedupeIds(roleIds),
    targetGroupIds: dedupeIds(targetGroupIds),
    excludePersonIds: dedupeIds(composition.excludePersonIds),
  };
}

export function parseRequirementAudienceCompositionJson(
  value: unknown,
): RequirementAudienceComposition | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== REQUIREMENT_AUDIENCE_COMPOSITION_VERSION) return null;
  if (!Array.isArray(record.conditions)) return null;

  const conditions: RequirementAudienceCondition[] = [];
  for (const raw of record.conditions) {
    if (typeof raw !== "object" || raw == null) return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.term !== "object" || row.term == null) return null;
    const term = row.term as Record<string, unknown>;
    if (typeof term.id !== "string" || typeof term.type !== "string") return null;
    if (
      term.type !== "PERSON" &&
      term.type !== "TEAM" &&
      term.type !== "ORG_UNIT" &&
      term.type !== "ROLE" &&
      term.type !== "TARGET_GROUP"
    ) {
      return null;
    }
    const connector = row.connector;
    if (connector !== undefined && connector !== "AND" && connector !== "OR") {
      return null;
    }
    conditions.push({
      connector: connector as RequirementAudienceConnector | undefined,
      term: { type: term.type, id: term.id },
    });
  }

  const excludeRaw = record.excludePersonIds;
  const excludePersonIds = Array.isArray(excludeRaw)
    ? dedupeIds(excludeRaw.filter((id): id is string => typeof id === "string"))
    : [];

  return {
    version: REQUIREMENT_AUDIENCE_COMPOSITION_VERSION,
    conditions,
    excludePersonIds,
  };
}
