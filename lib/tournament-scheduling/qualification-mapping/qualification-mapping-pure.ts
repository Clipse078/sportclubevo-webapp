/**
 * SCE-TOURNAMENT-PLANNER-01E3D — deterministic group-rank → knockout entry mapping (pure).
 */

import type { TournamentFixtureSideLabel } from "../competition-structure/types";
import {
  buildBracketSeedOrder,
  smallestPowerOfTwoGte,
} from "../knockout-bracket/knockout-bracket-pure";
import type { KnockoutEntrantInput } from "../knockout-bracket/knockout-bracket-types";
import type {
  BuildKnockoutEntrantOrderInput,
  BuildKnockoutEntrantOrderResult,
  GenerateDefaultGroupRankMappingsInput,
  GenerateDefaultGroupRankMappingsResult,
  GroupRankQualifierSlot,
  GroupRankToKnockoutEntryMapping,
  KnockoutStructuralEntryTarget,
} from "./qualification-mapping-types";
import { AUTOMATIC_GROUP_RANK_PAIRING_POLICY } from "./qualification-mapping-types";

export class QualificationMappingValidationError extends Error {
  readonly code:
    | "INVALID_RANK"
    | "INVALID_TARGET"
    | "DUPLICATE_SOURCE"
    | "DUPLICATE_TARGET"
    | "INCOMPLETE_MAPPING"
    | "IMPOSSIBLE_RANK"
    | "STRUCTURAL_CONFLICT";

  constructor(
    code: QualificationMappingValidationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "QualificationMappingValidationError";
    this.code = code;
  }
}

function groupRankKey(sourceGroupId: string, rank: number): string {
  return `${sourceGroupId}:${rank}`;
}

export function seedIndexToStructuralTarget(
  bracketSize: number,
  seedIndex: number,
): KnockoutStructuralEntryTarget {
  if (seedIndex < 1 || seedIndex > bracketSize) {
    throw new QualificationMappingValidationError(
      "INVALID_TARGET",
      `Seed index ${seedIndex} out of range for bracket size ${bracketSize}`,
    );
  }
  const seedOrder = buildBracketSeedOrder(bracketSize);
  const firstRoundSlots = bracketSize / 2;
  for (let slot = 0; slot < firstRoundSlots; slot++) {
    const leftSeed = seedOrder[slot * 2]!;
    const rightSeed = seedOrder[slot * 2 + 1]!;
    if (leftSeed === seedIndex) {
      return { roundIndex: 0, slotIndexInRound: slot, side: "A" };
    }
    if (rightSeed === seedIndex) {
      return { roundIndex: 0, slotIndexInRound: slot, side: "B" };
    }
  }
  throw new QualificationMappingValidationError(
    "INVALID_TARGET",
    `Seed index ${seedIndex} has no round-0 structural side`,
  );
}

export function structuralTargetToSeedIndex(
  bracketSize: number,
  target: KnockoutStructuralEntryTarget,
): number {
  if (target.roundIndex !== 0) {
    throw new QualificationMappingValidationError(
      "INVALID_TARGET",
      "GROUP_RANK mapping targets must be roundIndex 0 entry sides",
    );
  }
  const seedOrder = buildBracketSeedOrder(bracketSize);
  const leftSeed = seedOrder[target.slotIndexInRound * 2];
  const rightSeed = seedOrder[target.slotIndexInRound * 2 + 1];
  if (leftSeed == null || rightSeed == null) {
    throw new QualificationMappingValidationError(
      "INVALID_TARGET",
      `Invalid slotIndexInRound ${target.slotIndexInRound} for bracket size ${bracketSize}`,
    );
  }
  if (target.side === "A") {
    return leftSeed;
  }
  if (target.side === "B") {
    return rightSeed;
  }
  throw new QualificationMappingValidationError("INVALID_TARGET", "Side must be A or B");
}

function expandQualifierSlots(
  groups: GenerateDefaultGroupRankMappingsInput["groups"],
  qualifiersPerGroup: number,
): GroupRankQualifierSlot[] {
  if (qualifiersPerGroup < 1) {
    throw new QualificationMappingValidationError(
      "INVALID_RANK",
      "qualifiersPerGroup must be >= 1",
    );
  }
  const slots: GroupRankQualifierSlot[] = [];
  for (let rank = 1; rank <= qualifiersPerGroup; rank++) {
    for (const group of groups) {
      slots.push({
        sourceGroupId: group.id,
        groupDisplayOrder: group.displayOrder,
        rank,
      });
    }
  }
  return slots;
}

function pairScore(a: GroupRankQualifierSlot, b: GroupRankQualifierSlot): number {
  let score = 0;
  if (a.sourceGroupId !== b.sourceGroupId) {
    score += 1000;
  }
  if (a.rank !== b.rank) {
    score += 100;
  }
  score -= a.groupDisplayOrder + b.groupDisplayOrder + a.rank + b.rank;
  return score;
}

