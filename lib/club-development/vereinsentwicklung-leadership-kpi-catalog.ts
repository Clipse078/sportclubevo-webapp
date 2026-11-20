/**
 * Vereinsentwicklung Übersicht — explainable KPI definitions (SCE).
 * Sources align with destination UIs unless noted.
 */

export type VereinsentwicklungLeadershipKpiId =
  | "mitgliederbestand"
  | "eintritte"
  | "austritte"
  | "umsetzung_tasks"
  | "ziel_delivery";

export type VereinsentwicklungLeadershipKpiDefinition = {
  id: VereinsentwicklungLeadershipKpiId;
  label: string;
  source: string;
  countingUnit: string;
  includedStatuses: string;
  timeBoundary: string;
  scope: string;
  permissionRule: string;
  drillDownDestination: string;
  /** When dashboard scope differs from drill-down list. */
  scopeNote?: string;
};

export const SCE_VEREINSENTWICKLUNG_LEADERSHIP_KPIS: VereinsentwicklungLeadershipKpiDefinition[] = [
  {
    id: "mitgliederbestand",
    label: "Mitgliederbestand",
    source: "PersonMembership (Person-UX-04, kanonisch wie Person → Mitgliedschaft)",
    countingUnit: "Distinct personId (ein Mitglied pro Person, keine Doppelzählung bei parallelen Records)",
    includedStatuses: "PersonMembershipStatus.ACTIVE",
    timeBoundary: "Stand: letzte Aktualisierung aktiver Mitgliedschaften oder Stichtag heute",
    scope: "Vereinsweit oder Org-Einheit über ACTIVE PersonAssignment + ACTIVE Mitgliedschaft",
    permissionRule: "people.view — ohne Berechtigung wird der Block nicht befüllt",
    drillDownDestination: "/dashboard/personen",
    scopeNote:
      "Org-Einheit nur wenn ACTIVE PersonAssignment zur gewählten Einheit; sonst Vereinsweit (explizit beschriftet).",
  },
  {
    id: "eintritte",
    label: "Eintritte",
    source: "PersonMembership.startsAt",
    countingUnit: "Mitgliedschafts-Records mit startsAt im Vergleichszeitraum",
    includedStatuses: "Alle Status (Eintritt = Beginn der Mitgliedschaft)",
    timeBoundary: "Rollierendes 12-Monats-Fenster vs. vorheriges 12-Monats-Fenster",
    scope: "Gleiche Org-/Vereins-Scope-Regel wie Mitgliederbestand",
    permissionRule: "people.view",
    drillDownDestination: "/dashboard/personen",
  },
  {
    id: "austritte",
    label: "Austritte",
    source: "PersonMembership.endsAt (status ENDED oder endsAt gesetzt)",
    countingUnit: "Mitgliedschafts-Records mit endsAt im Vergleichszeitraum",
    includedStatuses: "ENDED oder endsAt nicht null",
    timeBoundary: "Rollierendes 12-Monats-Fenster vs. vorheriges 12-Monats-Fenster",
    scope: "Gleiche Org-/Vereins-Scope-Regel wie Mitgliederbestand",
    permissionRule: "people.view",
    drillDownDestination: "/dashboard/personen",
  },
  {
    id: "umsetzung_tasks",
    label: "Umsetzung (Aufgaben)",
    source: "vereinsentwicklung-workspace-progress (eligible task leaves, deduped by Task ID)",
    countingUnit: "Eligible leaf tasks across sichtbare aktive Ziele",
    includedStatuses: "Task statuses eligible per task-hierarchy-progress (DONE = erledigt)",
    timeBoundary: "Aktueller Rollup zum Ladezeitpunkt",
    scope: "Org-Einheit: Ziele mit visibleOrgUnitRefs passend zur Filter-Einheit",
    permissionRule: "tasks.view / tasks.manage via buildTaskReadWhere",
    drillDownDestination: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=aufgaben",
    scopeNote: "Dashboard-Aufgabenmenge entspricht dem Rollup der gelisteten Ziel-IDs.",
  },
  {
    id: "ziel_delivery",
    label: "Umsetzung pro Ziel",
    source: "computeTargetDeliveryProgress",
    countingUnit: "Pro Ziel: x von y Aufgaben erledigt",
    includedStatuses: "Wie umsetzung_tasks",
    timeBoundary: "Aktuell",
    scope: "Sichtbare aktive Ziele (ggf. Org-Filter)",
    permissionRule: "targets.view + task read scope",
    drillDownDestination: "/vereinsleitung/targets/[id]",
  },
];

export function getLeadershipKpiDefinition(
  id: VereinsentwicklungLeadershipKpiId,
): VereinsentwicklungLeadershipKpiDefinition {
  const row = SCE_VEREINSENTWICKLUNG_LEADERSHIP_KPIS.find((k) => k.id === id);
  if (!row) throw new Error(`Unknown KPI ${id}`);
  return row;
}