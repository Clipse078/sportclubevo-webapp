/**
 * Canonical PlayingFormat display helpers (Tournament Planner 02B).
 * Scheduling semantics use the integer playersPerSide; labels are derived only.
 */

import { formatPlayersPerSideDisplayLabel } from "./tournament-programme-architecture";

/** Compact sporting notation for dense UI (Planung columns, matrix headers). */
export function formatPlayingFormatCompactLabel(playersPerSide: number): string {
  return formatPlayersPerSideDisplayLabel(playersPerSide);
}

/** Localized accessible label for forms and screen readers. */
export function formatPlayingFormatAccessibleLabel(playersPerSide: number): string {
  return `${playersPerSide} gegen ${playersPerSide}`;
}

/** Creator / settings copy for configured formats. */
export function formatPlayingFormatCreatorSummary(playersPerSide: number): string {
  return formatPlayingFormatAccessibleLabel(playersPerSide);
}

export const PLAYING_FORMAT_UNSPECIFIED_CREATOR_LABEL = "Nicht festgelegt";

/** Common presets — not an exhaustive legal set (any validated integer is allowed). */
export const COMMON_PLAYING_FORMAT_PRESETS = [3, 4, 5, 6, 7, 9, 11] as const;

export function resolvePlayingFormatCompactLabel(
  playersPerSide: number | null | undefined,
): string | null {
  if (playersPerSide == null) return null;
  return formatPlayingFormatCompactLabel(playersPerSide);
}

export function resolvePlayingFormatColumnHint(
  playersPerSide: number | null | undefined,
): string | null {
  return resolvePlayingFormatCompactLabel(playersPerSide);
}
