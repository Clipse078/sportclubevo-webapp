/**
 * SPIELE-UX-01 — deep links from Spiele management into Wochenplaner.
 */

import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { resolveTrainingWeekWindow, TRAINING_DEFAULT_TIMEZONE } from "@/lib/training/date-range";

function formatDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildSpieleManagementWochenplanerHref(input?: {
  timezone?: string;
  now?: Date;
}): string {
  const timezone = input?.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: null,
    now: input?.now,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "spiele",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  return buildPlanningHubHref(state);
}

export function buildMatchWochenplanerHref(input: {
  startAt: Date;
  teamId?: string | null;
  timezone?: string;
}): string {
  const timezone = input.timezone ?? TRAINING_DEFAULT_TIMEZONE;
  const day = formatDayKey(input.startAt, timezone);
  const weekWindow = resolveTrainingWeekWindow({
    weekParam: day,
    timeZone: timezone,
  });

  const state: PlanningHubUrlState = {
    week: weekWindow.param,
    perspective: "kalender",
    activity: "spiele",
    team: input.teamId?.trim() || null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
    day,
  };

  return buildPlanningHubHref(state);
}
