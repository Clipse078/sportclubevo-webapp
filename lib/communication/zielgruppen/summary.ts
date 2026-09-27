/**
 * Human-readable structural summaries for Zielgruppen lists (not recipient counts).
 */

import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { zielgruppeDefinitionIsEmpty } from "@/lib/communication/zielgruppen/editor-model";

export type ZielgruppeDefinitionSummary = {
  headline: string;
  parts: string[];
};

export function summarizeZielgruppeDefinition(
  definition: ZielgruppeEditorDefinition,
  labels?: {
    orgUnits?: Record<string, string>;
    teams?: Record<string, string>;
    roles?: Record<string, string>;
    persons?: Record<string, string>;
  },
): ZielgruppeDefinitionSummary {
  if (definition.wholeOrganisation) {
    return {
      headline: "Ganze Organisation",
      parts: ["Strukturell: gesamter Verein"],
    };
  }

  const parts: string[] = [];
  if (definition.orgUnitIds.length > 0) {
    parts.push(
      `${definition.orgUnitIds.length} Organisationseinheit${definition.orgUnitIds.length === 1 ? "" : "en"}`,
    );
  }
  if (definition.teamIds.length > 0) {
    parts.push(`${definition.teamIds.length} Team${definition.teamIds.length === 1 ? "" : "s"}`);
  }
  if (definition.roleIds.length > 0) {
    parts.push(`${definition.roleIds.length} Rolle${definition.roleIds.length === 1 ? "" : "n"}`);
  }
  if (definition.includePersonIds.length > 0) {
    parts.push(
      `${definition.includePersonIds.length} Person${definition.includePersonIds.length === 1 ? "" : "en"} explizit`,
    );
  }
  if (definition.excludePersonIds.length > 0) {
    parts.push(
      `${definition.excludePersonIds.length} Ausschluss${definition.excludePersonIds.length === 1 ? "" : "e"}`,
    );
  }

  if (parts.length === 0 && zielgruppeDefinitionIsEmpty(definition)) {
    return { headline: "Noch keine Zieldefinition", parts: [] };
  }

  const named: string[] = [];
  for (const id of definition.orgUnitIds.slice(0, 2)) {
    const label = labels?.orgUnits?.[id];
    if (label) named.push(label);
  }
  for (const id of definition.teamIds.slice(0, 2)) {
    const label = labels?.teams?.[id];
    if (label) named.push(label);
  }

  const headline =
    named.length > 0
      ? named.join(" · ")
      : parts[0] ?? "Zieldefinition";

  return { headline, parts };
}
