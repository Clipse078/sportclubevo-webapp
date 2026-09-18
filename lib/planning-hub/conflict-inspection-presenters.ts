import { formatConflictTimeRange } from "@/lib/weekplanner/conflict-presenters";
import type { WeekplannerConflict } from "@/lib/weekplanner/types";

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
