/** Defensive platform fallback when tenant policy is unset — not an intrinsic Match duration. */
export const SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES = 120 as const;

/** Upper bound for club-configured standard Match duration (minutes). */
export const MAX_TENANT_MATCH_DURATION_MINUTES = 480 as const;
