import { FinanceDomainError } from "@/lib/finance/errors";

/** Tenant-owned display identity — not derived from locale, dates, or season. */
export const FINANCE_YEAR_DISPLAY_NAME_MAX_LENGTH = 120;

export function normalizeFinanceYearDisplayName(raw: string): string {
  return raw.trim();
}

export function assertValidFinanceYearDisplayName(raw: string): string {
  const name = normalizeFinanceYearDisplayName(raw);
  if (!name) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_YEAR",
      "Financial year name is required.",
    );
  }
  if (name.length > FINANCE_YEAR_DISPLAY_NAME_MAX_LENGTH) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_YEAR",
      `Financial year name must be at most ${FINANCE_YEAR_DISPLAY_NAME_MAX_LENGTH} characters.`,
    );
  }
  return name;
}
