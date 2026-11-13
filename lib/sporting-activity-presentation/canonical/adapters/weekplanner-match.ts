import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";
import { weekplannerMatchToMatchcenterSummary } from "@/lib/planning-hub/weekplanner-match-matchcenter-bridge";
import { resolveSceMatchPresentation } from "./match";
import type { SceMatchPresentationModel } from "../types";

export function resolveSceMatchPresentationFromWeekplannerMatch(
  item: WeekplannerMatchItem,
  options?: {
    now?: Date;
    timezone?: string;
    tenantClubName?: string | null;
    tenantLogoUrl?: string | null;
  },
): SceMatchPresentationModel {
  const match = weekplannerMatchToMatchcenterSummary(item);
  const pitchLabel =
    item.pitchAllocations[0]?.name?.trim() ||
    item.canonicalPitchAllocations[0]?.name?.trim() ||
    null;

  return resolveSceMatchPresentation({
    match,
    tenantClubName: options?.tenantClubName,
    tenantLogoUrl: options?.tenantLogoUrl,
    pitchLabel,
    now: options?.now,
    timezone: options?.timezone,
  });
}
