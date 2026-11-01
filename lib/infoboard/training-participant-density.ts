/**
 * SCE Infoboard V2 R10 — training participant row density (independent of page density).
 *
 * Controls crest scale, identity typography, and row spacing for multi-team
 * training cohorts. Does not alter the global four-column venue grid.
 */

export const TRAINING_PARTICIPANT_DENSITY_ATTR =
  "data-training-participant-density";

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
  spacious: "clamp(3.25rem, 4vw, 4.25rem)",
  standard: "clamp(2.85rem, 3.5vw, 3.75rem)",
  compact: "clamp(2.35rem, 2.9vw, 3.1rem)",
  dense: "clamp(2rem, 2.5vw, 2.75rem)",
};

/** Club line typography per density. */
export const TRAINING_PARTICIPANT_CLUB_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(1.15rem, 1.45vw, 1.55rem)",
  standard: "clamp(1.05rem, 1.3vw, 1.4rem)",
  compact: "clamp(0.98rem, 1.18vw, 1.25rem)",
  dense: "clamp(0.92rem, 1.1vw, 1.15rem)",
};

/** Team line typography per density — never below readable venue minimum. */
export const TRAINING_PARTICIPANT_TEAM_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(1rem, 1.25vw, 1.35rem)",
  standard: "clamp(0.95rem, 1.15vw, 1.25rem)",
  compact: "clamp(0.9rem, 1.08vw, 1.15rem)",
  dense: "clamp(0.88rem, 1.02vw, 1.08rem)",
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
