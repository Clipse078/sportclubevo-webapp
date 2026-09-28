/**
 * Human-readable audience summary for composer UX (matches UNION semantics).
 */

import type { CommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import {
  buildHumanReadableZielgruppeRules,
  type ZielgruppeRuleLabels,
} from "@/lib/communication/zielgruppen/human-readable-rules";

export type CommunicationAudienceLabelMaps = {
  orgUnits: Record<string, string>;
  teams: Record<string, string>;
  roles: Record<string, string>;
  targetGroups: Record<string, string>;
  persons: Record<string, string>;
};

export function summarizeCommunicationAudienceSelection(input: {
  selection: CommunicationAudienceSelection;
  labels: CommunicationAudienceLabelMaps;
}): string {
  const { selection, labels } = input;

  if (selection.wholeOrganisation) {
    return "Gesamter Verein.";
  }

  const fragments: string[] = [];

  for (const id of selection.orgUnitIds) {
    fragments.push(`Organisationseinheit „${labels.orgUnits[id] ?? id}"`);
  }
  for (const id of selection.teamIds) {
    fragments.push(`Team „${labels.teams[id] ?? id}"`);
  }
  for (const id of selection.roleIds) {
    fragments.push(`Rolle „${labels.roles[id] ?? id}"`);
  }
  for (const id of selection.targetGroupIds) {
    fragments.push(`Zielgruppe „${labels.targetGroups[id] ?? id}"`);
  }
  for (const id of selection.personIds) {
    fragments.push(`Person „${labels.persons[id] ?? id}"`);
  }

  if (fragments.length === 0) {
    return "Keine Empfänger ausgewählt.";
  }

  if (fragments.length === 1) {
    return `Empfänger: ${fragments[0]}.`;
  }

  return `Empfänger: ${fragments.slice(0, -1).join(", ")} oder ${fragments[fragments.length - 1]}.`;
}

/** Live Zielgruppe builder / list summary (EVO-05 — single source with human-readable-rules). */
export function summarizeZielgruppeEditorDefinition(
  definition: ZielgruppeEditorDefinition,
  labels: ZielgruppeRuleLabels = {},
): string {
  const rules = buildHumanReadableZielgruppeRules(definition, labels);
  if (rules.isEmpty) {
    return "Noch keine Zieldefinition.";
  }

  if (definition.wholeOrganisation && rules.exclusionLines.length === 0) {
    return "Alle Personen in der gesamten Organisation.";
  }

  const joiner =
    definition.compositionMode === "INTERSECTION" && !definition.wholeOrganisation ? " und " : " oder ";

  const inclusion = rules.inclusionLines.join(joiner);
  if (!inclusion && rules.exclusionLines.length === 0) {
    return "Noch keine Zieldefinition.";
  }

  if (rules.exclusionLines.length === 0) {
    return inclusion.endsWith(".") ? inclusion : `${inclusion}.`;
  }

  const excl = rules.exclusionLines
    .map((line) => line.replace(/ ist ausgeschlossen$/, ""))
    .join(", ");

  if (!inclusion) {
    return `Ausgeschlossen: ${excl}.`;
  }

  return `${inclusion}, ausser ${excl}.`;
}
