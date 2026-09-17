import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

export type PlanningHubFacilityGroups = {
  PITCH_HALL: FacilityGroup[];
  DRESSING_ROOM: FacilityGroup[];
};

let inFlight: Promise<PlanningHubFacilityGroups> | null = null;

export function fetchPlanningHubFacilityGroupsClient(): Promise<PlanningHubFacilityGroups> {
  if (!inFlight) {
    inFlight = fetch("/api/planning-hub/facility-groups")
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Einrichtungen konnten nicht geladen werden.");
        }
        return res.json() as Promise<PlanningHubFacilityGroups>;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
