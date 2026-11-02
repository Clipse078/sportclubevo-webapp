/**
 * SCE Infoboard V2 R10 / R11R3 — training participant row density (independent of page density).
 *
 * Density compresses whitespace (row gap, padding, secondary metadata).
 * Training identity scale (crest + primary team name) is canonical — not density-driven.
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

/** R11R4 — canonical training crest (~22% below R11R3; density-invariant). */
export const TRAINING_IDENTITY_CREST_SIZE_VAR = "--ib-training-identity-crest-size" as const;

/** R11R3 approved baseline — regression comparison only. */
export const TRAINING_R11R3_IDENTITY_CREST_BASELINE_CLAMP =
  "clamp(4.25rem, 5.5vw, 6.25rem)" as const;

export const TRAINING_CANONICAL_IDENTITY_CREST_CLAMP =
  "clamp(3.2rem, 4.1vw, 4.75rem)" as const;

/** @deprecated R11R3 — all tiers resolve to the canonical crest clamp. */
export const TRAINING_PARTICIPANT_LOGO_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
  standard: TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
  compact: TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
  dense: TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
};

/** R11R3 — canonical primary team name (density-invariant). */
export const TRAINING_TEAM_NAME_SIZE_VAR = "--ib-training-team-name-size" as const;

export const TRAINING_CANONICAL_TEAM_NAME_CLAMP =
  "clamp(2.35rem, 3.15vw, 3.75rem)" as const;

/** Single-team training alias — same canonical team line. */
export const TRAINING_SINGLE_TEAM_NAME_CLAMP = TRAINING_CANONICAL_TEAM_NAME_CLAMP;

export const TRAINING_DENSITY_CHANGES_IDENTITY_SCALE = false as const;

export const TRAINING_DENSITY_MAY_COMPRESS_WHITESPACE = true as const;

/**
 * R11R2 — minimum team-name scale on dense multi-training cards (~ pitch-badge parity).
 * Must stay at or above this floor when density tiers scale down.
 */
export const TRAINING_TEAM_NAME_MIN_READABLE_REM = 1.55 as const;

/** R11R2 — minimum pitch-badge text on dense multi-training cards. */
export const TRAINING_PITCH_NAME_MIN_READABLE_REM = 1.12 as const;

/** Pitch-badge parity reference (KUNSTRASEN 2 A class labels). */
export const TRAINING_TEAM_PITCH_PARITY_CLAMP =
  "clamp(1.5rem, 1.85vw, 2.75rem)" as const;

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

/** @deprecated R11R3 — all tiers resolve to the canonical team-name clamp. */
export const TRAINING_PARTICIPANT_TEAM_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: TRAINING_CANONICAL_TEAM_NAME_CLAMP,
  standard: TRAINING_CANONICAL_TEAM_NAME_CLAMP,
  compact: TRAINING_CANONICAL_TEAM_NAME_CLAMP,
  dense: TRAINING_CANONICAL_TEAM_NAME_CLAMP,
};

/** Multi-training pitch badge text per participant density (badge geometry unchanged). */
export const TRAINING_PARTICIPANT_PITCH_CLAMP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(1.22rem, 1.65vw, 2.05rem)",
  standard: "clamp(1.18rem, 1.58vw, 1.95rem)",
  compact: "clamp(1.12rem, 1.48vw, 1.82rem)",
  dense: "clamp(1.12rem, 1.38vw, 1.72rem)",
};

export const TRAINING_PARTICIPANT_ROW_GAP: Record<
  TrainingParticipantDensity,
  string
> = {
  spacious: "clamp(8px, 0.85vh, 14px)",
  standard: "clamp(5px, 0.6vh, 9px)",
  compact: "clamp(2px, 0.35vh, 5px)",
  dense: "clamp(1px, 0.25vh, 4px)",
};
