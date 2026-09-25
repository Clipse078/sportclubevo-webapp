import type { FacilityResourceType } from "@prisma/client";
import type {
  FacilityGroup,
  ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";

/**
 * Deterministic recommendation order for compact planning pickers:
 * 1. Free resources first
 * 2. HALF_PITCH before FULL_PITCH
 * 3. Facility group order, then name
 */
export function recommendFreeFacilityResourceIds(
  facilityGroups: FacilityGroup[],
  availability: Map<string, ResourceAvailabilityAnnotation>,
  maxCount: number,
): string[] {
  const free: Array<{ id: string; type: FacilityResourceType; order: number }> = [];
  let order = 0;

  for (const fg of facilityGroups) {
    for (const r of fg.resources) {
      const a = availability.get(r.id);
      if (a && a.status === "FREE") {
        free.push({ id: r.id, type: r.type, order: order++ });
      }
    }
  }

  free.sort((a, b) => {
    if (a.type !== b.type) {
      if (a.type === "HALF_PITCH") return -1;
      if (b.type === "HALF_PITCH") return 1;
    }
    return a.order - b.order;
  });

  return free.slice(0, maxCount).map((r) => r.id);
}
