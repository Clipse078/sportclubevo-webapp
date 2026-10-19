/**
 * SCE-TOURNAMENT-PLANNER-02C — deterministic participant-unit capacity overlap.
 *
 * Identity and overlap use stable IDs/modes/partitions — never display names.
 */

import type { TournamentParticipantUnitMode } from "@prisma/client";

export type ParticipantUnitCapacityRef = {
  unitId: string;
  tournamentParticipantId: string;
  mode: TournamentParticipantUnitMode;
  /** Resolved partition for SUBUNIT; FULL uses sentinel. */
  capacityPartitionKey: string;
};

export const FULL_UNIT_CAPACITY_PARTITION_SENTINEL = "__FULL__" as const;

export function resolveCapacityPartitionKey(input: {
  id: string;
  mode: TournamentParticipantUnitMode;
  capacityPartitionKey: string | null;
}): string {
  if (input.mode === "FULL") {
    return FULL_UNIT_CAPACITY_PARTITION_SENTINEL;
  }
  return input.capacityPartitionKey?.trim() || input.id;
}

export function toParticipantUnitCapacityRef(input: {
  id: string;
  tournamentParticipantId: string;
  mode: TournamentParticipantUnitMode;
  capacityPartitionKey: string | null;
}): ParticipantUnitCapacityRef {
  return {
    unitId: input.id,
    tournamentParticipantId: input.tournamentParticipantId,
    mode: input.mode,
    capacityPartitionKey: resolveCapacityPartitionKey(input),
  };
}

/**
 * Returns true when two units cannot be scheduled concurrently under parent capacity rules.
 */
export function doParticipantUnitsOverlapCapacity(
  unitA: ParticipantUnitCapacityRef,
  unitB: ParticipantUnitCapacityRef,
): boolean {
  if (unitA.tournamentParticipantId !== unitB.tournamentParticipantId) {
    return false;
  }
  if (unitA.unitId === unitB.unitId) {
    return true;
  }
  if (unitA.mode === "FULL" || unitB.mode === "FULL") {
    return true;
  }
  return unitA.capacityPartitionKey === unitB.capacityPartitionKey;
}
