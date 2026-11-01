/**
 * SCE Infoboard V2 R6/R7 — tournament participant grid density (independent of page density).
 *
 * Controls participant column layout, crest scale, and name typography inside ACTIVITY.
 * Does not alter the global TIME | ACTIVITY | KABINE | PLATZ card grid.
 */

/** Canonical max participants per row at 1920×1080 activity width (R7). */
export const TOURNAMENT_MAX_PARTICIPANTS_PER_ROW = 4;

export const TOURNAMENT_PARTICIPANT_DENSITY_ATTR =
  "data-tournament-participant-density";

export const TOURNAMENT_PARTICIPANT_DENSITIES = [
  "large",
  "medium",
  "compact",
] as const;

export type TournamentParticipantDensity =
  (typeof TOURNAMENT_PARTICIPANT_DENSITIES)[number];

/** CSS custom property for participant grid column count. */
export const TOURNAMENT_PARTICIPANT_COLUMNS_VAR =
  "--ib-tournament-participant-columns";

/** Crest size token per participant density (before page-density scaling). */
export const TOURNAMENT_PARTICIPANT_LOGO_CLAMP: Record<
  TournamentParticipantDensity,
  string
> = {
  large: "clamp(3.625rem, 4.5vw, 4.5rem)",
  medium: "clamp(3.25rem, 4vw, 4.125rem)",
  compact: "clamp(2.75rem, 3.4vw, 3.625rem)",
};

/** Participant name typography per density (supporting identification). */
export const TOURNAMENT_PARTICIPANT_NAME_CLAMP: Record<
  TournamentParticipantDensity,
  string
> = {
  large: "clamp(1.125rem, 1.35vw, 1.3125rem)",
  medium: "clamp(1rem, 1.22vw, 1.2rem)",
  compact: "clamp(0.92rem, 1.12vw, 1.05rem)",
};

export function resolveTournamentParticipantDensity(
  participantCount: number,
): TournamentParticipantDensity {
  if (participantCount <= 3) return "large";
  if (participantCount === 4) return "medium";
  return "compact";
}

/**
 * Per-row slot counts (e.g. 5 → [4, 1], 8 → [4, 4]).
 */
export function tournamentParticipantRowPattern(
  participantCount: number,
): readonly number[] {
  if (participantCount <= 0) return [];
  const rows = Math.ceil(participantCount / TOURNAMENT_MAX_PARTICIPANTS_PER_ROW);
  const pattern: number[] = [];
  let remaining = participantCount;
  for (let row = 0; row < rows; row++) {
    const slots = Math.min(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW, remaining);
    pattern.push(slots);
    remaining -= slots;
  }
  return pattern;
}

/**
 * Deterministic equal-column grid — max four participants per row (R7).
 */
export function resolveTournamentParticipantGrid(participantCount: number): {
  readonly columns: number;
  readonly rows: number;
} {
  if (participantCount <= 0) return { columns: 0, rows: 0 };
  if (participantCount <= TOURNAMENT_MAX_PARTICIPANTS_PER_ROW) {
    return { columns: participantCount, rows: 1 };
  }
  return {
    columns: TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
    rows: Math.ceil(participantCount / TOURNAMENT_MAX_PARTICIPANTS_PER_ROW),
  };
}

/** Display rows for pagination demand — mirrors resolved grid rows. */
export function tournamentParticipantDisplayRows(participantCount: number): number {
  return resolveTournamentParticipantGrid(participantCount).rows;
}
