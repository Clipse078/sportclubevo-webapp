/**
 * TournamentPitch playing-format validation (02B).
 *
 * Generic pitch rules only — optional playersPerSide with defensive bounds.
 * Future programme formats (e.g. ROTATION in 02D) may require format when
 * semantically needed; that belongs in format-specific validation, not here.
 */

import {
  isPlayersPerSideInValidationBand,
  PLAYERS_PER_SIDE_MAX,
  PLAYERS_PER_SIDE_MIN,
  PLAYERS_PER_SIDE_PRODUCT_MAX,
  TECHNICAL_BOUND_IS_PRODUCT_RULE,
} from "./tournament-programme-architecture";
import { TournamentSchedulingError } from "./errors";

export {
  PLAYERS_PER_SIDE_MIN,
  PLAYERS_PER_SIDE_MAX,
  PLAYERS_PER_SIDE_PRODUCT_MAX,
  TECHNICAL_BOUND_IS_PRODUCT_RULE,
};

/**
 * Defensive input band only: supports small-sided games through 11v11 and unusual
 * training formats without schema churn. Not a product rule that SCE only supports
 * football up to 11v11 — federation caps belong in presets / format rules later.
 */
export const PLAYERS_PER_SIDE_TECHNICAL_BOUND_JUSTIFICATION =
  "Defensive integer band (1–22) for user-entered playersPerSide: prevents garbage persistence and overflow in UI while allowing any small-sided or 11v11-style format without hard-coded enums. Not a sporting maximum.";

export type ParsedPlayersPerSide = number | null;

export function parsePlayersPerSideInput(raw: unknown): ParsedPlayersPerSide {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n)) {
      throw new TournamentSchedulingError(
        "TOURNAMENT_COMPETITION_VALIDATION",
        "Spielform muss eine ganze Zahl sein.",
      );
    }
    return assertPlayersPerSideInBand(n);
  }
  if (typeof raw === "number") {
    if (!Number.isInteger(raw)) {
      throw new TournamentSchedulingError(
        "TOURNAMENT_COMPETITION_VALIDATION",
        "Spielform muss eine ganze Zahl sein.",
      );
    }
    return assertPlayersPerSideInBand(raw);
  }
  throw new TournamentSchedulingError(
    "TOURNAMENT_COMPETITION_VALIDATION",
    "Ungültige Spielform.",
  );
}

export function assertPlayersPerSideInBand(playersPerSide: number): number {
  if (!isPlayersPerSideInValidationBand(playersPerSide)) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_COMPETITION_VALIDATION",
      `Spielform muss zwischen ${PLAYERS_PER_SIDE_MIN} und ${PLAYERS_PER_SIDE_MAX} liegen.`,
    );
  }
  return playersPerSide;
}
