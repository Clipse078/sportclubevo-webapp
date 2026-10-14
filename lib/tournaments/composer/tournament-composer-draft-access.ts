export function resolveTournamentComposerTitleForResume(title: string | undefined | null): string {
  const trimmed = title?.trim();
  return trimmed || "Turnier (Entwurf)";
}
