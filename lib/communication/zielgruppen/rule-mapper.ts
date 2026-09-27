/**
 * Maps COMM-02 editor state ↔ CommunicationAudienceSpec ↔ TargetGroup.ruleJson v2.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { TargetGroupClause } from "@/lib/org/target-group-types";
import {
  buildZielgruppeRuleDocumentV2,
  parseTargetGroupRuleJson,
  type ZielgruppeRuleDocumentV2,
} from "@/lib/communication/zielgruppen/rule-document";
import {
  EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
  type ZielgruppeEditorDefinition,
} from "@/lib/communication/zielgruppen/editor-model";

function leafClausesFromStructural(input: {
  orgUnitIds: string[];
  teamIds: string[];
  roleKeys: string[];
  includePersonIds: string[];
}): TargetGroupClause[] {
  const clauses: TargetGroupClause[] = [];
  if (input.orgUnitIds.length > 0) {
    clauses.push({ type: "orgUnitIds", value: [...input.orgUnitIds] });
  }
  if (input.teamIds.length > 0) {
    clauses.push({ type: "teamIds", value: [...input.teamIds] });
  }
  if (input.roleKeys.length > 0) {
    clauses.push({ type: "roleKeys", value: [...input.roleKeys] });
  }
  if (input.includePersonIds.length > 0) {
    clauses.push({ type: "personIds", value: [...input.includePersonIds] });
  }
  return clauses;
}

export function buildResolverClauseFromEditor(input: {
  orgUnitIds: string[];
  teamIds: string[];
  roleKeys: string[];
  includePersonIds: string[];
  wholeOrganisation: boolean;
}): TargetGroupClause | null {
  if (input.wholeOrganisation) {
    // Whole-organisation resolution is deferred to COMM-03; no person-id materialisation.
    return null;
  }
  const leaves = leafClausesFromStructural(input);
  if (leaves.length === 0) return null;
  if (leaves.length === 1) return leaves[0]!;
  return { type: "union", clauses: leaves };
}

export function editorDefinitionToAudienceSpec(
  definition: ZielgruppeEditorDefinition,
  roleKeys: string[],
): CommunicationAudienceSpec {
  return {
    composition: "UNION",
    components: [
      {
        structural: {
          wholeOrganisation: definition.wholeOrganisation || undefined,
          orgUnitIds: definition.orgUnitIds.length ? [...definition.orgUnitIds] : undefined,
          teamIds: definition.teamIds.length ? [...definition.teamIds] : undefined,
          roleKeys: roleKeys.length ? [...roleKeys] : undefined,
        },
        explicit:
          definition.includePersonIds.length || definition.excludePersonIds.length
            ? {
                includePersonIds: definition.includePersonIds.length
                  ? [...definition.includePersonIds]
                  : undefined,
                excludePersonIds: definition.excludePersonIds.length
                  ? [...definition.excludePersonIds]
                  : undefined,
              }
            : undefined,
      },
    ],
  };
}

export function audienceSpecToEditorDefinition(
  audience: CommunicationAudienceSpec,
): ZielgruppeEditorDefinition {
  const component = audience.components[0];
  if (!component) return { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };

  const structural = component.structural ?? {};
  return {
    wholeOrganisation: structural.wholeOrganisation === true,
    orgUnitIds: [...(structural.orgUnitIds ?? [])],
    teamIds: [...(structural.teamIds ?? [])],
    roleIds: [...(structural.roleIds ?? [])],
    includePersonIds: [...(component.explicit?.includePersonIds ?? [])],
    excludePersonIds: [...(component.explicit?.excludePersonIds ?? [])],
  };
}

export function extractRoleKeysFromAudience(audience: CommunicationAudienceSpec): string[] {
  const structural = audience.components[0]?.structural;
  return [...(structural?.roleKeys ?? [])];
}

/** Infer editor state from legacy v1 union clause trees (best-effort). */
export function legacyClauseToEditorDefinition(clause: TargetGroupClause): ZielgruppeEditorDefinition {
  const def: ZielgruppeEditorDefinition = { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };

  function walk(node: TargetGroupClause) {
    if (node.type === "union") {
      for (const sub of node.clauses) walk(sub);
      return;
    }
    if (node.type === "intersection") {
      for (const sub of node.clauses) walk(sub);
      return;
    }
    switch (node.type) {
      case "orgUnitIds":
        def.orgUnitIds.push(...node.value);
        break;
      case "teamIds":
        def.teamIds.push(...node.value);
        break;
      case "roleKeys":
        break;
      case "personIds":
        def.includePersonIds.push(...node.value);
        break;
      default:
        break;
    }
  }

  walk(clause);
  def.orgUnitIds = [...new Set(def.orgUnitIds)];
  def.teamIds = [...new Set(def.teamIds)];
  def.roleIds = [...new Set(def.roleIds)];
  def.includePersonIds = [...new Set(def.includePersonIds)];
  return def;
}

export function ruleJsonToEditorDefinition(ruleJson: unknown): ZielgruppeEditorDefinition {
  const parsed = parseTargetGroupRuleJson(ruleJson);
  if (parsed.audience) {
    return audienceSpecToEditorDefinition(parsed.audience);
  }
  if (parsed.resolverClause) {
    return legacyClauseToEditorDefinition(parsed.resolverClause);
  }
  return { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
}

export function buildRuleJsonFromEditor(input: {
  definition: ZielgruppeEditorDefinition;
  roleKeys: string[];
}): ZielgruppeRuleDocumentV2 {
  const audience = editorDefinitionToAudienceSpec(input.definition, input.roleKeys);
  const resolverClause = buildResolverClauseFromEditor({
    wholeOrganisation: input.definition.wholeOrganisation,
    orgUnitIds: input.definition.orgUnitIds,
    teamIds: input.definition.teamIds,
    roleKeys: input.roleKeys,
    includePersonIds: input.definition.includePersonIds,
  });
  return buildZielgruppeRuleDocumentV2({ audience, resolverClause });
}
