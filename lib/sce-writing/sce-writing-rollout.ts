/**
 * Rollout order for adopting `SceWritingEngine` across SCE surfaces.
 * Dokumentation + Aufgabe are wave 1 (this PR).
 */

export const SCE_WRITING_ENGINE_SURFACE_ROLLOUT = [
  "dokumentation",
  "aufgabe",
  "strategie-ziel-beschreibung",
  "cms-news-blocks",
  "personal-signature",
  "meeting-documentation",
] as const;

export type SceWritingEngineSurfaceRolloutId =
  (typeof SCE_WRITING_ENGINE_SURFACE_ROLLOUT)[number];

export const SCE_WRITING_ENGINE_WAVE_ONE: SceWritingEngineSurfaceRolloutId[] = [
  "dokumentation",
  "aufgabe",
];