function assignQualifiersToSeedsDeterministic(
  qualifiers: GroupRankQualifierSlot[],
  bracketSize: number,
  entrantCount: number,
): Map<number, GroupRankQualifierSlot> {
  const seedOrder = buildBracketSeedOrder(bracketSize);
  const firstRoundSlots = bracketSize / 2;
  const remaining = [...qualifiers];
  const seedAssignment = new Map<number, GroupRankQualifierSlot>();

  for (let slot = 0; slot < firstRoundSlots; slot++) {
    const seedA = seedOrder[slot * 2]!;
    const seedB = seedOrder[slot * 2 + 1]!;
    const aReal = seedA <= entrantCount;
    const bReal = seedB <= entrantCount;
    if (!aReal && !bReal) {
      continue;
    }
    if (aReal && !bReal) {
      const picked = remaining.shift();
      if (!picked) {
        throw new QualificationMappingValidationError(
          "INCOMPLETE_MAPPING",
          "Not enough qualifiers for seed assignment",
        );
      }
      seedAssignment.set(seedA, picked);
      continue;
    }
    if (!aReal && bReal) {
      const picked = remaining.shift();
      if (!picked) {
        throw new QualificationMappingValidationError(
          "INCOMPLETE_MAPPING",
          "Not enough qualifiers for seed assignment",
        );
      }
      seedAssignment.set(seedB, picked);
      continue;
    }

    let bestIdxA = -1;
    let bestIdxB = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      for (let j = 0; j < remaining.length; j++) {
        if (i === j) {
          continue;
        }
        const score = pairScore(remaining[i]!, remaining[j]!);
        if (score > bestScore) {
          bestScore = score;
          bestIdxA = i;
          bestIdxB = j;
        }
      }
    }
    if (bestIdxA < 0 || bestIdxB < 0) {
      throw new QualificationMappingValidationError(
        "INCOMPLETE_MAPPING",
        "Unable to assign qualifier pair for knockout seeds",
      );
    }
    const qA = remaining[bestIdxA]!;
    const qB = remaining[bestIdxB]!;
    seedAssignment.set(seedA, qA);
    seedAssignment.set(seedB, qB);
    const removeHigh = Math.max(bestIdxA, bestIdxB);
    const removeLow = Math.min(bestIdxA, bestIdxB);
    remaining.splice(removeHigh, 1);
    remaining.splice(removeLow, 1);
  }

  if (remaining.length > 0) {
    throw new QualificationMappingValidationError(
      "INCOMPLETE_MAPPING",
      "Unassigned qualifiers remain after seed assignment",
    );
  }
  return seedAssignment;
}

export function generateDefaultGroupRankMappingsPure(
  input: GenerateDefaultGroupRankMappingsInput,
): GenerateDefaultGroupRankMappingsResult {
  const groups = [...input.groups].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.id.localeCompare(b.id);
  });
  if (groups.length === 0) {
    throw new QualificationMappingValidationError(
      "STRUCTURAL_CONFLICT",
      "At least one group is required for default qualification mapping",
    );
  }

  const qualifiers = expandQualifierSlots(groups, input.qualifiersPerGroup);
  const entrantCount = qualifiers.length;
  if (entrantCount < 2) {
    throw new QualificationMappingValidationError(
      "STRUCTURAL_CONFLICT",
      "Knockout qualification requires at least two entrants",
    );
  }

  const bracketSize = smallestPowerOfTwoGte(entrantCount);
  const seedAssignment = assignQualifiersToSeedsDeterministic(
    qualifiers,
    bracketSize,
    entrantCount,
  );

  const mappings: GroupRankToKnockoutEntryMapping[] = [];
  for (const [seed, slot] of [...seedAssignment.entries()].sort((a, b) => a[0] - b[0])) {
    const target = seedIndexToStructuralTarget(bracketSize, seed);
    mappings.push({
      source: { sourceGroupId: slot.sourceGroupId, rank: slot.rank },
      target,
    });
  }

  mappings.sort((a, b) => {
    if (a.target.slotIndexInRound !== b.target.slotIndexInRound) {
      return a.target.slotIndexInRound - b.target.slotIndexInRound;
    }
    return a.target.side === "A" ? -1 : 1;
  });

  return {
    policy: AUTOMATIC_GROUP_RANK_PAIRING_POLICY,
    mappings,
    entrantCount,
    bracketSize,
  };
}

