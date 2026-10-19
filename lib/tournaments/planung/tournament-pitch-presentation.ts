/**
 * TournamentPitch column labels for Planung / Spielplan surfaces.
 * Tournament Planner 02 supplies optional playing-format metadata without renaming pitches.
 */

import { resolvePlayingFormatColumnHint } from "@/lib/tournament-scheduling/playing-format-presentation";

export function resolveTournamentPitchColumnPresentation(input: {
  label: string;
  playersPerSide?: number | null;
  /** Legacy override — prefer playersPerSide when both supplied. */
  playingFormatLabel?: string | null;
}): { label: string; formatHint: string | null } {
  const label = input.label.trim() || "Feld";
  const fromPlayers =
    input.playersPerSide !== undefined
      ? resolvePlayingFormatColumnHint(input.playersPerSide)
      : null;
  const legacyHint = input.playingFormatLabel?.trim() || null;
  const formatHint = fromPlayers ?? legacyHint;
  return { label, formatHint };
}
