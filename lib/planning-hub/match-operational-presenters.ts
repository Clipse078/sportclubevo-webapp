import { isMeaningfulEventInterval } from "@/lib/facilities/resource-occupancy-window";
import { MATCH_END_TIME_ACTION_LABEL } from "@/lib/match/match-operational-completeness";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function weekplannerMatchRequiresEndTimeAction(item: WeekplannerItem): boolean {
  if (item.type !== "MATCH") return false;
  return !isMeaningfulEventInterval(item.canonicalStartAt, item.canonicalEndAt);
}

export { MATCH_END_TIME_ACTION_LABEL };
