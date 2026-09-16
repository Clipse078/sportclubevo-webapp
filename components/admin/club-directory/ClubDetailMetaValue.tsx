/**
 * Formats optional club metadata for display (avoids dominant "-" placeholders).
 */
export function formatClubMetaValue(
  value: string | null | undefined,
  emptyLabel = "Nicht hinterlegt",
): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "-") return emptyLabel;
  return trimmed;
}
