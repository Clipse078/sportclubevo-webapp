import { buildBlockedIntervalsByPitchId } from "../feasibility/break-intervals";
import { buildTournamentPitchAvailability, sumPlayableMinutes } from "../feasibility/pitch-availability";
import type { FeasibilitySchedulingConfig } from "../feasibility/types";
import { buildTournamentFeasibilityInput, normalizeTimingConfig } from "./prepare-context";
import type { TournamentTimingInput } from "./types";

export function computeEffectivePlayableCapacityMinutes(
  input: TournamentTimingInput,
  config: FeasibilitySchedulingConfig,
): number {
  const normalized = normalizeTimingConfig(config);
  const blocked = buildBlockedIntervalsByPitchId({
    breaks: input.breaks,
    pitches: input.tournamentPitches.map((p) => ({ ...p, playableIntervals: [] })),
    tournamentWindow: input.tournamentWindow,
  });
  const pitches = buildTournamentPitchAvailability({
    tournamentWindow: input.tournamentWindow,
    pitches: input.tournamentPitches,
    blockedIntervalsByPitchId: blocked,
  });
  return sumPlayableMinutes(pitches);
}

export function computeEffectivePlayableCapacityFromFeasibilityInput(
  input: ReturnType<typeof buildTournamentFeasibilityInput>,
): number {
  const blocked = buildBlockedIntervalsByPitchId({
    breaks: input.breaks,
    pitches: input.tournamentPitches,
    tournamentWindow: input.tournamentWindow,
  });
  const pitches = buildTournamentPitchAvailability({
    tournamentWindow: input.tournamentWindow,
    pitches: input.tournamentPitches,
    blockedIntervalsByPitchId: blocked,
  });
  return sumPlayableMinutes(pitches);
}
