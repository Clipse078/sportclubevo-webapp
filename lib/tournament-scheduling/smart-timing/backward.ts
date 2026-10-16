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

/**
 * Deterministic backward recommendation: prefer longer practical match durations, then transitions.
 * Derived from 01D feasibility oracle — not hardcoded product durations.
 */
export function recommendMatchAndTransitionDurations(
  input: TournamentTimingInput,
): TimingDurationRecommendation | null {
  const baselineConfig = normalizeTimingConfig(input.config);
  const playableMinutes = computeEffectivePlayableCapacityMinutes(input, baselineConfig);
  const fixtureCount = Math.max(1, input.fixtures.length);
  const pitchCount = Math.max(1, input.tournamentPitches.length);
  const structuralSlotUpperBound = Math.floor(
    Math.min(
      playableMinutes / fixtureCount,
      (windowSpanMinutes(input.tournamentWindow) * pitchCount) / fixtureCount,
    ),
  );

  const matchCandidates = [...PRACTICAL_MATCH_DURATION_MINUTES]
    .filter((m) => m <= structuralSlotUpperBound)
    .sort((a, b) => b - a);
  const transitionCandidates = [...PRACTICAL_TRANSITION_MINUTES].sort((a, b) => b - a);

  for (const matchDurationMinutes of matchCandidates) {
    for (const transitionMinutes of transitionCandidates) {
      if (matchDurationMinutes + transitionMinutes > structuralSlotUpperBound) continue;
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
      if (isFeasibleStatus(result.status)) {
        return {
          matchDurationMinutes,
          transitionMinutes,
          rationale: `Longest practical match (${matchDurationMinutes} min) with longest practical transition (${transitionMinutes} min) that satisfies 01D hard constraints in the fixed window.`,
        };
      }
    }
  }

  return null;
}
