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
  large: "clamp(2.85rem, 3.55vw, 4.35rem)",
  medium: "clamp(2.35rem, 2.95vw, 3.55rem)",
  compact: "clamp(1.95rem, 2.45vw, 2.95rem)",
};

/** Participant name typography per density (supporting identification). */
export const TOURNAMENT_PARTICIPANT_NAME_CLAMP: Record<
  TournamentParticipantDensity,
  string
> = {
  large: "clamp(0.78rem, 1.02vw, 1.18rem)",
  medium: "clamp(0.72rem, 0.92vw, 1.05rem)",
  compact: "clamp(0.66rem, 0.85vw, 0.98rem)",
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
