import type { TournamentScheduleOptimisationInput } from "../types";
import {
  BASE_MS,
  baseInput as timingBaseInput,
  participantsFromFixtures,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "../../smart-timing/__tests__/helpers";

export {
  BASE_MS,
  participantsFromFixtures,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
};

export function optimiserInput(
  partial: Partial<TournamentScheduleOptimisationInput> &
    Pick<TournamentScheduleOptimisationInput, "fixtures">,
): TournamentScheduleOptimisationInput {
  const timing = timingBaseInput({
    mode: "FIXED_ASSESSMENT",
    ...partial,
    fixtures: partial.fixtures,
  });
  const { mode: _mode, ...rest } = timing;
  return rest;
}
