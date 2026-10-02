/**
 * Derives a compact fallback label (initials) for club/team identity when no crest URL exists.
 * Presentation-only — never used to infer domain identifiers.
 */

export function deriveClubIdentityFallbackLabel(
  displayName: string,
  shortName?: string | null,
): string {
  const fromShort = shortName?.trim();
  if (fromShort && fromShort.length <= 4 && !fromShort.includes(" ")) {
    return fromShort.slice(0, 3).toUpperCase();
  }

  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0]!.slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
