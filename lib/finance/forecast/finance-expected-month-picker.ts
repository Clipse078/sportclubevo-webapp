/**
 * FIN-04E-07R3 — month-only picker helpers (calendar date, no timezone).
 */

export type FinanceMonthPickerMonthOption = {
  monthIndex: number;
  label: string;
  value: string;
};

export function financeMonthPickerValueFromIso(expectedMonthStartIso: string): string {
  return expectedMonthStartIso.slice(0, 7);
}

export function financeMonthPickerIsoFromValue(value: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}-01`;
}

export function buildFinanceMonthPickerMonthOptions(input: {
  year: number;
  formattingLocale: string;
}): FinanceMonthPickerMonthOption[] {
  const options: FinanceMonthPickerMonthOption[] = [];
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const value = `${input.year}-${month}`;
    const label = new Intl.DateTimeFormat(input.formattingLocale, {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(input.year, monthIndex, 1)));
    options.push({ monthIndex, label, value });
  }
  return options;
}

export function formatFinanceMonthPickerDisplayValue(input: {
  monthValue: string;
  formattingLocale: string;
}): string {
  const iso = financeMonthPickerIsoFromValue(input.monthValue);
  if (!iso) return "";
  const [year, month] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(input.formattingLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function resolveFinanceMonthPickerYear(monthValue: string, fallbackYear: number): number {
  const match = /^(\d{4})-/.exec(monthValue.trim());
  if (match) return Number(match[1]);
  return fallbackYear;
}
