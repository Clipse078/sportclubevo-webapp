/**
 * Presentation helpers for Spielplan-Einstellungen (operational timing + breaks).
 */

import { combineTournamentStartDateWithLocalTime } from "@/lib/tournaments/composer/tournament-composer-planner-breaks";
import { formatPlanungBreakScopeLabel } from "./planung-schedule-sections";
import type {
  TournamentPlanungRecommendedTiming,
  TournamentPlanungSchedulingBreak,
  TournamentPlanungSchedulingSettings,
  TournamentPlanungTimingConsequence,
} from "./types";
import type { PlanungScheduleConsistencyStatus } from "./assess-planung-schedule-consistency";

function formatLocalTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  });
}

function durationMinutesBetween(startIso: string, endIso: string): number {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return 15;
  }
  return Math.max(1, Math.round((endMs - startMs) / 60_000));
}

export function buildPlanungSchedulingBreakPresentation(params: {
  break: {
    id: string;
    label: string | null;
    startAt: string;
    endAt: string;
    scope: "ALL_PITCHES" | "SELECTED_PITCHES";
    tournamentPitchIds: readonly string[];
  };
  pitchLabelById: ReadonlyMap<string, string>;
  timezone: string;
}): TournamentPlanungSchedulingBreak {
  const label = params.break.label?.trim() || "Pause";
  const startLocalTime = formatLocalTime(params.break.startAt, params.timezone);
  const durationMinutes = durationMinutesBetween(params.break.startAt, params.break.endAt);
  const endLocalTime = formatLocalTime(params.break.endAt, params.timezone);
  const pitchLabels = params.break.tournamentPitchIds.map(
    (id) => params.pitchLabelById.get(id) ?? id,
  );

  return {
    breakId: params.break.id,
    label,
    startLocalTime,
    durationMinutes,
    scope: params.break.scope,
    tournamentPitchIds: [...params.break.tournamentPitchIds],
    timeRangeLabel: `${startLocalTime}–${endLocalTime}`,
    scopeLabel: formatPlanungBreakScopeLabel(params.break.scope, pitchLabels),
  };
}

export function buildPlanungSchedulingSettings(params: {
  schedulingConfig: {
    matchDurationMinutes: number;
    transitionMinutes: number;
  };
  fixtureHomeAwayRelevance: "ON" | "OFF";
  breaks: readonly {
    id: string;
    label: string | null;
    startAt: string;
    endAt: string;
    scope: "ALL_PITCHES" | "SELECTED_PITCHES";
    tournamentPitchIds: readonly string[];
  }[];
  pitchLabelById: ReadonlyMap<string, string>;
  timezone: string;
}): TournamentPlanungSchedulingSettings {
  return {
    matchDurationMinutes: params.schedulingConfig.matchDurationMinutes,
    transitionMinutes: params.schedulingConfig.transitionMinutes,
    fixtureHomeAwayRelevance: params.fixtureHomeAwayRelevance,
    breaks: params.breaks.map((b) =>
      buildPlanungSchedulingBreakPresentation({
        break: b,
        pitchLabelById: params.pitchLabelById,
        timezone: params.timezone,
      }),
    ),
  };
}

export function buildPlanungTimingConsequence(
  status: PlanungScheduleConsistencyStatus | null,
  options?: {
    recommendedTiming?: TournamentPlanungRecommendedTiming | null;
  },
): TournamentPlanungTimingConsequence {
  if (!status || status === "MATCHES") return null;
  const recommendedTiming = options?.recommendedTiming ?? null;
  return {
    status: "NEEDS_REGENERATION",
    headline: "Der Spielplan passt noch nicht in die verfügbare Zeit.",
    structuralHint: recommendedTiming
      ? null
      : "Du brauchst mehr Turnierzeit oder ein zusätzliches Spielfeld.",
    recommendedTiming,
  };
}

export function resolvePlanungBreakDateTimesFromDraft(params: {
  tournamentStartAtIso: string;
  startLocalTime: string;
  durationMinutes: number;
}): { startAt: Date; endAt: Date } | null {
  const combined = combineTournamentStartDateWithLocalTime(
    params.tournamentStartAtIso,
    params.startLocalTime,
  );
  if (!combined || params.durationMinutes <= 0) {
    return null;
  }
  const startMs = new Date(combined).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }
  const endMs = startMs + params.durationMinutes * 60_000;
  return { startAt: new Date(startMs), endAt: new Date(endMs) };
}
