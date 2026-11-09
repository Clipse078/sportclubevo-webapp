/**
 * SCE-DS2-06R1 — container-aware stacked match fixture layout (no overflow-wrap: anywhere).
 */

export const SCE_MATCH_STACKED_FIXTURE_CONTAINER_NAME = "sce-match-stacked-fixture" as const;

/** Narrow columns switch from 3-up grid to compact rows (crests stay visible). */
export const SCE_MATCH_STACKED_FIXTURE_COMPACT_MAX_CQI = "18rem" as const;

/** Ultra-narrow cells stack crest above name per side. */
export const SCE_MATCH_STACKED_FIXTURE_ULTRA_COMPACT_MAX_CQI = "11rem" as const;

export const SCE_MATCH_STACKED_FIXTURE_LAYOUT_ATTR = "data-sce-match-fixture-layout" as const;
