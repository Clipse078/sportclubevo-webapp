import type { FeasibilitySchedulingConfig } from "../feasibility/types";
import type { TournamentFixtureScheduleAssignment } from "../schedule-optimiser/types";

function ms(minutes: number): number {
  return minutes * 60_000;
}

/** Canonical participant + resource interval from schedule config (01D H9). */
export function scheduleAssignmentFromStart(params: {
  fixtureId: string;
  tournamentPitchId: string;
  startUtcMs: number;
  config: FeasibilitySchedulingConfig;
}): TournamentFixtureScheduleAssignment {
  const matchMs = params.config.matchDurationMinutes * 60_000;
  const transitionMs = ms(params.config.transitionMinutes);
  const endUtcMs = params.startUtcMs + matchMs;
  const resourceEndUtcMs = params.startUtcMs + matchMs + transitionMs;
  return {
    fixtureId: params.fixtureId,
    tournamentPitchId: params.tournamentPitchId,
    startUtcMs: params.startUtcMs,
    endUtcMs,
    resourceEndUtcMs,
  };
}

export function persistedAssignmentToScheduleAssignment(
  row: {
    fixtureId: string;
    tournamentPitchId: string;
    startAt: string;
  },
  config: FeasibilitySchedulingConfig,
): TournamentFixtureScheduleAssignment {
  return scheduleAssignmentFromStart({
    fixtureId: row.fixtureId,
    tournamentPitchId: row.tournamentPitchId,
    startUtcMs: Date.parse(row.startAt),
    config,
  });
}
