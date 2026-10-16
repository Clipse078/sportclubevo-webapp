import type {
  FeasibilityFixtureRef,
  FeasibilityInstantWindow,
  FeasibilityMetrics,
  FeasibilitySchedulingConfig,
  FeasibilityTournamentPitchRef,
} from "./types";
import { sumPlayableMinutes } from "./pitch-availability";

function intervalMinutes(window: FeasibilityInstantWindow): number {
  return Math.max(0, Math.floor((window.endUtcMs - window.startUtcMs) / 60_000));
}

export function maxFixturesInAnyRound(fixtures: readonly FeasibilityFixtureRef[]): number {
  const byRound = new Map<string, number>();
  for (const fixture of fixtures) {
    const key = `${fixture.stageKey}\0${fixture.roundIndex}`;
    byRound.set(key, (byRound.get(key) ?? 0) + 1);
  }
  let max = 0;
  for (const count of byRound.values()) {
    if (count > max) max = count;
  }
  return max;
}

/**
 * Conservative lower bound on tournament span from per-participant match count + min rest.
 */
export function minimumRequiredTournamentSpanMinutes(
  fixtures: readonly FeasibilityFixtureRef[],
  config: FeasibilitySchedulingConfig,
): number {
  const counts = new Map<string, number>();
  for (const fixture of fixtures) {
    counts.set(fixture.sideAParticipantId, (counts.get(fixture.sideAParticipantId) ?? 0) + 1);
    counts.set(fixture.sideBParticipantId, (counts.get(fixture.sideBParticipantId) ?? 0) + 1);
  }

  let maxSpan = 0;
  for (const matchCount of counts.values()) {
    if (matchCount <= 1) continue;
    const span =
      matchCount * config.matchDurationMinutes +
      (matchCount - 1) * config.minRestMinutes;
    if (span > maxSpan) maxSpan = span;
  }
  return maxSpan;
}

export function buildFeasibilityMetrics(params: {
  fixtures: readonly FeasibilityFixtureRef[];
  tournamentPitches: readonly FeasibilityTournamentPitchRef[];
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  candidateSlotCount: number;
  theoreticalSlotCapacity: number;
  participantMinRestSlackMinutes: number | null;
}): FeasibilityMetrics {
  const fixtureCount = params.fixtures.length;
  const tournamentPitchCount = params.tournamentPitches.length;
  const availableTournamentPitchMinutes = sumPlayableMinutes(params.tournamentPitches);
  const windowMinutesPerPitch = intervalMinutes(params.tournamentWindow);
  const rawPitchMinutes = windowMinutesPerPitch * tournamentPitchCount;
  const blockedTournamentPitchMinutes = Math.max(
    0,
    rawPitchMinutes - availableTournamentPitchMinutes,
  );
  const requiredMatchMinutes = fixtureCount * params.config.matchDurationMinutes;
  const slotOccupancyMinutes =
    params.config.matchDurationMinutes + params.config.transitionMinutes;
  const requiredPitchOccupancyMinutes = fixtureCount * slotOccupancyMinutes;
  const minimumSlotsPerPitch =
    slotOccupancyMinutes > 0
      ? Math.ceil(
          requiredPitchOccupancyMinutes / slotOccupancyMinutes / Math.max(1, tournamentPitchCount),
        )
      : 0;
  const capacityUtilisation =
    availableTournamentPitchMinutes > 0
      ? requiredPitchOccupancyMinutes / availableTournamentPitchMinutes
      : fixtureCount > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  return {
    fixtureCount,
    tournamentPitchCount,
    availableTournamentPitchMinutes,
    blockedTournamentPitchMinutes,
    requiredMatchMinutes,
    requiredPitchOccupancyMinutes,
    minimumSlotsPerPitch,
    theoreticalSlotCapacity: params.theoreticalSlotCapacity,
    candidateSlotCount: params.candidateSlotCount,
    capacityUtilisation,
    minimumRequiredTournamentSpanMinutes: minimumRequiredTournamentSpanMinutes(
      params.fixtures,
      params.config,
    ),
    maxFixturesInSingleRound: maxFixturesInAnyRound(params.fixtures),
    participantMinRestSlackMinutes: params.participantMinRestSlackMinutes,
  };
}
