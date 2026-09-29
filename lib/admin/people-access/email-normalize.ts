/**
 * Tenant-safe email normalization for People & Access identity lookup.
 * Trims whitespace, lowercases domain, preserves local-part (except trim).
 */

const CONTROL_OR_INLINE_SPACE = /[\s\u0000-\u001F\u007F]/;

export function normalizePeopleAccessEmail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).trim().toLowerCase();
  return `${local}@${domain}`;
}

export function emailHasIllegalWhitespace(raw: string): boolean {
  return CONTROL_OR_INLINE_SPACE.test(raw);
}
