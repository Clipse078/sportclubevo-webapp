/**
 * SCE-ACTIVITY-CREATE-01H-R4 — Wochenplaner Liste → canonical presentation models.
 */

import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { resolveSceClubEventPresentationFromWeekplannerVeranstaltung } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-veranstaltung";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import { resolveSceTournamentPresentationFromWeekplannerTournament } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-tournament";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-training";
import type { SceActivityPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { listOperationalResourceLine } from "@/lib/planning-hub/list-operational";

export type PlanningHubListePresentationContext = {
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  timezone: string;
};

export function resolvePlanningHubListePresentationModel(
  item: WeekplannerItem,
  context: PlanningHubListePresentationContext,
): SceActivityPresentationModel {
  switch (item.type) {
    case "TRAINING":
      return resolveSceTrainingPresentationFromWeekplannerTraining(item, {
        tenantClubName: context.tenantClubName,
      });
    case "MATCH":
      return resolveSceMatchPresentationFromWeekplannerMatch(item, {
        timezone: context.timezone,
      });
    case "TOURNAMENT":
      return resolveSceTournamentPresentationFromWeekplannerTournament(item, {
        tenantClubName: context.tenantClubName,
      });
    case "VERANSTALTUNG":
      return resolveSceClubEventPresentationFromWeekplannerVeranstaltung(item, {
        tenantClubName: context.tenantClubName,
        tenantLogoUrl: context.tenantLogoUrl,
      });
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

/** Canonical location line for Liste rows; falls back to operational resource codes when empty. */
export function planningHubListeLocationLine(
  item: WeekplannerItem,
  model: SceActivityPresentationModel,
): string {
  const canonical =
    "location" in model && model.location
      ? formatSceActivityLocationHierarchy(model.location, { includeHostClub: false }) ?? ""
      : "";
  const normalized = canonical.trim();
  if (normalized) {
    return normalized;
  }
  return listOperationalResourceLine(item);
}
