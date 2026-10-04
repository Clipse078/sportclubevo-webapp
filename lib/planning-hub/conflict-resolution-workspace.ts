import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { formatManipulationResourceLabel } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { PlanningResourceGroup } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function reconcileSelectedConflictIncidentId(
  selectedIncidentId: string | null,
  incidents: readonly PlanningConflictIncident[],
  filteredIncidents: readonly PlanningConflictIncident[],
): string | null {
  if (selectedIncidentId && incidents.some((incident) => incident.id === selectedIncidentId)) {
    return selectedIncidentId;
  }
  if (filteredIncidents.length === 0) return null;
  const selectedIndex = selectedIncidentId
    ? incidents.findIndex((incident) => incident.id === selectedIncidentId)
    : -1;
  if (selectedIndex >= 0) {
    const next = incidents[selectedIndex] ?? filteredIncidents[0];
    if (next && filteredIncidents.some((incident) => incident.id === next.id)) {
      return next.id;
    }
  }
  return filteredIncidents[0]?.id ?? null;
}

export function buildResourceManipulationSuccessMessage(
  draft: SchedulerDraftChange,
  planningResourceGroups: readonly PlanningResourceGroup[] | undefined,
  resolveResourceRef: (resourceId: string) => WeekplannerItem["pitchAllocations"][number] | null,
): string {
  const targetId = draft.proposedResourceId;
  if (!targetId) return "Planung aktualisiert";
  const ref = resolveResourceRef(targetId);
  const fallback = ref?.name ?? targetId;
  const label = planningResourceGroups?.length
    ? formatManipulationResourceLabel(targetId, planningResourceGroups, fallback)
    : fallback;
  return `Spielfeld auf ${label} geändert.`;
}
