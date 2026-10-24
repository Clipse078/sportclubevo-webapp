/**
 * FIN-01D budget planning amounts — whole major units in UI, integer minor units in storage.
 */

import {
  formatFinanceManagementMoneyMinor,
  formatFinanceManagementSignedMinor,
  formatFinanceManagementSignedWholeMajorNumber,
  formatFinanceManagementWholeMajorNumber,
  formatFinanceMoneyMinor,
  formatFinanceMoneyWholeMajorNumber,
  getFinanceMoneyPresentationFormatters,
} from "@/lib/finance/presentation/finance-money-presentation";

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

/** @deprecated Prefer getFinanceMoneyPresentationFormatters — budget alias for FIN-01D tests. */
export function getBudgetPlanningFormatters(currency: string | null, locale: string) {
  return getFinanceMoneyPresentationFormatters(currency, locale);
}

/** Locale-aware whole-unit number without currency (row blur when workspace shows currency). */
export function formatBudgetPlanningWholeMajorNumber(
  amountMinor: number,
  locale: string,
): string {
  return formatFinanceMoneyWholeMajorNumber(amountMinor, locale);
}

/** Whole-unit budget amount with ISO currency code (totals and read-only emphasis). */
export function formatBudgetPlanningMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceMoneyMinor(amountMinor, currency, locale);
}

/** Explicit sign for variance columns (+/−/0) — whole major units without currency when context strip shows ISO code. */
export function formatBudgetPlanningSignedWholeMajorNumber(
  amountMinor: number,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor) || amountMinor === 0) {
    return formatBudgetPlanningWholeMajorNumber(0, locale);
  }
  const magnitude = formatBudgetPlanningWholeMajorNumber(Math.abs(amountMinor), locale);
  return amountMinor > 0 ? `+${magnitude}` : `−${magnitude}`;
}

/** Explicit sign with canonical ISO currency suffix (summary / emphasis). */
export function formatBudgetPlanningSignedMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor) || amountMinor === 0) {
    return formatBudgetPlanningMinor(0, currency, locale);
  }
  const magnitude = formatBudgetPlanningMinor(Math.abs(amountMinor), currency, locale);
  return amountMinor > 0 ? `+${magnitude}` : `−${magnitude}`;
}

/** FIN-04C-05R2 — whole-currency management presentation (forecast workspace and comparisons). */
export function formatFinanceManagementPlanningMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementMoneyMinor(amountMinor, currency, locale);
}

export function formatFinanceManagementPlanningWholeMajorNumber(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementWholeMajorNumber(amountMinor, currency, locale);
}

export function formatFinanceManagementPlanningSignedWholeMajorNumber(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementSignedWholeMajorNumber(amountMinor, currency, locale);
}

export function formatFinanceManagementPlanningSignedMinor(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementSignedMinor(amountMinor, currency, locale);
}
