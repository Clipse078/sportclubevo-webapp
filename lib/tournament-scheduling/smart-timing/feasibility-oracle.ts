import { analyseTournamentFeasibility } from "../feasibility/analyse";
import { TIGHT_CAPACITY_UTILISATION_THRESHOLD } from "../feasibility/constants";
import type {
  FeasibilitySchedulingConfig,
  TournamentFeasibilityInput,
  TournamentFeasibilityResult,
} from "../feasibility/types";
import {
  findFeasibilityWitnessSchedule,
  type WitnessScheduleOutcome,
} from "./witness-schedule";

function computeParticipantMinRestSlack(
  witness: WitnessScheduleOutcome,
  config: FeasibilitySchedulingConfig,
): number | null {
  let minSlack: number | null = null;
  for (const bookings of witness.state.participantBookings.values()) {
    const sorted = [...bookings].sort((a, b) => a.startUtcMs - b.startUtcMs);
    for (let i = 1; i < sorted.length; i += 1) {
      const gapMs = sorted[i].startUtcMs - sorted[i - 1].participantEndUtcMs;
      const slackMinutes = Math.floor(gapMs / 60_000) - config.minRestMinutes;
      if (minSlack === null || slackMinutes < minSlack) {
        minSlack = slackMinutes;
      }
    }
  }
  return minSlack;
}

function classifyTight(metrics: TournamentFeasibilityResult["metrics"]): boolean {
  if (metrics.capacityUtilisation >= TIGHT_CAPACITY_UTILISATION_THRESHOLD) return true;
  if (metrics.participantMinRestSlackMinutes === 0) return true;
  if (
    metrics.theoreticalSlotCapacity > 0 &&
    metrics.fixtureCount >= metrics.theoreticalSlotCapacity
  ) {
    return true;
  }
  return false;
}

function buildFeasibleResultFromWitness(
  input: TournamentFeasibilityInput,
  config: FeasibilitySchedulingConfig,
  witness: WitnessScheduleOutcome,
): TournamentFeasibilityResult {
  const participantMinRestSlackMinutes = computeParticipantMinRestSlack(witness, config);
  const metrics = {
    ...witness.metrics,
    participantMinRestSlackMinutes,
  };

  const tight = classifyTight(metrics);
  return {
    status: tight ? "TIGHT" : "FEASIBLE",
    diagnostics: [],
    metrics,
    suggestions: [],
  };
}

/**
 * Single complete-search path when a witness schedule exists; falls back to 01D analyse otherwise.
 */
export function runTimingFeasibilityOracle(
  input: TournamentFeasibilityInput,
  config: FeasibilitySchedulingConfig,
): TournamentFeasibilityResult {
  const witness = findFeasibilityWitnessSchedule(input, config);
  if (witness.ok) {
    return buildFeasibleResultFromWitness(input, config, witness);
  }
  return analyseTournamentFeasibility(input);
}

export function runTimingFeasibilityWithWitness(
  input: TournamentFeasibilityInput,
  config: FeasibilitySchedulingConfig,
) {
  const witness = findFeasibilityWitnessSchedule(input, config);
  const feasibility = witness.ok
    ? buildFeasibleResultFromWitness(input, config, witness)
    : analyseTournamentFeasibility(input);
  return { feasibility, witness: witness.ok ? witness : null };
}
