/**
 * SCE-COMM-02 — persisted TargetGroup.ruleJson envelope.
 *
 * v1: raw TargetGroupClause (legacy visibility / requirements).
 * v2: canonical CommunicationAudienceSpec + derived resolver clause for
 *     backward-compatible membership resolution (excludes apply at COMM-03 dispatch).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { TargetGroupClause } from "@/lib/org/target-group-types";
import { validateRuleJson } from "@/lib/org/target-group-types";

export const ZIELGRUPPE_RULE_SCHEMA_VERSION = 2 as const;

export type ZielgruppeRuleDocumentV2 = {
  schemaVersion: typeof ZIELGRUPPE_RULE_SCHEMA_VERSION;
  audience: CommunicationAudienceSpec;
  /** Union of structural + explicit includes — excludes omitted until COMM-03 resolver. */
  resolverClause: TargetGroupClause | null;
};

export type ParsedTargetGroupRule = {
  schemaVersion: 1 | 2 | null;
  audience: CommunicationAudienceSpec | null;
  resolverClause: TargetGroupClause | null;
};

export function isZielgruppeRuleDocumentV2(value: unknown): value is ZielgruppeRuleDocumentV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const doc = value as Record<string, unknown>;
  return doc.schemaVersion === ZIELGRUPPE_RULE_SCHEMA_VERSION && doc.audience != null;
}

export function parseTargetGroupRuleJson(ruleJson: unknown): ParsedTargetGroupRule {
  if (ruleJson == null) {
    return { schemaVersion: null, audience: null, resolverClause: null };
  }

  if (isZielgruppeRuleDocumentV2(ruleJson)) {
    return {
      schemaVersion: 2,
      audience: ruleJson.audience,
      resolverClause: ruleJson.resolverClause ?? null,
    };
  }

  const clauseErr = validateRuleJson(ruleJson);
  if (clauseErr === null) {
    return {
      schemaVersion: 1,
      audience: null,
      resolverClause: ruleJson as TargetGroupClause,
    };
  }

  return { schemaVersion: null, audience: null, resolverClause: null };
}

export function buildZielgruppeRuleDocumentV2(input: {
  audience: CommunicationAudienceSpec;
  resolverClause: TargetGroupClause | null;
}): ZielgruppeRuleDocumentV2 {
  return {
    schemaVersion: ZIELGRUPPE_RULE_SCHEMA_VERSION,
    audience: input.audience,
    resolverClause: input.resolverClause,
  };
}

/** Clause used by target-group-resolver (unwraps v2 envelope). */
export function extractResolverClauseFromRuleJson(ruleJson: unknown): TargetGroupClause | null {
  const parsed = parseTargetGroupRuleJson(ruleJson);
  return parsed.resolverClause;
}
