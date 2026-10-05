import { collectWeekplannerOccupiedResources } from "@/lib/weekplanner/conflict-detection";
import { formatConflictTimeRange } from "@/lib/weekplanner/conflict-presenters";
import type { WeekplannerConflict, WeekplannerItem } from "@/lib/weekplanner/types";

/** Operator-facing headline for aggregate inspection (no duplicate conflict engine). */
export function weekplannerConflictDoubleBookingHeadline(conflict: WeekplannerConflict): string {
  const name = conflict.facilityResourceName?.trim() || "Ressource";
  if (conflict.resourceKind === "DRESSING_ROOM") {
    return `Garderobe ${name} doppelt belegt`;
  }
  return `${name} doppelt belegt`;
}

export function weekplannerConflictPartnerTimeLabel(
  conflict: WeekplannerConflict,
  locale: string,
  timeZone: string,
): string | null {
  return formatConflictTimeRange(conflict.occupancyStartAt, conflict.occupancyEndAt, locale, timeZone);
}

/** Effective resource reservation window for one activity on a facility resource (≠ sporting activity time). */
export function weekplannerResourceOccupancyTimeLabel(
  item: WeekplannerItem,
  facilityResourceId: string,
  locale: string,
  timeZone: string,
): string | null {
  const occupied = collectWeekplannerOccupiedResources(item).find(
    (resource) => resource.facilityResourceId === facilityResourceId,
  );
  if (!occupied) return null;
  return formatConflictTimeRange(occupied.effectiveStartAt, occupied.effectiveEndAt, locale, timeZone);
}
