import { runTimingFeasibilityOracle } from "./feasibility-oracle";
import { SMART_TIMING_PITCH_PROOF_SEARCH_MAX } from "../feasibility/constants";
import type { FeasibilitySchedulingConfig, TournamentFeasibilityInput } from "../feasibility/types";
import {
  MIN_BREAK_OPPORTUNITY_MINUTES,
  PRACTICAL_MATCH_DURATION_MINUTES,
} from "./constants";
import { buildTournamentFeasibilityInput } from "./prepare-context";
import type {
  BreakOpportunity,
  MatchDurationOpportunity,
  PitchCountRecommendation,
  TournamentTimingInput,
} from "./types";

function isFeasibleStatus(status: string): boolean {
  return status === "FEASIBLE" || status === "TIGHT";
}

export function recommendMinimumPitchCount(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
): PitchCountRecommendation {
  const current = input.tournamentPitches.length;
  if (input.fixtures.length === 0) {
    return {
      minimumProvenPitchCount: null,
      currentPitchCount: current,
      rationale: "No fixtures — pitch minimum not provable.",
    };
  }

  let provenMinimum: number | null = null;
  let low = 1;
  let high = Math.min(SMART_TIMING_PITCH_PROOF_SEARCH_MAX, current);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const pitches = input.tournamentPitches.slice(0, mid);
    if (pitches.length < mid) break;
    const feasibilityInput = buildTournamentFeasibilityInput(
      { ...input, tournamentPitches: pitches },
      config,
      input.tournamentWindow,
    );
    const result = runTimingFeasibilityOracle(feasibilityInput, config);
    if (isFeasibleStatus(result.status)) {
      provenMinimum = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return {
    minimumProvenPitchCount: provenMinimum,
    currentPitchCount: current,
    rationale:
      provenMinimum === null
        ? "No pitch count up to MVP limit produced a feasible witness schedule."
        : `Minimum proven pitch count ${provenMinimum} via complete 01D search.`,
  };
}

export function computeMatchDurationIncreaseOpportunity(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
): MatchDurationOpportunity {
  const baseInput = buildTournamentFeasibilityInput(input, config, input.tournamentWindow);
  const base = runTimingFeasibilityOracle(baseInput, config);
  if (!isFeasibleStatus(base.status)) return null;

  const currentMatch = config.matchDurationMinutes;
  const sorted = [...PRACTICAL_MATCH_DURATION_MINUTES]
    .filter((m) => m > currentMatch)
    .sort((a, b) => b - a)
    .slice(0, 8);
  let best: MatchDurationOpportunity = null;

  for (const candidateMatch of sorted) {
    const trialConfig = { ...config, matchDurationMinutes: candidateMatch };
    const trialInput = buildTournamentFeasibilityInput(input, trialConfig, input.tournamentWindow);
    const result = runTimingFeasibilityOracle(trialInput, trialConfig);
    if (isFeasibleStatus(result.status)) {
      best = {
        additionalMatchMinutes: candidateMatch - currentMatch,
        recommendedMatchDurationMinutes: candidateMatch,
        rationale: `Longer ${candidateMatch} minute matches remain feasible with current window and pitches.`,
      };
      break;
    }
  }

  return best;
}

export function computeBreakOpportunity(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
  reserveMinutes: number | null,
): BreakOpportunity {
  if (reserveMinutes === null || reserveMinutes < MIN_BREAK_OPPORTUNITY_MINUTES) {
    return null;
  }

  const suggestedDurationMinutes = Math.min(
    reserveMinutes,
    Math.max(MIN_BREAK_OPPORTUNITY_MINUTES, Math.floor(reserveMinutes / 2)),
  );

  return {
    suggestedDurationMinutes,
    rationale: `Reserve of ${reserveMinutes} minutes could accommodate an additional all-pitch break of up to ${suggestedDurationMinutes} minutes without re-optimising fixtures.`,
  };
}

export function pitchCouldBeRemoved(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
): boolean {
  if (input.tournamentPitches.length <= 1) return false;
  const reduced = input.tournamentPitches.slice(0, input.tournamentPitches.length - 1);
  const reducedInput = buildTournamentFeasibilityInput(
    { ...input, tournamentPitches: reduced },
    config,
    input.tournamentWindow,
  );
  return isFeasibleStatus(runTimingFeasibilityOracle(reducedInput, config).status);
}
