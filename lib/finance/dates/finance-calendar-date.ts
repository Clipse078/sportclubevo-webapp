import { FinanceDomainError } from "@/lib/finance/errors";

/** Parse YYYY-MM-DD as UTC calendar midnight (no timezone shift on financial dates). */
export function parseFinanceCalendarDateIso(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_DATE",
      "Forecast revision dates must be ISO calendar dates (YYYY-MM-DD).",
    );
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

export function formatFinanceCalendarDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDayMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isFinanceCalendarDateWithinInclusiveRange(
  date: Date,
  startDate: Date,
  endDate: Date,
): boolean {
  const day = utcDayMs(date);
  return day >= utcDayMs(startDate) && day <= utcDayMs(endDate);
}

export function assertFinanceCalendarDateWithinFinanceYear(
  date: Date,
  financeYear: { startDate: Date; endDate: Date },
  label: string,
): void {
  if (
    !isFinanceCalendarDateWithinInclusiveRange(
      date,
      financeYear.startDate,
      financeYear.endDate,
    )
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_DATE",
      `${label} must fall within the tenant financial year.`,
    );
  }
}
