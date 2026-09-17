/** Platform fallbacks when tenant has no override for an operational event kind. */
export const SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES = 120 as const;
export const SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES = 90 as const;
export const SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES = 120 as const;

/** Upper bound for club-configured standard durations (minutes). */
export const MAX_TENANT_OPERATIONAL_DURATION_MINUTES = 480 as const;

export type OperationalDurationKind = "MATCH" | "TRAINING" | "TOURNAMENT";

export const SCE_PLATFORM_DEFAULT_OPERATIONAL_DURATION_MINUTES: Record<
  OperationalDurationKind,
  number
> = {
  MATCH: SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
  TRAINING: SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES,
  TOURNAMENT: SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
};
