import { compareParticipantId } from "../fixtures/ordering";
import { slotOverlapsPitchBreak } from "./break-intervals";
import type {
  FeasibilityCandidateSlot,
  FeasibilityInstantWindow,
  FeasibilitySchedulingConfig,
  FeasibilityTournamentPitchRef,
} from "./types";

function theoreticalSlotsInInterval(
  interval: FeasibilityInstantWindow,
  slotOccupancyMs: number,
): number {
  const span = interval.endUtcMs - interval.startUtcMs;
  if (span < slotOccupancyMs) return 0;
  return Math.floor(span / slotOccupancyMs);
}

export function computeTheoreticalSlotCapacity(
  tournamentPitches: readonly FeasibilityTournamentPitchRef[],
  config: FeasibilitySchedulingConfig,
): number {
  const slotOccupancyMs = (config.matchDurationMinutes + config.transitionMinutes) * 60_000;
  if (slotOccupancyMs <= 0) return 0;
  let total = 0;
  for (const pitch of tournamentPitches) {
    for (const interval of pitch.playableIntervals) {
      total += theoreticalSlotsInInterval(interval, slotOccupancyMs);
    }
  }
  return total;
}

/**
 * Deterministic candidate slots at fixed stride = pitch slot occupancy (H9).
 * Half-open break semantics: slot may start exactly when a break ends.
 */
export function generateFeasibilityCandidateSlots(
  tournamentPitches: readonly FeasibilityTournamentPitchRef[],
  config: FeasibilitySchedulingConfig,
  blockedIntervalsByPitchId: ReadonlyMap<string, readonly FeasibilityInstantWindow[]>,
): FeasibilityCandidateSlot[] {
  const matchMs = config.matchDurationMinutes * 60_000;
  const slotOccupancyMs = (config.matchDurationMinutes + config.transitionMinutes) * 60_000;
  if (slotOccupancyMs <= 0 || matchMs <= 0) return [];

  const sortedPitches = [...tournamentPitches].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return compareParticipantId(a.tournamentPitchId, b.tournamentPitchId);
  });

  const slots: FeasibilityCandidateSlot[] = [];
  let slotIndex = 0;

  for (const pitch of sortedPitches) {
    for (const interval of pitch.playableIntervals) {
      let startUtcMs = interval.startUtcMs;
      while (startUtcMs + slotOccupancyMs <= interval.endUtcMs) {
        const resourceEndUtcMs = startUtcMs + slotOccupancyMs;
        const participantEndUtcMs = startUtcMs + matchMs;
        const candidate: FeasibilityCandidateSlot = {
          slotIndex,
          tournamentPitchId: pitch.tournamentPitchId,
          startUtcMs,
          resourceEndUtcMs,
          participantEndUtcMs,
        };
        if (!slotOverlapsPitchBreak(candidate, blockedIntervalsByPitchId)) {
          slots.push(candidate);
          slotIndex += 1;
        }
        startUtcMs += slotOccupancyMs;
      }
    }
  }

  slots.sort((a, b) => {
    if (a.startUtcMs !== b.startUtcMs) return a.startUtcMs - b.startUtcMs;
    const orderA =
      sortedPitches.find((p) => p.tournamentPitchId === a.tournamentPitchId)?.displayOrder ?? 0;
    const orderB =
      sortedPitches.find((p) => p.tournamentPitchId === b.tournamentPitchId)?.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return compareParticipantId(a.tournamentPitchId, b.tournamentPitchId);
  });

  return slots.map((slot, index) => ({ ...slot, slotIndex: index }));
}
