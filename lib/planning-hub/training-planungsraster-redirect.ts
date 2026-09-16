/**
 * PLANNING-HUB-01A — legacy TrainingCenter Planungsraster deep links →
 * Wochenplaner Ressourcen (cross-domain operational view).
 */

import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";
import { buildPlanningHubHref, type PlanningHubUrlState } from "./planner-url";

export type LegacyTrainingPlanungsrasterParams = {
  day?: string | null;
  week?: string | null;
  facility?: string | null;
  team?: string | null;
  /** Legacy query: conflicts=1 */
  conflicts?: string | null;
  /** Legacy query: category=PITCH_HALL | DRESSING_ROOM */
  category?: string | null;
  timezone?: string;
  now?: Date;
};

export function buildWochenplanerResourcesHrefFromLegacyTrainingParams(
  params: LegacyTrainingPlanungsrasterParams,
): string {
  const timezone = params.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: params.week?.trim() || params.day?.trim() || null,
    now: params.now,
    timeZone: timezone,
  });

  const category = params.category?.trim().toUpperCase();
  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "ressourcen",
    activity: "alle",
    team: params.team?.trim() || null,
    facility: params.facility?.trim() || null,
    conflictsOnly: params.conflicts === "1",
    resourceCategory: category === "DRESSING_ROOM" ? "dressing" : "pitch",
  };

  return buildPlanningHubHref(state);
}
