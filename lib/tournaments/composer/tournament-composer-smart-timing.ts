/**
 * Reuses 01F1 Smart Timing Advisor for composer draft configuration (pure).
 */

import { assessTournamentTiming } from "@/lib/tournament-scheduling/smart-timing";
import type { TournamentTimingAssessment, TournamentTimingInput } from "@/lib/tournament-scheduling/smart-timing/types";
import {
  expectedRoundRobinFixtureCount,
  generateRoundRobinFixtures,
} from "@/lib/tournament-scheduling/fixtures/round-robin";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { resolveEffectiveGroupCount } from "./tournament-composer-planner-defaults";
import { resolveComposerBreakDateTimes } from "./tournament-composer-planner-breaks";

function estimateFixtureCount(payload: TournamentComposerDraftPayload): number {
  const n = payload.participants.length;
  if (n < 2 || !payload.planner) return 0;
  const planner = payload.planner;
  if (planner.competitionFormat === "KNOCKOUT_ONLY") {
    const bracketSize = 2 ** Math.ceil(Math.log2(n));
    return bracketSize - 1;
  }
  const groupCount = resolveEffectiveGroupCount(planner);
  if (groupCount <= 1) {
    if (planner.groupMixStrategy === "SMART_MIX") {
      const target = planner.smartMixTargetMatchesPerParticipant ?? 1;
      return Math.ceil((n * target) / 2);
    }
    return expectedRoundRobinFixtureCount(n, planner.meetingsPerOpponent);
  }
  const perGroup = Math.ceil(n / groupCount);
  if (planner.groupMixStrategy === "SMART_MIX") {
    const target = planner.smartMixTargetMatchesPerParticipant ?? 1;
    return groupCount * Math.ceil((perGroup * target) / 2);
  }
  return groupCount * expectedRoundRobinFixtureCount(perGroup, planner.meetingsPerOpponent);
}

function buildSyntheticFixtures(
  payload: TournamentComposerDraftPayload,
  count: number,
): TournamentTimingInput["fixtures"] {
  const planner = payload.planner;
  const participantIds = payload.participants.map((p, i) => p.localId || `p-${i}`);
  if (
    planner &&
    participantIds.length >= 2 &&
    planner.competitionFormat !== "KNOCKOUT_ONLY" &&
    resolveEffectiveGroupCount(planner) <= 1
  ) {
    try {
      const generated = generateRoundRobinFixtures({
        participantIds,
        config: {
          format: "ROUND_ROBIN",
          stageKey: "MAIN",
          meetingsPerOpponent: planner.meetingsPerOpponent,
          homeAwayRelevance: "OFF",
        },
      });
      if (generated.length === count) {
        return generated.map((row) => ({
          fixtureId: row.generatorKey,
          stageKey: row.stageKey,
          roundIndex: row.roundIndex,
          slotIndexInRound: row.slotIndexInRound,
          sideAParticipantId: row.sideAParticipantId,
          sideBParticipantId: row.sideBParticipantId,
        }));
      }
    } catch {
      /* fall through to conservative single-slot topology */
    }
  }

  return Array.from({ length: count }, (_, i) => ({
    fixtureId: `synthetic-${i}`,
    stageKey: "MAIN",
    roundIndex: i,
    slotIndexInRound: 0,
    sideAParticipantId: participantIds[i % participantIds.length] ?? "a",
    sideBParticipantId:
      participantIds[(i + 1) % participantIds.length] ?? "b",
  }));
}

export function composerSmartTimingMissingInputHint(
  payload: TournamentComposerDraftPayload,
): string | null {
  if (payload.homeAway !== "HOME" || !payload.planner) {
    return null;
  }
  if (payload.participants.length < 2) {
    return "Füge mindestens zwei Teams hinzu, damit SCE den Spielplan berechnen kann.";
  }
  if (!payload.startAt) {
    return "Lege zuerst den Turnierbeginn im Schritt Termin fest.";
  }
  if (payload.planner.pitches.length < 1) {
    return "Füge mindestens ein Turnierfeld hinzu.";
  }
  const fixtureCount = estimateFixtureCount(payload);
  if (fixtureCount < 1) {
    return "Passe das Turnierformat an, damit SCE Spiele berechnen kann.";
  }
  return null;
}

