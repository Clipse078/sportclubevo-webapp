/**
 * SCE Infoboard V2 R10 — training participant row density (independent of page density).
 *
 * Controls crest scale, identity typography, and row spacing for multi-team
 * training cohorts. Does not alter the global four-column venue grid.
 */

export const TRAINING_PARTICIPANT_DENSITY_ATTR =
  "data-training-participant-density";

/** Shared N-row track model — ACTIVITY / KABINE / PLATZ stay index-aligned. */
export const TRAINING_ROW_COUNT_ATTR = "data-training-row-count";
export const TRAINING_ROW_COUNT_VAR = "--ib-training-row-count";
export const TRAINING_ROW_MIN_VAR = "--ib-training-row-min";

export const TRAINING_PARTICIPANT_DENSITIES = [
  "spacious",
  "standard",
  "compact",
  "dense",
] as const;

export type TrainingParticipantDensity =
  (typeof TRAINING_PARTICIPANT_DENSITIES)[number];

export function resolveTrainingParticipantDensity(
  participantCount: number,
): TrainingParticipantDensity {
  if (participantCount <= 2) return "spacious";
  if (participantCount <= 4) return "standard";
  if (participantCount <= 6) return "compact";
  return "dense";
}

/** Crest clamp per training participant density (before page-density scaling). */
export const TRAINING_PARTICIPANT_LOGO_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(3.75rem, 4.85vw, 5.35rem)",
  standard: "clamp(3.25rem, 4.05vw, 4.5rem)",
  compact: "clamp(2.85rem, 3.55vw, 4rem)",
  dense: "clamp(2.55rem, 3.15vw, 3.65rem)",
};

/** Single-team training — XL team line (R11 distance readability). */
export const TRAINING_SINGLE_TEAM_NAME_CLAMP = "clamp(2.35rem, 3.15vw, 3.75rem)" as const;

/** Club line typography per density (context when stacked). */
export const TRAINING_PARTICIPANT_CLUB_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(1.15rem, 1.45vw, 1.55rem)",
  standard: "clamp(1.08rem, 1.32vw, 1.45rem)",
  compact: "clamp(1rem, 1.22vw, 1.35rem)",
  dense: "clamp(0.95rem, 1.12vw, 1.28rem)",
};

/** Team line typography per density — R11 signage scale. */
export const TRAINING_PARTICIPANT_TEAM_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(1.45rem, 1.85vw, 2.05rem)",
  standard: "clamp(1.32rem, 1.65vw, 1.85rem)",
  compact: "clamp(1.22rem, 1.52vw, 1.72rem)",
  dense: "clamp(1.12rem, 1.38vw, 1.58rem)",
};

export const TRAINING_PARTICIPANT_ROW_GAP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(8px, 0.85vh, 14px)",
  standard: "clamp(6px, 0.7vh, 11px)",
  compact: "clamp(4px, 0.55vh, 8px)",
  dense: "clamp(3px, 0.45vh, 6px)",
};
