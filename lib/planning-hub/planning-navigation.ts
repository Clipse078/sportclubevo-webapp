/**
 * SCE-OPS-01 — canonical Planning Hub item navigation (single contract).
 */

import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

/**
 * Resolves the admin href for a weekplanner item using canonical source IDs
 * (eventId / trainingSessionId), never synthetic planner-only ids.
 */
export function getPlanningHubItemHref(item: WeekplannerItem): string | null {
  switch (item.type) {
    case "TRAINING":
      return `/dashboard/training/sessions/${item.trainingSessionId}/edit`;
    case "MATCH":
      return `/dashboard/matchcenter/${item.eventId}`;
    case "TOURNAMENT":
      return `/dashboard/tournamentcenter/${item.eventId}`;
    case "VERANSTALTUNG":
      return getVeranstaltungHref(item.eventId);
    default:
      return null;
  }
}