function buildTimingInput(payload: TournamentComposerDraftPayload): TournamentTimingInput | null {
  if (payload.homeAway !== "HOME" || !payload.planner || !payload.startAt) {
    return null;
  }
  const start = new Date(payload.startAt);
  if (Number.isNaN(start.getTime())) return null;

  const fixtureCount = estimateFixtureCount(payload);
  if (fixtureCount < 1) return null;

  const end = payload.endAt ? new Date(payload.endAt) : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : start.getTime() + 4 * 60 * 60 * 1000;

  const planner = payload.planner;
  return {
    mode: payload.endAt ? "FIXED_ASSESSMENT" : "FORWARD",
    endBoundaryKnown: Boolean(payload.endAt),
    tournamentWindow: { startUtcMs: start.getTime(), endUtcMs: endMs },
    config: {
      matchDurationMinutes: planner.timing.matchDurationMinutes,
      transitionMinutes: planner.timing.transitionMinutes,
      minRestMinutes: planner.timing.minRestMinutes,
    },
    fixtures: buildSyntheticFixtures(payload, fixtureCount),
    participants: payload.participants.map((p, i) => ({
      participantId: p.localId || `p-${i}`,
    })),
    tournamentPitches: planner.pitches.map((p, i) => ({
      tournamentPitchId: p.localId,
      displayOrder: i,
      label: p.label,
      playableIntervals: [],
    })),
    breaks: planner.breaks
      .map((br) => {
        const interval = resolveComposerBreakDateTimes(br, payload.startAt);
        if (!interval) return null;
        const breakStart = new Date(interval.startAt);
        const breakEnd = new Date(interval.endAt);
        if (Number.isNaN(breakStart.getTime()) || Number.isNaN(breakEnd.getTime())) {
          return null;
        }
        const scope: "ALL_PITCHES" | "SELECTED_PITCHES" =
          br.scope === "SELECTED_PITCHES" && br.fieldSelectionAdvanced
            ? "SELECTED_PITCHES"
            : "ALL_PITCHES";
        return {
          breakId: br.localId,
          startUtcMs: breakStart.getTime(),
          endUtcMs: breakEnd.getTime(),
          scope,
          tournamentPitchIds:
            scope === "SELECTED_PITCHES" ? br.tournamentPitchLocalIds : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };
}

export type TournamentComposerRecommendedTiming = {
  matchDurationMinutes: number;
  transitionMinutes: number;
};

export type TournamentComposerSmartTimingView = {
  missingInputHint: string | null;
  liveAssessment: TournamentTimingAssessment | null;
  recommendedTiming: TournamentComposerRecommendedTiming | null;
  fixtureCount: number;
  pitchCount: number;
};

export function buildTournamentComposerSmartTimingView(
  payload: TournamentComposerDraftPayload,
): TournamentComposerSmartTimingView {
  const missingInputHint = composerSmartTimingMissingInputHint(payload);
  const input = buildTimingInput(payload);
  if (!input || missingInputHint) {
    return {
      missingInputHint,
      liveAssessment: null,
      recommendedTiming: null,
      fixtureCount: estimateFixtureCount(payload),
      pitchCount: payload.planner?.pitches.length ?? 0,
    };
  }

  const liveAssessment = assessTournamentTiming(input);
  let recommendedTiming: TournamentComposerRecommendedTiming | null = null;

  if (liveAssessment.durationRecommendation) {
    recommendedTiming = {
      matchDurationMinutes: liveAssessment.durationRecommendation.matchDurationMinutes,
      transitionMinutes: liveAssessment.durationRecommendation.transitionMinutes,
    };
  } else if (payload.endAt) {
    const backward = assessTournamentTiming({ ...input, mode: "BACKWARD" });
    if (backward.durationRecommendation) {
      recommendedTiming = {
        matchDurationMinutes: backward.durationRecommendation.matchDurationMinutes,
        transitionMinutes: backward.durationRecommendation.transitionMinutes,
      };
    }
  }

  return {
    missingInputHint: null,
    liveAssessment,
    recommendedTiming,
    fixtureCount: input.fixtures.length,
    pitchCount: input.tournamentPitches.length,
  };
}

export function assessTournamentComposerSmartTiming(
  payload: TournamentComposerDraftPayload,
): TournamentTimingAssessment | null {
  return buildTournamentComposerSmartTimingView(payload).liveAssessment;
}

export type ComposerSmartTimingFeasibilitySurface = {
  level: "OK" | "TIGHT" | "ADJUST" | "INFEASIBLE";
  title: string;
  detail: string;
};

export function composerSmartTimingFeasibilitySurface(
  assessment: TournamentTimingAssessment | null,
): ComposerSmartTimingFeasibilitySurface | null {
  if (!assessment) return null;
  if (assessment.feasibilityStatus === "FEASIBLE") {
    return {
      level: "OK",
      title: "Plan passt",
      detail: "Alle Spiele passen in das gewählte Zeitfenster.",
    };
  }
  if (assessment.feasibilityStatus === "TIGHT") {
    return {
      level: "TIGHT",
      title: "Zeitfenster knapp",
      detail: "Nur wenig Reserve vorhanden.",
    };
  }
  if (assessment.durationRecommendation) {
    return {
      level: "ADJUST",
      title: "Anpassung empfohlen",
      detail: "Verkürze die Spielzeit oder füge ein weiteres Feld hinzu.",
    };
  }
  return {
    level: "INFEASIBLE",
    title: "Plan passt noch nicht",
    detail: "Der aktuelle Spielplan benötigt mehr Zeit.",
  };
}

/** @deprecated use composerSmartTimingFeasibilitySurface */
export function composerSmartTimingFeasibilityHeadline(
  assessment: TournamentTimingAssessment | null,
): string | null {
  return composerSmartTimingFeasibilitySurface(assessment)?.title ?? null;
}

export function composerSmartTimingPlanExplanation(
  view: TournamentComposerSmartTimingView,
): string | null {
  const assessment = view.liveAssessment;
  if (!assessment) return null;

  const hasAddPitchNudge = assessment.nudges.some((n) => n.code === "ADD_TOURNAMENT_PITCH");
  if (hasAddPitchNudge) {
    return "Mit einem zusätzlichen Feld könnten die Spiele länger dauern.";
  }

  if (assessment.feasibilityStatus === "INFEASIBLE") {
    return "Das aktuelle Zeitfenster reicht nicht aus.";
  }

  const rec = view.recommendedTiming;
  if (assessment.feasibilityStatus === "TIGHT" && rec) {
    return `Das Zeitfenster ist knapp. Mit ${rec.matchDurationMinutes} Minuten Spielzeit und ${rec.transitionMinutes} Minuten Wechselzeit passt der Spielplan.`;
  }

  if (assessment.feasibilityStatus === "FEASIBLE") {
    const pitchWord = view.pitchCount === 1 ? "Feld" : "Feldern";
    return `${view.fixtureCount} Spiele auf ${view.pitchCount} ${pitchWord} passen komfortabel in das Zeitfenster.`;
  }

  if (assessment.feasibilityStatus === "TIGHT") {
    return "Das Zeitfenster ist knapp — prüfen Sie Spielzeit und Reserve.";
  }

  return null;
}

export function applyComposerRecommendedTiming(
  planner: NonNullable<TournamentComposerDraftPayload["planner"]>,
  recommended: TournamentComposerRecommendedTiming,
): NonNullable<TournamentComposerDraftPayload["planner"]> {
  return {
    ...planner,
    timing: {
      matchDurationMinutes: recommended.matchDurationMinutes,
      transitionMinutes: recommended.transitionMinutes,
      minRestMinutes: planner.timing.minRestMinutes,
    },
  };
}
