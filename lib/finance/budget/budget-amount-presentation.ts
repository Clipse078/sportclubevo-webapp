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

export function formatBudgetPlanningMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  const wholeMajor = minorUnitsToWholeMajor(amountMinor);
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(wholeMajor);
  }
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(wholeMajor);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(wholeMajor);
  }
}
