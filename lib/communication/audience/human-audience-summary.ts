/**
 * Human-readable audience summary for composer UX (matches UNION semantics).
 */

import type { CommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";

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
