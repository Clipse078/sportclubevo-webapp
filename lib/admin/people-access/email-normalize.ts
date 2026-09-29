/**
 * Tenant-safe email normalization for People & Access identity lookup.
 * Matches canonical lowercase trimming used across communication eligibility.
 */

export function normalizePeopleAccessEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
