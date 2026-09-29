/** Coerce RSC-serialized ISO strings back to Date for client UI. */
export function coerceToDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatPeopleAccessDate(
  value: Date | string | null | undefined,
  locale = "de-CH",
): string {
  const d = coerceToDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(locale);
}

export function formatPeopleAccessDateTime(
  value: Date | string | null | undefined,
  locale = "de-CH",
): string {
  const d = coerceToDate(value);
  if (!d) return "—";
  return d.toLocaleString(locale);
}
