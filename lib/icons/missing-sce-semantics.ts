/**
 * Domain concepts that still lack an approved SCE master (artwork freeze).
 * SCE-ICONS-13: all previously tracked semantics now have approved masters.
 */

export type MissingSceSemantic = {
  concept: string;
  currentIcon: string;
  files: string[];
  surfaces: string[];
  frequency: number;
  recommendedMaster: string;
  reason: string;
};

export const MISSING_SCE_SEMANTICS: MissingSceSemantic[] = [];

export function missingSceSemanticConcepts(): Set<string> {
  return new Set(MISSING_SCE_SEMANTICS.map((row) => row.concept));
}
