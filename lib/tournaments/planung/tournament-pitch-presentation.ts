/**
 * TournamentPitch column labels for Planung / Spielplan surfaces.
 * Tournament Planner 02 may supply playing-format metadata without renaming pitches.
 */

export function resolveTournamentPitchColumnPresentation(input: {
  label: string;
  playingFormatLabel?: string | null;
}): { label: string; formatHint: string | null } {
  const label = input.label.trim() || "Feld";
  const formatHint = input.playingFormatLabel?.trim() || null;
  return { label, formatHint };
}
