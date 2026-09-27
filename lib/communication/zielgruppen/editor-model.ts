/**
 * SCE-COMM-02 — editor-facing Zielgruppe definition (no TargetGroupClause in UI).
 *
 * COMM-02 semantics: structural selectors and explicit includes combine as UNION
 * (logical OR). Explicit excludes apply after union (COMM-01 explicit semantics).
 */

export type ZielgruppeCompositionMode = "UNION" | "INTERSECTION";

export type ZielgruppeEditorDefinition = {
  /** How structural criteria combine: ODER (union) vs UND (intersection). */
  compositionMode: ZielgruppeCompositionMode;
  wholeOrganisation: boolean;
  orgUnitIds: string[];
  teamIds: string[];
  /** Tenant Role.id values — persisted as roleKeys in ruleJson. */
  roleIds: string[];
  includePersonIds: string[];
  excludePersonIds: string[];
  /** Structural NOT semantics — subtract matching persons after inclusion. */
  excludeOrgUnitIds: string[];
  excludeTeamIds: string[];
  excludeRoleIds: string[];
};

export const EMPTY_ZIELGRUPPE_EDITOR_DEFINITION: ZielgruppeEditorDefinition = {
  compositionMode: "UNION",
  wholeOrganisation: false,
  orgUnitIds: [],
  teamIds: [],
  roleIds: [],
  includePersonIds: [],
  excludePersonIds: [],
  excludeOrgUnitIds: [],
  excludeTeamIds: [],
  excludeRoleIds: [],
};

export function zielgruppeDefinitionIsEmpty(definition: ZielgruppeEditorDefinition): boolean {
  if (definition.wholeOrganisation) return false;
  return (
    definition.orgUnitIds.length === 0 &&
    definition.teamIds.length === 0 &&
    definition.roleIds.length === 0 &&
    definition.includePersonIds.length === 0
  );
}
