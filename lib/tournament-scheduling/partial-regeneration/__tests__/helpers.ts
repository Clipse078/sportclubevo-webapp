import type { TournamentFixtureScheduleAssignment } from "../../schedule-optimiser/types";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "../../schedule-optimiser/__tests__/helpers";

export { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock };

export function assignmentsFromOptimiser(
  result: { assignments: TournamentFixtureScheduleAssignment[] },
): TournamentFixtureScheduleAssignment[] {
  return result.assignments.map((a) => ({ ...a }));
}

export function buildBaselineFromInput(
  input: ReturnType<typeof optimiserInput>,
): TournamentFixtureScheduleAssignment[] {
  const { optimiseTournamentSchedule } = require("../../schedule-optimiser/optimise");
  const initial = optimiseTournamentSchedule(input);
  return assignmentsFromOptimiser(initial);
}
