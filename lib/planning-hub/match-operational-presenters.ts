import {
  matchRequiresEndTimeAction,
  MATCH_END_TIME_ACTION_LABEL,
} from "@/lib/match/match-operational-completeness";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function weekplannerMatchRequiresEndTimeAction(item: WeekplannerItem): boolean {
  if (item.type !== "MATCH") return false;
  return matchRequiresEndTimeAction({
    startAt: item.canonicalStartAt,
    endAt: item.canonicalEndAt,
  });
}

export { MATCH_END_TIME_ACTION_LABEL };
