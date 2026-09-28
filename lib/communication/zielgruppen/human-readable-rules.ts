/**
 * SCE-COMM-UX-06 — natural-language rule lines for Zielgruppe definitions.
 */

import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { zielgruppeDefinitionIsEmpty } from "@/lib/communication/zielgruppen/editor-model";

export type ZielgruppeRuleLabels = {
  orgUnits?: Record<string, string>;
  teams?: Record<string, string>;
  roles?: Record<string, string>;
  persons?: Record<string, string>;
};

export type HumanReadableZielgruppeRules = {
  compositionHint: string;
  inclusionLines: string[];
  exclusionLines: string[];
  dynamicNotice: string;
  isEmpty: boolean;
};

function labelFor(
  id: string,
  map: Record<string, string> | undefined,
  fallbackPrefix: string,
): string {
  const named = map?.[id]?.trim();
  if (named) return named;
  return `${fallbackPrefix} (unbekannt)`;
}

export function buildHumanReadableZielgruppeRules(
  definition: ZielgruppeEditorDefinition,
  labels: ZielgruppeRuleLabels = {},
): HumanReadableZielgruppeRules {
  const dynamicNotice =
    "Die Empfänger werden beim Versand anhand der aktuellen Regeln ermittelt. Gespeicherte Versände behalten ihre historische Empfängerliste.";

  if (definition.wholeOrganisation) {
    return {
      compositionHint: "Ganze Organisation",
      inclusionLines: ["Organisation ist der gesamte Verein"],
      exclusionLines: buildExclusionLines(definition, labels),
      dynamicNotice,
      isEmpty: false,
    };
  }

  const compositionHint =
    definition.compositionMode === "INTERSECTION"
      ? "Alle folgenden Bedingungen müssen zutreffen (UND)"
      : "Mindestens eine Bedingung muss zutreffen (ODER)";

  const inclusionLines: string[] = [];

  for (const id of definition.orgUnitIds) {
    inclusionLines.push(
      `Organisationseinheit ist „${labelFor(id, labels.orgUnits, "Einheit")}"`,
    );
  }
  for (const id of definition.teamIds) {
    inclusionLines.push(`Team ist „${labelFor(id, labels.teams, "Team")}"`);
  }
  for (const id of definition.roleIds) {
    inclusionLines.push(`Rolle ist „${labelFor(id, labels.roles, "Rolle")}"`);
  }
  for (const id of definition.includePersonIds) {
    inclusionLines.push(`Person ist „${labelFor(id, labels.persons, "Person")}"`);
  }

  const exclusionLines = buildExclusionLines(definition, labels);

  const isEmpty =
    zielgruppeDefinitionIsEmpty(definition) && exclusionLines.length === 0;

  return {
    compositionHint,
    inclusionLines,
    exclusionLines,
    dynamicNotice,
    isEmpty,
  };
}

function buildExclusionLines(
  definition: ZielgruppeEditorDefinition,
  labels: ZielgruppeRuleLabels,
): string[] {
  const lines: string[] = [];
  for (const id of definition.excludePersonIds) {
    lines.push(
      `Person „${labelFor(id, labels.persons, "Person")}" ist ausgeschlossen`,
    );
  }
  for (const id of definition.excludeOrgUnitIds) {
    lines.push(
      `Organisationseinheit „${labelFor(id, labels.orgUnits, "Einheit")}" ist ausgeschlossen`,
    );
  }
  for (const id of definition.excludeTeamIds) {
    lines.push(`Team „${labelFor(id, labels.teams, "Team")}" ist ausgeschlossen`);
  }
  for (const id of definition.excludeRoleIds) {
    lines.push(`Rolle „${labelFor(id, labels.roles, "Rolle")}" ist ausgeschlossen`);
  }
  return lines;
}
