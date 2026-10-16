/**
 * SCE-TOURNAMENT-PLANNER-01E3D — group → knockout qualification mapping types.
 */

import type { TournamentFixtureSideLabel } from "../competition-structure/types";

export const AUTOMATIC_GROUP_RANK_PAIRING_POLICY =
  "SCE_DETERMINISTIC_CROSS_GROUP_RANK_AWARE_SEED_ASSIGNMENT" as const;

export interface GroupRankQualificationSourceRef {
  sourceGroupId: string;
  rank: number;
}

/** Structural first-entry side in a KNOCKOUT phase (not a schedule slot). */
export interface KnockoutStructuralEntryTarget {
  roundIndex: number;
  slotIndexInRound: number;
  side: TournamentFixtureSideLabel;
}

export interface GroupRankToKnockoutEntryMapping {
  source: GroupRankQualificationSourceRef;
  target: KnockoutStructuralEntryTarget;
}

export interface GroupRankQualifierSlot {
  sourceGroupId: string;
  groupDisplayOrder: number;
  rank: number;
}

export interface GenerateDefaultGroupRankMappingsInput {
  /** Groups in ascending displayOrder. */
  groups: readonly {
    id: string;
    displayOrder: number;
  }[];
  /** Positive integer — qualifiers taken per group (same count for each group in 01E3D). */
  qualifiersPerGroup: number;
}

export interface GenerateDefaultGroupRankMappingsResult {
  policy: typeof AUTOMATIC_GROUP_RANK_PAIRING_POLICY;
  mappings: GroupRankToKnockoutEntryMapping[];
  entrantCount: number;
  bracketSize: number;
}

export interface BuildKnockoutEntrantOrderInput {
  entrantCount: number;
  /** qualificationSourceId keyed by `${groupId}:${rank}` */
  qualificationSourceIdByGroupRank: ReadonlyMap<string, string>;
  mappings: readonly GroupRankToKnockoutEntryMapping[];
}

export interface BuildKnockoutEntrantOrderResult {
  entrants: { kind: "QUALIFICATION_REFERENCE"; qualificationSourceId: string }[];
  bracketSize: number;
}

export interface ExplicitQualificationMappingInput {
  mode: "EXPLICIT";
  mappings: readonly GroupRankToKnockoutEntryMapping[];
}

export interface DefaultQualificationMappingInput {
  mode: "DEFAULT";
  qualifiersPerGroup: number;
}

export type QualificationMappingModeInput =
  | ExplicitQualificationMappingInput
  | DefaultQualificationMappingInput;
