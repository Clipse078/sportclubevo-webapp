export function resolveMatchComposerTitleForResume(
  teamDisplayName: string | undefined | null,
  opponentLabel: string | undefined | null,
): string {
  const team = teamDisplayName?.trim();
  const opponent = opponentLabel?.trim();
  if (team && opponent) return `${team} vs. ${opponent}`;
  if (opponent) return `Spiel vs. ${opponent}`;
  return "Spiel (Entwurf)";
}
