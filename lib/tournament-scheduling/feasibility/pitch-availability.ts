import type { FeasibilityInstantWindow, FeasibilityTournamentPitchRef } from "./types";
import { subtractOccupancyFromWindow } from "./normalize-intervals";

/** Half-open interval overlap: [start, end) — touching at end is allowed. */
export function halfOpenIntervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function buildTournamentPitchAvailability(params: {
  tournamentWindow: FeasibilityInstantWindow;
  pitches: readonly Pick<FeasibilityTournamentPitchRef, "tournamentPitchId" | "displayOrder" | "label">[];
  blockedIntervalsByPitchId: ReadonlyMap<string, readonly FeasibilityInstantWindow[]>;
}): FeasibilityTournamentPitchRef[] {
  return params.pitches.map((pitch) => {
    const blocks = params.blockedIntervalsByPitchId.get(pitch.tournamentPitchId) ?? [];
    const playableIntervals = subtractOccupancyFromWindow(params.tournamentWindow, blocks);
    return {
      tournamentPitchId: pitch.tournamentPitchId,
      displayOrder: pitch.displayOrder,
      label: pitch.label,
      playableIntervals,
    };
  });
}

export function sumPlayableMinutes(pitches: readonly FeasibilityTournamentPitchRef[]): number {
  let total = 0;
  for (const pitch of pitches) {
    for (const interval of pitch.playableIntervals) {
      total += Math.max(0, Math.floor((interval.endUtcMs - interval.startUtcMs) / 60_000));
    }
  }
  return total;
}
