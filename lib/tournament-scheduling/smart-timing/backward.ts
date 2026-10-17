import { runTimingFeasibilityOracle } from "./feasibility-oracle";
import { computeEffectivePlayableCapacityMinutes } from "./capacity";
import {
  PRACTICAL_MATCH_DURATION_MINUTES,
  PRACTICAL_TRANSITION_MINUTES,
} from "./constants";
import { buildTournamentFeasibilityInput, normalizeTimingConfig } from "./prepare-context";
import type { TimingDurationRecommendation, TournamentTimingInput } from "./types";

function windowSpanMinutes(window: { startUtcMs: number; endUtcMs: number }): number {
  return Math.max(0, Math.floor((window.endUtcMs - window.startUtcMs) / 60_000));
}

function isFeasibleStatus(status: string): boolean {
  return status === "FEASIBLE" || status === "TIGHT";
}

export function structuralSlotUpperBoundMinutes(input: TournamentTimingInput): number {
  const baselineConfig = normalizeTimingConfig(input.config);
  const playableMinutes = computeEffectivePlayableCapacityMinutes(input, baselineConfig);
  const fixtureCount = Math.max(1, input.fixtures.length);
  const pitchCount = Math.max(1, input.tournamentPitches.length);
  return Math.floor(
    Math.min(
      playableMinutes / fixtureCount,
      (windowSpanMinutes(input.tournamentWindow) * pitchCount) / fixtureCount,
    ),
  );
}

function oracleFeasible(
  input: TournamentTimingInput,
  matchDurationMinutes: number,
  transitionMinutes: number,
): boolean {
  const config = {
    matchDurationMinutes,
    transitionMinutes,
    minRestMinutes: input.config.minRestMinutes,
  };
  const feasibilityInput = buildTournamentFeasibilityInput(
    input,
    config,
    input.tournamentWindow,
  );
  const result = runTimingFeasibilityOracle(feasibilityInput, config);
  return isFeasibleStatus(result.status);
}

/**
 * Mathematical maximum timing (integer minutes, not limited to practical grids):
 * lexicographic maximise match duration, then transition duration, within the structural
 * per-fixture slot upper bound and verified by the 01D oracle.
 */
export function recommendMathematicalMaximumTiming(
  input: TournamentTimingInput,
): TimingDurationRecommendation | null {
  const slotUpperBound = structuralSlotUpperBoundMinutes(input);
  if (slotUpperBound <= 0) return null;

  for (let matchDurationMinutes = slotUpperBound; matchDurationMinutes >= 1; matchDurationMinutes--) {
    const maxTransition = slotUpperBound - matchDurationMinutes;
    for (let transitionMinutes = maxTransition; transitionMinutes >= 0; transitionMinutes--) {
      if (matchDurationMinutes + transitionMinutes > slotUpperBound) continue;
      if (oracleFeasible(input, matchDurationMinutes, transitionMinutes)) {
        return {
          matchDurationMinutes,
          transitionMinutes,
          rationale: `Mathematical maximum: longest integer match (${matchDurationMinutes} min) then longest transition (${transitionMinutes} min) within structural slot bound ${slotUpperBound} min per fixture, verified by 01D.`,
        };
      }
    }
  }
  return null;
}

/**
 * Operational backward recommendation (deterministic):
 * 1. Candidates from PRACTICAL_* minute grids only.
 * 2. Zero-minute transition is allowed mathematically but excluded from operational selection
 *    when any oracle-feasible practical pair has transitionMinutes > 0.
 * 3. Lexicographic tie-break: highest matchDurationMinutes, then highest transitionMinutes.
 */
export function recommendOperationalMatchAndTransitionDurations(
  input: TournamentTimingInput,
): TimingDurationRecommendation | null {
  const slotUpperBound = structuralSlotUpperBoundMinutes(input);
  if (slotUpperBound <= 0) return null;

  const matchCandidates = [...PRACTICAL_MATCH_DURATION_MINUTES]
    .filter((m) => m <= slotUpperBound)
    .sort((a, b) => b - a);
  const transitionCandidates = [...PRACTICAL_TRANSITION_MINUTES].sort((a, b) => b - a);

  const feasibleOperational: Array<{ match: number; transition: number }> = [];

  for (const matchDurationMinutes of matchCandidates) {
    for (const transitionMinutes of transitionCandidates) {
      if (matchDurationMinutes + transitionMinutes > slotUpperBound) continue;
      if (oracleFeasible(input, matchDurationMinutes, transitionMinutes)) {
        feasibleOperational.push({ match: matchDurationMinutes, transition: transitionMinutes });
      }
    }
  }

  if (feasibleOperational.length === 0) return null;

  const hasNonZeroTransition = feasibleOperational.some((p) => p.transition > 0);
  const operationalPool = hasNonZeroTransition
    ? feasibleOperational.filter((p) => p.transition > 0)
    : feasibleOperational;

  operationalPool.sort((a, b) => b.match - a.match || b.transition - a.transition);
  const chosen = operationalPool[0]!;

  return {
    matchDurationMinutes: chosen.match,
    transitionMinutes: chosen.transition,
    rationale: hasNonZeroTransition
      ? `Operational recommendation: longest practical match (${chosen.match} min) with longest practical transition (${chosen.transition} min) among oracle-feasible pairs; zero-transition pairs reserved for mathematical maximum / tight utilisation.`
      : `Operational recommendation: longest practical match (${chosen.match} min) with transition (${chosen.transition} min); only zero-transition pairs fit the window under 01D hard constraints.`,
  };
}

/** @deprecated Prefer recommendOperationalMatchAndTransitionDurations — kept as operational alias. */
export function recommendMatchAndTransitionDurations(
  input: TournamentTimingInput,
): TimingDurationRecommendation | null {
  return recommendOperationalMatchAndTransitionDurations(input);
}

export function recommendBackwardTimingDurations(input: TournamentTimingInput): {
  mathematicalMaximum: TimingDurationRecommendation | null;
  operationalRecommendation: TimingDurationRecommendation | null;
} {
  return {
    mathematicalMaximum: recommendMathematicalMaximumTiming(input),
    operationalRecommendation: recommendOperationalMatchAndTransitionDurations(input),
  };
}
