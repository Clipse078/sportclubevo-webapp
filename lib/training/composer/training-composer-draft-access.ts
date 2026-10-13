export function resolveTrainingComposerTitleForResume(title: string | undefined | null): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  return "Training (Entwurf)";
}
