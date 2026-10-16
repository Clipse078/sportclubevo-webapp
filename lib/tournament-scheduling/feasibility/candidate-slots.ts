import { compareParticipantId } from "../fixtures/ordering";
import type {
  FeasibilityCandidateSlot,
  FeasibilityExternalOccupancyInterval,
  FeasibilityInstantWindow,
  FeasibilityResourceRef,
  FeasibilitySchedulingConfig,
} from "./types";

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function blockedByExternal(
  resourceId: string,
  startUtcMs: number,
  resourceEndUtcMs: number,
  externalOccupancy: readonly FeasibilityExternalOccupancyInterval[],
): boolean {
  for (const block of externalOccupancy) {
    if (block.resourceId !== resourceId) continue;
    if (overlaps(startUtcMs, resourceEndUtcMs, block.startUtcMs, block.endUtcMs)) {
      return true;
    }
  }
  return false;
}

function theoreticalSlotsInInterval(
  interval: FeasibilityInstantWindow,
  slotOccupancyMs: number,
): number {
  const span = interval.endUtcMs - interval.startUtcMs;
  if (span < slotOccupancyMs) return 0;
  return Math.floor(span / slotOccupancyMs);
}

export function computeTheoreticalSlotCapacity(
  resources: readonly FeasibilityResourceRef[],
  config: FeasibilitySchedulingConfig,
): number {
  const slotOccupancyMs = (config.matchDurationMinutes + config.transitionMinutes) * 60_000;
  if (slotOccupancyMs <= 0) return 0;
  let total = 0;
  for (const resource of resources) {
    for (const interval of resource.availabilityIntervals) {
      total += theoreticalSlotsInInterval(interval, slotOccupancyMs);
    }
  }
  return total;
}

/**
 * Deterministic candidate slots at fixed stride = resource slot occupancy (H9).
 */
export function generateFeasibilityCandidateSlots(
  resources: readonly FeasibilityResourceRef[],
  config: FeasibilitySchedulingConfig,
  externalOccupancy: readonly FeasibilityExternalOccupancyInterval[],
): FeasibilityCandidateSlot[] {
  const matchMs = config.matchDurationMinutes * 60_000;
  const slotOccupancyMs = (config.matchDurationMinutes + config.transitionMinutes) * 60_000;
  if (slotOccupancyMs <= 0 || matchMs <= 0) return [];

  const sortedResources = [...resources].sort((a, b) =>
    compareParticipantId(a.resourceId, b.resourceId),
  );

  const slots: FeasibilityCandidateSlot[] = [];
  let slotIndex = 0;

  for (const resource of sortedResources) {
    for (const interval of resource.availabilityIntervals) {
      let startUtcMs = interval.startUtcMs;
      while (startUtcMs + slotOccupancyMs <= interval.endUtcMs) {
        const resourceEndUtcMs = startUtcMs + slotOccupancyMs;
        const participantEndUtcMs = startUtcMs + matchMs;
        if (
          !blockedByExternal(
            resource.resourceId,
            startUtcMs,
            resourceEndUtcMs,
            externalOccupancy,
          )
        ) {
          slots.push({
            slotIndex,
            resourceId: resource.resourceId,
            startUtcMs,
            resourceEndUtcMs,
            participantEndUtcMs,
          });
          slotIndex += 1;
        }
        startUtcMs += slotOccupancyMs;
      }
    }
  }

  slots.sort((a, b) => {
    if (a.startUtcMs !== b.startUtcMs) return a.startUtcMs - b.startUtcMs;
    return compareParticipantId(a.resourceId, b.resourceId);
  });

  return slots.map((slot, index) => ({ ...slot, slotIndex: index }));
}
