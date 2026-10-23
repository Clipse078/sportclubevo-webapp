import { formatFinanceYearDateInputValue } from "@/lib/finance/setup/finance-year-date-input";

const periodFormatterCache = new Map<string, Intl.DateTimeFormat>();

function periodFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = periodFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
    periodFormatterCache.set(locale, formatter);
  }
  return formatter;
}

/** User-facing FinanceYear period label from ISO date input values (UTC calendar days). */
export function formatFinanceYearPeriodLabel(
  startDateIso: string,
  endDateIso: string,
  locale: string,
): string {
  const start = new Date(`${startDateIso}T00:00:00.000Z`);
  const end = new Date(`${endDateIso}T00:00:00.000Z`);
  const startLabel = periodFormatter(locale).format(start);
  const endLabel = periodFormatter(locale).format(end);
  return `${startLabel} – ${endLabel}`;
}

/** Re-export for settings rows that already hold Date objects server-side. */
export function formatFinanceYearPeriodLabelFromDates(
  startDate: Date,
  endDate: Date,
  locale: string,
): string {
  return formatFinanceYearPeriodLabel(
    formatFinanceYearDateInputValue(startDate),
    formatFinanceYearDateInputValue(endDate),
    locale,
  );
}
