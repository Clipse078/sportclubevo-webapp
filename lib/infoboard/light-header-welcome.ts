/**
 * Presentation-only compact welcome for venue-display LIGHT header inline zone.
 * Derives shorter copy from configured board subtitle text — no hardcoded venues.
 */

function titleCaseWord(word: string): string {
  if (word.length === 0) return word;
  const lower = word.toLowerCase();
  if (lower === "brüel" || lower === "bruel") return "Brüel";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Maps long uppercase kiosk welcome strings to a calmer inline header line for LIGHT.
 * When no safe derivation exists, returns the trimmed configured text without forced uppercase.
 */
export function resolveLightInlineWelcome(subtitleText: string): string {
  const trimmed = subtitleText.trim();
  if (trimmed.length === 0) return trimmed;

  const imVenueMatch =
    trimmed.match(/SPORTANLAGE\s+IM\s+([A-ZÄÖÜß]+)/i) ??
    trimmed.match(/\bIM\s+([A-ZÄÖÜß]+)\b/i);

  if (imVenueMatch && /willkommen/i.test(trimmed)) {
    const venue = titleCaseWord(imVenueMatch[1] ?? "");
    if (venue.length > 0) {
      return `Willkommen im ${venue}`;
    }
  }

  if (trimmed === trimmed.toUpperCase() && trimmed.length > 24) {
    return trimmed
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  }

  return trimmed;
}
