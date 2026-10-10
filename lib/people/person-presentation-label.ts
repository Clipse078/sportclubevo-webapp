/**
 * SCE Person workspace — optional label normalization for badges/chips/pills.
 * Empty, null, undefined, and whitespace-only values must not render as pills.
 */
export function normalizeOptionalPresentationLabel(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
