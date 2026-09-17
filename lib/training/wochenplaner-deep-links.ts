/**
 * SCE-TRAININGS-UX-01 — deep links from Trainings management into Wochenplaner.
 */

import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";

export function buildTrainingSessionWochenplanerHref(input: {
  sessionDate: string;
  teamSeasonId?: string | null;
  timezone?: string;
  now?: Date;
}): string {
  const timezone = input.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: input.sessionDate,
    now: input.now,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "trainings",
    team: input.teamSeasonId?.trim() || null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
    day: input.sessionDate,
  };

  return buildPlanningHubHref(state);
}

export function buildTrainingSeriesWochenplanerHref(input: {
  teamSeasonId?: string | null;
  timezone?: string;
  now?: Date;
}): string {
  const timezone = input.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: null,
    now: input.now,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "trainings",
    team: input.teamSeasonId?.trim() || null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  return buildPlanningHubHref(state);
}

export function buildTrainingResourcesWochenplanerHref(input?: {
  timezone?: string;
  now?: Date;
}): string {
  const timezone = input?.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: null,
    now: input?.now,
    timeZone: timezone,
  });

  return buildPlanningHubHref({
    week: weekWindow.param,
    perspective: "ressourcen",
    activity: "trainings",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  });
}
