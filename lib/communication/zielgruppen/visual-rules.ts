/**
 * SCE-COMM-EVO-05 — visual rule rows mapped to ZielgruppeEditorDefinition (canonical backend unchanged).
 */

import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";

export type ZielgruppeIncludeRuleKind = "orgUnit" | "team" | "role" | "person";

export type ZielgruppeExcludeRuleKind = "excludeOrgUnit" | "excludeTeam" | "excludeRole" | "excludePerson";

export type ZielgruppeVisualIncludeRule = {
  id: string;
  kind: ZielgruppeIncludeRuleKind;
  valueId: string;
};

export type ZielgruppeVisualExcludeRule = {
  id: string;
  kind: ZielgruppeExcludeRuleKind;
  valueId: string;
};

export const ZIELGRUPPE_INCLUDE_KIND_LABEL: Record<ZielgruppeIncludeRuleKind, string> = {
  orgUnit: "Organisationseinheit",
  team: "Team",
  role: "Rolle",
  person: "Person",
};

export const ZIELGRUPPE_EXCLUDE_KIND_LABEL: Record<ZielgruppeExcludeRuleKind, string> = {
  excludeOrgUnit: "Organisationseinheit",
  excludeTeam: "Team",
  excludeRole: "Rolle",
  excludePerson: "Person",
};

function stableRuleId(kind: string, valueId: string): string {
  return `${kind}:${valueId}`;
}

const INCLUDE_FIELD: Record<
  ZielgruppeIncludeRuleKind,
  "orgUnitIds" | "teamIds" | "roleIds" | "includePersonIds"
> = {
  orgUnit: "orgUnitIds",
  team: "teamIds",
  role: "roleIds",
  person: "includePersonIds",
};

const EXCLUDE_FIELD: Record<
  ZielgruppeExcludeRuleKind,
  "excludeOrgUnitIds" | "excludeTeamIds" | "excludeRoleIds" | "excludePersonIds"
> = {
  excludeOrgUnit: "excludeOrgUnitIds",
  excludeTeam: "excludeTeamIds",
  excludeRole: "excludeRoleIds",
  excludePerson: "excludePersonIds",
};

export function definitionToVisualRules(definition: ZielgruppeEditorDefinition): {
  includeRules: ZielgruppeVisualIncludeRule[];
  excludeRules: ZielgruppeVisualExcludeRule[];
} {
  const includeRules: ZielgruppeVisualIncludeRule[] = [];
  for (const valueId of definition.orgUnitIds) {
    includeRules.push({ id: stableRuleId("orgUnit", valueId), kind: "orgUnit", valueId });
  }
  for (const valueId of definition.teamIds) {
    includeRules.push({ id: stableRuleId("team", valueId), kind: "team", valueId });
  }
  for (const valueId of definition.roleIds) {
    includeRules.push({ id: stableRuleId("role", valueId), kind: "role", valueId });
  }
  for (const valueId of definition.includePersonIds) {
    includeRules.push({ id: stableRuleId("person", valueId), kind: "person", valueId });
  }

  const excludeRules: ZielgruppeVisualExcludeRule[] = [];
  for (const valueId of definition.excludeOrgUnitIds) {
    excludeRules.push({
      id: stableRuleId("excludeOrgUnit", valueId),
      kind: "excludeOrgUnit",
      valueId,
    });
  }
  for (const valueId of definition.excludeTeamIds) {
    excludeRules.push({ id: stableRuleId("excludeTeam", valueId), kind: "excludeTeam", valueId });
  }
  for (const valueId of definition.excludeRoleIds) {
    excludeRules.push({ id: stableRuleId("excludeRole", valueId), kind: "excludeRole", valueId });
  }
  for (const valueId of definition.excludePersonIds) {
    excludeRules.push({
      id: stableRuleId("excludePerson", valueId),
      kind: "excludePerson",
      valueId,
    });
  }

  return { includeRules, excludeRules };
}

export function addIncludeRule(
  definition: ZielgruppeEditorDefinition,
  kind: ZielgruppeIncludeRuleKind,
  valueId: string,
): ZielgruppeEditorDefinition {
  const field = INCLUDE_FIELD[kind];
  if (definition[field].includes(valueId)) return definition;
  return { ...definition, [field]: [...definition[field], valueId] };
}

export function removeIncludeRule(
  definition: ZielgruppeEditorDefinition,
  kind: ZielgruppeIncludeRuleKind,
  valueId: string,
): ZielgruppeEditorDefinition {
  const field = INCLUDE_FIELD[kind];
  return { ...definition, [field]: definition[field].filter((id) => id !== valueId) };
}

export function addExcludeRule(
  definition: ZielgruppeEditorDefinition,
  kind: ZielgruppeExcludeRuleKind,
  valueId: string,
): ZielgruppeEditorDefinition {
  const field = EXCLUDE_FIELD[kind];
  if (definition[field].includes(valueId)) return definition;
  return { ...definition, [field]: [...definition[field], valueId] };
}

export function removeExcludeRule(
  definition: ZielgruppeEditorDefinition,
  kind: ZielgruppeExcludeRuleKind,
  valueId: string,
): ZielgruppeEditorDefinition {
  const field = EXCLUDE_FIELD[kind];
  return { ...definition, [field]: definition[field].filter((id) => id !== valueId) };
}

export function compositionModeLabel(mode: ZielgruppeEditorDefinition["compositionMode"]): string {
  return mode === "INTERSECTION" ? "Alle Bedingungen" : "Mindestens eine Bedingung";
}

export function compositionModeHelp(mode: ZielgruppeEditorDefinition["compositionMode"]): string {
  return mode === "INTERSECTION"
    ? "Eine Person muss jede Bedingung erfüllen."
    : "Eine Person muss mindestens eine Bedingung erfüllen.";
}
