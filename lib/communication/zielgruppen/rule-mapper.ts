/**
 * Maps COMM-02 editor state ↔ CommunicationAudienceSpec ↔ TargetGroup.ruleJson v2.
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { StructuralAudienceSelectors } from "@/lib/communication/platform/audience/structural-targets";
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

export function buildStructuralExclusionFromEditor(
  definition: ZielgruppeEditorDefinition,
  excludeRoleKeys: string[],
): StructuralAudienceSelectors | null {
  const selectors: StructuralAudienceSelectors = {
    orgUnitIds: definition.excludeOrgUnitIds.length ? [...definition.excludeOrgUnitIds] : undefined,
    teamIds: definition.excludeTeamIds.length ? [...definition.excludeTeamIds] : undefined,
    roleKeys: excludeRoleKeys.length ? [...excludeRoleKeys] : undefined,
  };
  const hasAny =
    (selectors.orgUnitIds?.length ?? 0) > 0 ||
    (selectors.teamIds?.length ?? 0) > 0 ||
    (selectors.roleKeys?.length ?? 0) > 0;
  return hasAny ? selectors : null;
}

export function buildResolverClauseFromEditor(input: {
  orgUnitIds: string[];
  teamIds: string[];
  roleKeys: string[];
  includePersonIds: string[];
  wholeOrganisation: boolean;
  compositionMode: ZielgruppeEditorDefinition["compositionMode"];
}): TargetGroupClause | null {
  if (input.wholeOrganisation) {
    return null;
  }
  const leaves = leafClausesFromStructural(input);
  if (leaves.length === 0) return null;
  if (leaves.length === 1) return leaves[0]!;
  return {
    type: input.compositionMode === "INTERSECTION" ? "intersection" : "union",
    clauses: leaves,
  };
}

export function editorDefinitionToAudienceSpec(
  definition: ZielgruppeEditorDefinition,
  roleKeys: string[],
): CommunicationAudienceSpec {
  const leaves = leafClausesFromStructural({
    orgUnitIds: definition.orgUnitIds,
    teamIds: definition.teamIds,
    roleKeys,
    includePersonIds: [],
  });

  const usesIntersection =
    definition.compositionMode === "INTERSECTION" &&
    (leaves.length > 1 || (definition.wholeOrganisation && leaves.length === 1));

  const dynamicRule: TargetGroupClause | null =
    usesIntersection && leaves.length > 0
      ? { type: "intersection", clauses: leaves }
      : null;

  const structuralOnlyUnion =
    !usesIntersection &&
    (definition.wholeOrganisation ||
      definition.orgUnitIds.length > 0 ||
      definition.teamIds.length > 0 ||
      roleKeys.length > 0);

  return {
    composition: "UNION",
    components: [
      {
        structural: structuralOnlyUnion
          ? {
              wholeOrganisation: definition.wholeOrganisation || undefined,
              orgUnitIds: !usesIntersection && definition.orgUnitIds.length ? [...definition.orgUnitIds] : undefined,
              teamIds: !usesIntersection && definition.teamIds.length ? [...definition.teamIds] : undefined,
              roleKeys: !usesIntersection && roleKeys.length ? [...roleKeys] : undefined,
            }
          : undefined,
        dynamicRule,
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
        external:
          definition.includeExternalContactIds.length ||
          definition.excludeExternalContactIds.length
            ? {
                includeExternalContactIds: definition.includeExternalContactIds.length
                  ? [...definition.includeExternalContactIds]
                  : undefined,
                excludeExternalContactIds: definition.excludeExternalContactIds.length
                  ? [...definition.excludeExternalContactIds]
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
  const def: ZielgruppeEditorDefinition = {
    compositionMode:
      component.dynamicRule?.type === "intersection" ? "INTERSECTION" : "UNION",
    wholeOrganisation: structural.wholeOrganisation === true,
    orgUnitIds: [...(structural.orgUnitIds ?? [])],
    teamIds: [...(structural.teamIds ?? [])],
    roleIds: [...(structural.roleIds ?? [])],
    includePersonIds: [...(component.explicit?.includePersonIds ?? [])],
    includeExternalContactIds: [...(component.external?.includeExternalContactIds ?? [])],
    excludePersonIds: [...(component.explicit?.excludePersonIds ?? [])],
    excludeExternalContactIds: [...(component.external?.excludeExternalContactIds ?? [])],
    excludeOrgUnitIds: [],
    excludeTeamIds: [],
    excludeRoleIds: [],
  };

  if (component.dynamicRule?.type === "intersection") {
    def.orgUnitIds = [];
    def.teamIds = [];
    def.roleIds = [];
    for (const clause of component.dynamicRule.clauses) {
      if (clause.type === "orgUnitIds") def.orgUnitIds.push(...clause.value);
      if (clause.type === "teamIds") def.teamIds.push(...clause.value);
      if (clause.type === "roleKeys") {
        /* role keys restored via management-service role id lookup */
      }
    }
  }

  return def;
}

export function extractRoleKeysFromAudience(audience: CommunicationAudienceSpec): string[] {
  const component = audience.components[0];
  const fromStructural = [...(component?.structural?.roleKeys ?? [])];
  if (fromStructural.length > 0) return fromStructural;
  if (component?.dynamicRule?.type === "intersection") {
    const keys: string[] = [];
    for (const clause of component.dynamicRule.clauses) {
      if (clause.type === "roleKeys") keys.push(...clause.value);
    }
    return keys;
  }
  return [];
}

/** Infer editor state from legacy v1 union clause trees (best-effort). */
export function legacyClauseToEditorDefinition(clause: TargetGroupClause): ZielgruppeEditorDefinition {
  const def: ZielgruppeEditorDefinition = { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };

  function walk(node: TargetGroupClause) {
    if (node.type === "union") {
      def.compositionMode = "UNION";
      for (const sub of node.clauses) walk(sub);
      return;
    }
    if (node.type === "intersection") {
      def.compositionMode = "INTERSECTION";
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
    const def = audienceSpecToEditorDefinition(parsed.audience);
    if (parsed.structuralExclusion) {
      def.excludeOrgUnitIds = [...(parsed.structuralExclusion.orgUnitIds ?? [])];
      def.excludeTeamIds = [...(parsed.structuralExclusion.teamIds ?? [])];
    }
    return def;
  }
  if (parsed.resolverClause) {
    return legacyClauseToEditorDefinition(parsed.resolverClause);
  }
  return { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
}

export function buildRuleJsonFromEditor(input: {
  definition: ZielgruppeEditorDefinition;
  roleKeys: string[];
  excludeRoleKeys?: string[];
}): ZielgruppeRuleDocumentV2 {
  const audience = editorDefinitionToAudienceSpec(input.definition, input.roleKeys);
  const resolverClause = buildResolverClauseFromEditor({
    wholeOrganisation: input.definition.wholeOrganisation,
    orgUnitIds: input.definition.orgUnitIds,
    teamIds: input.definition.teamIds,
    roleKeys: input.roleKeys,
    includePersonIds: input.definition.includePersonIds,
    compositionMode: input.definition.compositionMode,
  });
  const structuralExclusion = buildStructuralExclusionFromEditor(
    input.definition,
    input.excludeRoleKeys ?? [],
  );
  return buildZielgruppeRuleDocumentV2({ audience, resolverClause, structuralExclusion });
}
