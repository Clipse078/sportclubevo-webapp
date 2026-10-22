/**
 * FIN-01D budget planning amounts — whole major units in UI, integer minor units in storage.
 */

export function normalizeBudgetAmountInput(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function parseBudgetWholeMajorUnits(raw: string): number | null {
  const normalized = normalizeBudgetAmountInput(raw);
  if (!normalized) return null;
  const whole = Number(normalized);
  if (!Number.isSafeInteger(whole) || whole < 0) return null;
  return whole;
}

export function wholeMajorUnitsToMinor(wholeMajor: number): number {
  return wholeMajor * 100;
}

export function minorUnitsToWholeMajor(amountMinor: number): number {
  return Math.trunc(amountMinor / 100);
}

export function parseBudgetInputToMinor(raw: string): number | null {
  const whole = parseBudgetWholeMajorUnits(raw);
  if (whole === null) return null;
  return wholeMajorUnitsToMinor(whole);
}

export function budgetDraftInputFromMinor(amountMinor: number | null): string {
  if (amountMinor === null) return "";
  return String(minorUnitsToWholeMajor(amountMinor));
}

type BudgetPlanningFormatters = {
  wholeMajorNumber: Intl.NumberFormat;
  currencyWholeMajor: Intl.NumberFormat | null;
};

const formatterCache = new Map<string, BudgetPlanningFormatters>();

function formatterCacheKey(currency: string | null, locale: string): string {
  return `${locale}\u0000${currency?.toUpperCase() ?? ""}`;
}

export function getBudgetPlanningFormatters(
  currency: string | null,
  locale: string,
): BudgetPlanningFormatters {
  const key = formatterCacheKey(currency, locale);
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const wholeMajorNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  let currencyWholeMajor: Intl.NumberFormat | null = null;
  if (currency) {
    const code = currency.toUpperCase();
    try {
      currencyWholeMajor = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        currencyDisplay: "code",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } catch {
      currencyWholeMajor = null;
    }
  }

  const formatters = { wholeMajorNumber, currencyWholeMajor };
  formatterCache.set(key, formatters);
  return formatters;
}

/** Locale-aware whole-unit number without currency (row blur when workspace shows currency). */
export function formatBudgetPlanningWholeMajorNumber(
  amountMinor: number,
  locale: string,
): string {
  const wholeMajor = minorUnitsToWholeMajor(amountMinor);
  return getBudgetPlanningFormatters(null, locale).wholeMajorNumber.format(wholeMajor);
}

/** Whole-unit budget amount with ISO currency code via Intl (totals and read-only emphasis). */
export function formatBudgetPlanningMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  const wholeMajor = minorUnitsToWholeMajor(amountMinor);
  const { wholeMajorNumber, currencyWholeMajor } = getBudgetPlanningFormatters(currency, locale);
  if (currencyWholeMajor) {
    return currencyWholeMajor.format(wholeMajor);
  }
  return wholeMajorNumber.format(wholeMajor);
}
