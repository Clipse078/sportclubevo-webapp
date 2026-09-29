/**
 * Server-side Requirement audience composition resolution (structural rules → Person ids).
 */

import {
  legacyFlatInputToRequirementAudienceComposition,
  parseRequirementAudienceCompositionJson,
  requirementAudienceCompositionIsEmpty,
  segmentsFromRequirementAudienceComposition,
  type RequirementAudienceComposition,
  type RequirementAudienceCompositionSegment,
  type RequirementAudienceTerm,
} from "./requirement-audience-composition-model";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "./requirement-audience-resolvers";
import type { RequirementDraftAudienceInput } from "./types";

export * from "./requirement-audience-composition-model";

function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function intersectSets(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const id of a) {
    if (b.has(id)) out.add(id);
  }
  return out;
}

function unionSets(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a, ...b]);
}

async function resolveTermToPersonIds(
  tenantId: string,
  term: RequirementAudienceTerm,
): Promise<string[]> {
  switch (term.type) {
    case "PERSON":
      return [term.id];
    case "TEAM":
      return resolveTeamAudiencePersonIds(tenantId, [term.id]);
    case "ORG_UNIT":
      return resolveOrgUnitAudiencePersonIds(tenantId, [term.id]);
    case "ROLE":
      return resolveRoleAudiencePersonIds(tenantId, [term.id]);
    case "TARGET_GROUP":
      return resolveTargetGroupAudiencePersonIds(tenantId, [term.id]);
    default:
      return [];
  }
}

async function resolveSegmentPersonIds(
  tenantId: string,
  segment: RequirementAudienceCompositionSegment,
): Promise<Set<string>> {
  if (segment.terms.length === 0) return new Set();

  let acc: Set<string> | null = null;
  for (const term of segment.terms) {
    const ids = await resolveTermToPersonIds(tenantId, term);
    const set = new Set(ids);
    acc = acc === null ? set : intersectSets(acc, set);
  }
  return acc ?? new Set();
}

export async function resolveRequirementAudiencePersonIdsFromComposition(
  tenantId: string,
  composition: RequirementAudienceComposition,
): Promise<string[]> {
  const segments = segmentsFromRequirementAudienceComposition(composition);
  let union: Set<string> = new Set();

  for (const segment of segments) {
    const segmentSet = await resolveSegmentPersonIds(tenantId, segment);
    union = unionSets(union, segmentSet);
  }

  const excludes = new Set(dedupeIds(composition.excludePersonIds));
  const result: string[] = [];
  for (const id of union) {
    if (!excludes.has(id)) result.push(id);
  }
  return dedupeIds(result);
}

export async function resolveRequirementAudiencePersonIdsFromDraftInput(
  tenantId: string,
  input: RequirementDraftAudienceInput,
  compositionJson?: unknown,
): Promise<string[]> {
  const parsed = parseRequirementAudienceCompositionJson(compositionJson);
  if (parsed && !requirementAudienceCompositionIsEmpty(parsed)) {
    return resolveRequirementAudiencePersonIdsFromComposition(tenantId, parsed);
  }
  return resolveRequirementAudiencePersonIdsFromComposition(
    tenantId,
    legacyFlatInputToRequirementAudienceComposition(input),
  );
}
