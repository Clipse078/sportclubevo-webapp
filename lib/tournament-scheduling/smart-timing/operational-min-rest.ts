import { runTimingFeasibilityOracle } from "./feasibility-oracle";
import { buildTournamentFeasibilityInput } from "./prepare-context";
import type {
  ParticipantRestProofStatus,
  TimingMinRestRecommendation,
  TournamentTimingInput,
} from "./types";

export type { TimingMinRestRecommendation } from "./types";

function windowSpanMinutes(window: { startUtcMs: number; endUtcMs: number }): number {
  return Math.max(0, Math.floor((window.endUtcMs - window.startUtcMs) / 60_000));
}

function isFeasibleStatus(status: string): boolean {
  return status === "FEASIBLE" || status === "TIGHT";
}

function oracleFeasibleWithMinRest(
  input: TournamentTimingInput,
  matchDurationMinutes: number,
  transitionMinutes: number,
  minRestMinutes: number,
): boolean {
  const config = {
    matchDurationMinutes,
    transitionMinutes,
    minRestMinutes,
  };
  const feasibilityInput = buildTournamentFeasibilityInput(
    input,
    config,
    input.tournamentWindow,
  );
  const result = runTimingFeasibilityOracle(feasibilityInput, config);
  return isFeasibleStatus(result.status);
}

function maxFeasibleMinRestMinutes(
  input: TournamentTimingInput,
  matchDurationMinutes: number,
  transitionMinutes: number,
  upperBoundMinutes: number,
): number {
  let lo = 0;
  let hi = Math.max(0, upperBoundMinutes);
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (oracleFeasibleWithMinRest(input, matchDurationMinutes, transitionMinutes, mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * Deterministic operational minimum-team-rest recommendation for a fixed match/transition pair.
 * Mathematical feasibility may allow 0; operational recommendation prefers the highest proven
 * positive rest that still fits the tournament window under 01D hard constraints.
 */
export function recommendOperationalMinRestMinutes(
  input: TournamentTimingInput,
  matchDurationMinutes: number,
  transitionMinutes: number,
  participantRestProofStatus: ParticipantRestProofStatus,
): TimingMinRestRecommendation {
  const mathematicalMinimumMinutes = 0;
  const upperBound = Math.min(
    windowSpanMinutes(input.tournamentWindow),
    Math.max(60, matchDurationMinutes * 4),
  );

  if (participantRestProofStatus !== "PROVEN") {
    return {
      minRestMinutes: mathematicalMinimumMinutes,
      kind: "MATHEMATICAL_BOUND",
      mathematicalMinimumMinutes,
      rationale:
        "Participant recovery is not fully proven (qualification or unresolved sides); operational minimum rest stays at the hard feasibility floor.",
    };
  }

  const maxFeasible = maxFeasibleMinRestMinutes(
    input,
    matchDurationMinutes,
    transitionMinutes,
    upperBound,
  );

  if (maxFeasible <= 0) {
    return {
      minRestMinutes: 0,
      kind: "MATHEMATICAL_BOUND",
      mathematicalMinimumMinutes,
      rationale:
        "No positive minimum rest fits the window under 01D hard constraints with the recommended match and transition durations.",
    };
  }

  return {
    minRestMinutes: maxFeasible,
    kind: "OPERATIONALLY_RECOMMENDED",
    mathematicalMinimumMinutes,
    rationale: `Operational recommendation: highest oracle-feasible minimum rest (${maxFeasible} min) for proven participant identities within the tournament window.`,
  };
}