export function validateGroupRankMappingsPure(input: {
  mappings: readonly GroupRankToKnockoutEntryMapping[];
  entrantCount: number;
  groupParticipantCountById: ReadonlyMap<string, number>;
}): void {
  const seenSources = new Set<string>();
  const seenTargets = new Set<string>();
  const bracketSize = smallestPowerOfTwoGte(input.entrantCount);

  for (const mapping of input.mappings) {
    if (mapping.source.rank < 1) {
      throw new QualificationMappingValidationError(
        "INVALID_RANK",
        "GROUP_RANK rank must be >= 1",
      );
    }
    const sourceKey = groupRankKey(mapping.source.sourceGroupId, mapping.source.rank);
    if (seenSources.has(sourceKey)) {
      throw new QualificationMappingValidationError(
        "DUPLICATE_SOURCE",
        `Duplicate GROUP_RANK mapping for ${sourceKey}`,
      );
    }
    seenSources.add(sourceKey);

    const participantCount = input.groupParticipantCountById.get(mapping.source.sourceGroupId);
    if (participantCount != null && mapping.source.rank > participantCount) {
      throw new QualificationMappingValidationError(
        "IMPOSSIBLE_RANK",
        `Rank ${mapping.source.rank} exceeds group participant count ${participantCount}`,
      );
    }

    if (mapping.target.roundIndex !== 0) {
      throw new QualificationMappingValidationError(
        "INVALID_TARGET",
        "GROUP_RANK targets must be first-round structural entry sides (roundIndex 0)",
      );
    }

    const seed = structuralTargetToSeedIndex(bracketSize, mapping.target);
    if (seed > input.entrantCount) {
      throw new QualificationMappingValidationError(
        "INVALID_TARGET",
        "GROUP_RANK target maps to a BYE-only seed slot",
      );
    }

    const targetKey = `${mapping.target.roundIndex}:${mapping.target.slotIndexInRound}:${mapping.target.side}`;
    if (seenTargets.has(targetKey)) {
      throw new QualificationMappingValidationError(
        "DUPLICATE_TARGET",
        `Duplicate knockout entry target ${targetKey}`,
      );
    }
    seenTargets.add(targetKey);
  }

  if (seenSources.size !== input.entrantCount) {
    throw new QualificationMappingValidationError(
      "INCOMPLETE_MAPPING",
      `Expected ${input.entrantCount} GROUP_RANK mappings but received ${seenSources.size}`,
    );
  }
}

export function buildKnockoutEntrantOrderFromMappingsPure(
  input: BuildKnockoutEntrantOrderInput,
): BuildKnockoutEntrantOrderResult {
  const bracketSize = smallestPowerOfTwoGte(input.entrantCount);
  validateGroupRankMappingsPure({
    mappings: input.mappings,
    entrantCount: input.entrantCount,
    groupParticipantCountById: new Map(),
  });

  const entrants: KnockoutEntrantInput[] = new Array(input.entrantCount);

  for (const mapping of input.mappings) {
    const qualId = input.qualificationSourceIdByGroupRank.get(
      groupRankKey(mapping.source.sourceGroupId, mapping.source.rank),
    );
    if (!qualId) {
      throw new QualificationMappingValidationError(
        "INCOMPLETE_MAPPING",
        `Missing qualification source for ${mapping.source.sourceGroupId} rank ${mapping.source.rank}`,
      );
    }
    const seed = structuralTargetToSeedIndex(bracketSize, mapping.target);
    entrants[seed - 1] = {
      kind: "QUALIFICATION_REFERENCE",
      qualificationSourceId: qualId,
    };
  }

  for (let i = 0; i < entrants.length; i++) {
    if (entrants[i] == null) {
      throw new QualificationMappingValidationError(
        "INCOMPLETE_MAPPING",
        `No GROUP_RANK mapping assigned to knockout seed ${i + 1}`,
      );
    }
  }

  return {
    entrants: entrants as Extract<KnockoutEntrantInput, { kind: "QUALIFICATION_REFERENCE" }>[],
    bracketSize,
  };
}

export function mappingFingerprint(mappings: readonly GroupRankToKnockoutEntryMapping[]): string {
  const normalized = [...mappings]
    .map((m) => ({
      g: m.source.sourceGroupId,
      r: m.source.rank,
      t: `${m.target.roundIndex}:${m.target.slotIndexInRound}:${m.target.side}`,
    }))
    .sort((a, b) => {
      if (a.t !== b.t) {
        return a.t.localeCompare(b.t);
      }
      if (a.g !== b.g) {
        return a.g.localeCompare(b.g);
      }
      return a.r - b.r;
    });
  return JSON.stringify(normalized);
}

export function firstRoundPairGroups(
  mappings: readonly GroupRankToKnockoutEntryMapping[],
): { slotIndexInRound: number; sourceGroupIds: string[] }[] {
  const bySlot = new Map<number, GroupRankToKnockoutEntryMapping[]>();
  for (const mapping of mappings) {
    const list = bySlot.get(mapping.target.slotIndexInRound) ?? [];
    list.push(mapping);
    bySlot.set(mapping.target.slotIndexInRound, list);
  }
  return [...bySlot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slotIndexInRound, entries]) => ({
      slotIndexInRound,
      sourceGroupIds: entries
        .sort((a, b) => a.target.side.localeCompare(b.target.side))
        .map((e) => e.source.sourceGroupId),
    }));
}
