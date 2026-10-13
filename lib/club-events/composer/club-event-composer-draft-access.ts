export function resolveClubEventComposerTitleForResume(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : "Veranstaltungsentwurf bearbeiten";
}
