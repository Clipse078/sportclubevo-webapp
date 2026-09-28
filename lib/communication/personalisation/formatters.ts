/**
 * SCE-COMM-EVO-06 — typed presentation formatters (never persisted as source truth).
 */

export function escapePersonalisationPlainText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatSwissDate(
  date: Date,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function formatSwissTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatSwissDateTime(date: Date, timeZone: string): string {
  return `${formatSwissDate(date, timeZone)} ${formatSwissTime(date, timeZone)}`;
}

export type PostalAddressParts = {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  freeformLine?: string | null;
};

/** Central formatter — skips empty parts, avoids malformed commas. */
export function formatFullPostalAddress(parts: PostalAddressParts): string | null {
  if (parts.freeformLine?.trim()) {
    return parts.freeformLine.trim();
  }
  const streetLine = [parts.street?.trim(), parts.houseNumber?.trim()].filter(Boolean).join(" ");
  const cityLine = [parts.postalCode?.trim(), parts.city?.trim()].filter(Boolean).join(" ");
  const lines = [streetLine, cityLine, parts.country?.trim()].filter(Boolean);
  if (lines.length === 0) return null;
  return lines.join("\n");
}

export function formatDeterministicList(items: readonly string[]): string | null {
  const unique = [...new Set(items.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  return unique.join(", ");
}

export function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName?: string | null;
}): string {
  const display = input.displayName?.trim();
  if (display) return display;
  return `${input.firstName} ${input.lastName}`.trim();
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
