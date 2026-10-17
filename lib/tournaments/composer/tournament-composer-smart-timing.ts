/**
 * Reuses 01F1 Smart Timing Advisor for composer draft configuration (pure).
 */

import { assessTournamentTiming } from "@/lib/tournament-scheduling/smart-timing";
import type { TournamentTimingAssessment, TournamentTimingInput } from "@/lib/tournament-scheduling/smart-timing/types";
import { expectedRoundRobinFixtureCount } from "@/lib/tournament-scheduling/fixtures/round-robin";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { resolveEffectiveGroupCount } from "./tournament-composer-planner-defaults";

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

function buildSyntheticFixtures(count: number): TournamentTimingInput["fixtures"] {
  return Array.from({ length: count }, (_, i) => ({
    fixtureId: `synthetic-${i}`,
    stageKey: "MAIN",
    roundIndex: i,
    slotIndexInRound: 0,
    sideAParticipantId: "a",
    sideBParticipantId: "b",
  }));
}

export function assessTournamentComposerSmartTiming(
  payload: TournamentComposerDraftPayload,
): TournamentTimingAssessment | null {
  if (payload.homeAway !== "HOME" || !payload.planner || !payload.startAt) {
    return null;
  }
  const start = new Date(payload.startAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = payload.endAt ? new Date(payload.endAt) : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : start.getTime() + 4 * 60 * 60 * 1000;

  const fixtureCount = estimateFixtureCount(payload);
  if (fixtureCount < 1) return null;

  const planner = payload.planner;
  const input: TournamentTimingInput = {
    mode: payload.endAt ? "FIXED_ASSESSMENT" : "FORWARD",
    endBoundaryKnown: Boolean(payload.endAt),
    tournamentWindow: { startUtcMs: start.getTime(), endUtcMs: endMs },
    config: {
      matchDurationMinutes: planner.timing.matchDurationMinutes,
      transitionMinutes: planner.timing.transitionMinutes,
      minRestMinutes: planner.timing.minRestMinutes,
    },
    fixtures: buildSyntheticFixtures(fixtureCount),
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
        const breakStart = new Date(br.startAt);
        const breakEnd = new Date(br.endAt);
        if (Number.isNaN(breakStart.getTime()) || Number.isNaN(breakEnd.getTime())) {
          return null;
        }
        return {
          breakId: br.localId,
          startUtcMs: breakStart.getTime(),
          endUtcMs: breakEnd.getTime(),
          scope: br.scope,
          tournamentPitchIds:
            br.scope === "SELECTED_PITCHES" ? br.tournamentPitchLocalIds : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };

  return assessTournamentTiming(input);
}

export function composerSmartTimingFeasibilityHeadline(
  assessment: TournamentTimingAssessment | null,
): string | null {
  if (!assessment) return null;
  if (assessment.feasibilityStatus === "FEASIBLE") {
    return "Plan passt";
  }
  if (assessment.feasibilityStatus === "TIGHT") {
    return "Zeitfenster knapp";
  }
  if (assessment.feasibilityStatus === "INFEASIBLE") {
    return "Mehr Zeit oder ein zusätzliches Feld empfohlen";
  }
  return null;
}
