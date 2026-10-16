/**
 * SCE-TOURNAMENT-PLANNER-01E3B — pure group formation (no I/O).
 *
 * GROUP_FORMATION_ALGORITHM = SERPENTINE_BALANCED_CAPACITY
 * GROUP_BALANCING_DIMENSION = PARTICIPANT_COUNT_ONLY
 */

import { compareParticipantId } from "../fixtures/ordering";
import { formatTournamentGroupLabel } from "../competition-structure/display-labels";

export const GROUP_FORMATION_ALGORITHM = "SERPENTINE_BALANCED_CAPACITY" as const;

export class GroupFormationValidationError extends Error {
  constructor(
    readonly code:
      | "GROUP_COUNT_INVALID"
      | "PARTICIPANT_COUNT_INVALID"
      | "DUPLICATE_PARTICIPANT"
      | "PARTICIPANT_ORDER_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "GroupFormationValidationError";
  }
}

/** Balanced sizes: max - min <= 1; larger groups first (lower display order). */
export function computeBalancedGroupSizes(participantCount: number, groupCount: number): number[] {
  if (!Number.isInteger(participantCount) || participantCount < 2) {
    throw new GroupFormationValidationError(
      "PARTICIPANT_COUNT_INVALID",
      "At least 2 participants are required for group formation",
    );
  }
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > participantCount) {
    throw new GroupFormationValidationError(
      "GROUP_COUNT_INVALID",
      "groupCount must be an integer between 1 and participantCount",
    );
  }

  const baseSize = Math.floor(participantCount / groupCount);
  const largerGroupCount = participantCount % groupCount;
  const sizes: number[] = [];
  for (let i = 0; i < groupCount; i += 1) {
    sizes.push(i < largerGroupCount ? baseSize + 1 : baseSize);
  }
  return sizes;
}

function nextSerpentineIndex(
  current: number,
  direction: 1 | -1,
  groupCount: number,
): { index: number; direction: 1 | -1 } {
  if (direction === 1) {
    if (current >= groupCount - 1) {
      return { index: groupCount - 1, direction: -1 };
    }
    return { index: current + 1, direction: 1 };
  }
  if (current <= 0) {
    return { index: 0, direction: 1 };
  }
  return { index: current - 1, direction: -1 };
}

/**
 * Serpentine draft with per-group capacity caps from {@link computeBalancedGroupSizes}.
 * Participant order is canonical (caller-sorted by displayOrder, id).
 */
export function distributeParticipantsIntoBalancedGroups(
  participantIds: readonly string[],
  groupCount: number,
): { groupAssignments: readonly (readonly string[])[]; groupSizes: readonly number[] } {
  const seen = new Set<string>();
  for (const id of participantIds) {
    if (seen.has(id)) {
      throw new GroupFormationValidationError(
        "DUPLICATE_PARTICIPANT",
        `Duplicate participant id in request: ${id}`,
      );
    }
    seen.add(id);
  }

  const sorted = [...participantIds].sort(compareParticipantId);
  if (sorted.length !== participantIds.length) {
    throw new GroupFormationValidationError(
      "PARTICIPANT_ORDER_INVALID",
      "Participant list length mismatch after deduplication",
    );
  }

  const groupSizes = computeBalancedGroupSizes(sorted.length, groupCount);
  const remainingCapacity = [...groupSizes];
  const groups: string[][] = groupSizes.map(() => []);

  let groupIndex = 0;
  let direction: 1 | -1 = 1;

  for (const participantId of sorted) {
    let guard = 0;
    while (remainingCapacity[groupIndex] === 0) {
      const next = nextSerpentineIndex(groupIndex, direction, groupCount);
      groupIndex = next.index;
      direction = next.direction;
      guard += 1;
      if (guard > groupCount * 4) {
        throw new GroupFormationValidationError(
          "GROUP_COUNT_INVALID",
          "Serpentine distribution could not place participant — group sizing invariant violated",
        );
      }
    }

    groups[groupIndex]!.push(participantId);
    remainingCapacity[groupIndex]! -= 1;

    const next = nextSerpentineIndex(groupIndex, direction, groupCount);
    groupIndex = next.index;
    direction = next.direction;
  }

  return { groupAssignments: groups, groupSizes };
}

export interface PlannedGroupTopology {
  displayOrder: number;
  label: string;
  participantIds: readonly string[];
}

export function planAutomaticGroupTopology(
  participantIds: readonly string[],
  groupCount: number,
): PlannedGroupTopology[] {
  const { groupAssignments } = distributeParticipantsIntoBalancedGroups(
    participantIds,
    groupCount,
  );
  return groupAssignments.map((assignment, index) => ({
    displayOrder: index + 1,
    label: formatTournamentGroupLabel(index),
    participantIds: assignment,
  }));
}

export function summarizeGroupFormation(
  participantCount: number,
  groupSizes: readonly number[],
): {
  participantCount: number;
  groupCount: number;
  groupSizes: readonly number[];
  minGroupSize: number;
  maxGroupSize: number;
} {
  const minGroupSize = Math.min(...groupSizes);
  const maxGroupSize = Math.max(...groupSizes);
  return {
    participantCount,
    groupCount: groupSizes.length,
    groupSizes,
    minGroupSize,
    maxGroupSize,
  };
}
