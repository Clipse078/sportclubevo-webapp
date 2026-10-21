/**
 * SCE activity card family — temporal information grammar (DS-10 R2).
 *
 * Where a dedicated left date block exists, it represents calendar/date identity only
 * (weekday abbreviation, numeric day, month abbreviation). Start time and ranges belong
 * in content metadata (context zone, schedule rows, list-row operational meta).
 */
export const SCE_ACTIVITY_DATE_BLOCK_CONTRACT = {
  DATE_BLOCK_DATE_ONLY: "YES",
  DATE_BLOCK_TIME_ALLOWED: "NO",
  TIME_PRESENTED_AS_SEPARATE_ACTIVITY_METADATA: "YES",
  UNJUSTIFIED_TEMPORAL_DUPLICATION_ALLOWED: "NO",
} as const;

export const SCE_ACTIVITY_TEMPORAL_INFORMATION_GRAMMAR = {
  TEMPORAL_INFORMATION_GRAMMAR_CANONICAL: "YES",
  DATE_AND_TIME_SEMANTICS_SEPARATED: "YES",
  /** Compact inline date+time allowed when no dedicated date block is rendered. */
  COMPACT_COMBINED_DATE_TIME_WITHOUT_DATE_BLOCK: "YES",
} as const;

export const SCE_ACTIVITY_CARD_FAMILY_TEMPORAL = {
  ONE_ACTIVITY_CARD_FAMILY: "YES",
  IDENTICAL_ACTIVITY_LAYOUT_REQUIRED: "NO",
  DOMAIN_SPECIFIC_COMPOSITION_PRESERVED: "YES",
  SHARED_TEMPORAL_GRAMMAR: "YES",
} as const;
