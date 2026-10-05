/**
 * SCE-PLANNER-UX-08-05R7 — conflict workspace list presentation (UX only).
 * Uses canonical incident.resourceKind + week item allocation refs — no conflict engine changes.
 */

import type { PlanningConflictIncident, PlanningResourceKind } from "@/lib/planning-hub/conflict-attention";
import { countConflictsByKind } from "@/lib/planning-hub/conflict-attention";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import { collectWeekplannerOccupiedResources } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

export function planningConflictResourceCategoryLabel(kind: PlanningResourceKind): string {
  return kind === "DRESSING_ROOM" ? "Garderobe" : "Spielfeld";
}

/** Normalizes half-pitch names to planner copy: `Kunstrasen 2 B` → `Kunstrasen 2 · B`. */
export function compactPitchPlanningResourceLabel(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return trimmed;
  if (/\s+[AB]$/.test(trimmed)) {
    const splitAt = trimmed.lastIndexOf(" ");
    return `${trimmed.slice(0, splitAt)} · ${trimmed.slice(splitAt + 1)}`;
  }
  return trimmed;
}

function formatPitchResourceLabel(
  ref: WeekplannerResourceRef | null,
  fallbackName: string,
): string {
  const name = (ref?.name ?? fallbackName).trim() || fallbackName.trim();
  if (/\s+[AB]$/.test(name)) {
    return compactPitchPlanningResourceLabel(name);
  }
  if (ref?.resourceType === "HALF_PITCH") {
    const facility = ref.facilityName.trim();
    const segment = name.length <= 2 ? name : name;
    if (facility && segment && facility !== name) {
      return `${facility} · ${segment}`;
    }
  }
  return name || fallbackName.trim();
}

function formatDressingResourceLabel(
  ref: WeekplannerResourceRef | null,
  fallbackName: string,
): string {
  return (ref?.name ?? fallbackName).trim() || fallbackName.trim();
}

export function findConflictIncidentResourceRef(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): WeekplannerResourceRef | null {
  for (const id of incident.itemIds) {
    const item = itemsById.get(id);
    if (!item) continue;
    const occupied = collectWeekplannerOccupiedResources(item).find(
      (resource) =>
        resource.facilityResourceId === incident.facilityResourceId &&
        resource.resourceKind === incident.resourceKind,
    );
    if (occupied) return occupied;
  }
  return null;
}

/** Canonical resource fragment without category prefix (e.g. `E1`, `Kunstrasen 2 · B`). */
export function conflictIncidentCanonicalResourceLabel(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string {
  const ref = findConflictIncidentResourceRef(incident, itemsById);
  if (incident.resourceKind === "DRESSING_ROOM") {
    return formatDressingResourceLabel(ref, incident.facilityResourceName);
  }
  return formatPitchResourceLabel(ref, incident.facilityResourceName);
}

/** Primary list row headline: `Garderobe E1`, `Spielfeld Kunstrasen 2 · B`. */
export function conflictIncidentListPrimaryLabel(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string {
  const category = planningConflictResourceCategoryLabel(incident.resourceKind);
  const resource = conflictIncidentCanonicalResourceLabel(incident, itemsById);
  return `${category} ${resource}`;
}

export function conflictIncidentActivityScanLine(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string {
  return incident.itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is WeekplannerItem => !!item)
    .map((item) => schedulerDisplayIdentity(item))
    .join(" / ");
}

export function conflictIncidentSearchHaystack(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string {
  const primary = conflictIncidentListPrimaryLabel(incident, itemsById);
  const resource = conflictIncidentCanonicalResourceLabel(incident, itemsById);
  const category = planningConflictResourceCategoryLabel(incident.resourceKind);
  const activities = conflictIncidentActivityScanLine(incident, itemsById);
  return [
    primary,
    category,
    resource,
    incident.facilityResourceName,
    compactPitchPlanningResourceLabel(incident.facilityResourceName),
    activities,
    ...incident.itemIds.map((id) => {
      const item = itemsById.get(id);
      return item ? `${item.title} ${item.teamNames.join(" ")}` : id;
    }),
  ]
    .join(" ")
    .toLocaleLowerCase("de-CH");
}

export type ConflictResolutionFilterOption = {
  kind: "all" | "PITCH_HALL" | "DRESSING_ROOM";
  label: string;
};

export function buildConflictResolutionFilterOptions(
  incidents: readonly PlanningConflictIncident[],
): ConflictResolutionFilterOption[] {
  const { pitch, dressing } = countConflictsByKind([...incidents]);
  const total = incidents.length;
  const options: ConflictResolutionFilterOption[] = [
    { kind: "all", label: `Alle Konflikte (${total})` },
  ];
  if (pitch > 0) {
    options.push({ kind: "PITCH_HALL", label: `Spielfelder (${pitch})` });
  }
  if (dressing > 0) {
    options.push({ kind: "DRESSING_ROOM", label: `Garderoben (${dressing})` });
  }
  return options;
}
