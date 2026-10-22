import { isSupportedIso4217CurrencyCode } from "@/lib/finance/currency/iso4217-currency";

/**
 * FIN-01E R5 — canonical Finance money presentation.
 *
 * Storage remains integer minor units elsewhere; this module only formats display.
 *
 * Architecture:
 *   amountMinor + ISO 4217 currency code + BCP-47 formatting locale → display string
 *
 * Currency does not choose grouping/decimals. Locale does not choose stored currency.
 *
 * ISO code placement: locale-formatted numeric component + narrow no-break space + ISO code
 * (suffix). Numeric grouping/decimals always come from Intl — never manual separator hacks.
 */

/** Separator between formatted number and explicit ISO 4217 code in Finance surfaces. */
export const FINANCE_MONEY_ISO_SUFFIX_SEPARATOR = "\u00a0";

type FinanceMoneyFormatters = {
  wholeMajorNumber: Intl.NumberFormat;
  fractionalMajorNumber: Intl.NumberFormat | null;
};

const formatterCache = new Map<string, FinanceMoneyFormatters>();

function formatterCacheKey(currency: string | null, locale: string, fractional: boolean): string {
  return `${locale}\u0000${currency?.toUpperCase() ?? ""}\u0000${fractional ? "frac" : "whole"}`;
}

function resolveIso4217FractionDigits(currencyCode: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode.toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function getFinanceMoneyFormatters(
  currency: string | null,
  locale: string,
  fractional: boolean,
): FinanceMoneyFormatters {
  const key = formatterCacheKey(currency, locale, fractional);
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const wholeMajorNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  let fractionalMajorNumber: Intl.NumberFormat | null = null;
  if (fractional && currency) {
    const code = currency.toUpperCase();
    const fractionDigits = resolveIso4217FractionDigits(code);
    try {
      fractionalMajorNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
    } catch {
      fractionalMajorNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  } else if (fractional) {
    fractionalMajorNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const formatters = { wholeMajorNumber, fractionalMajorNumber };
  formatterCache.set(key, formatters);
  return formatters;
}

export function getFinanceMoneyPresentationFormatters(
  currency: string | null,
  locale: string,
): FinanceMoneyFormatters {
  return getFinanceMoneyFormatters(currency, locale, true);
}

function normalizeCurrencyCode(currencyCode: string | null): string | null {
  if (!currencyCode) return null;
  const trimmed = currencyCode.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function majorUnitsFromMinor(amountMinor: number): number {
  return amountMinor / 100;
}

function isWholeMajorMinorUnits(amountMinor: number): boolean {
  return Number.isInteger(amountMinor) && amountMinor % 100 === 0;
}

/**
 * Locale-aware whole major units without currency (budget row blur when currency is in context strip).
 */
export function formatFinanceMoneyWholeMajorNumber(
  amountMinor: number,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor)) return "";
  const wholeMajor = Math.trunc(amountMinor / 100);
  return getFinanceMoneyFormatters(null, locale, false).wholeMajorNumber.format(wholeMajor);
}

/**
 * Canonical Finance display for integer minor-unit amounts with explicit ISO currency code.
 */
export function formatFinanceMoneyMinor(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor)) return "";
  if (Number.isNaN(amountMinor)) return "";

  const currency = normalizeCurrencyCode(currencyCode);
  const wholeMajor = isWholeMajorMinorUnits(amountMinor);
  const formatters = getFinanceMoneyFormatters(currency, locale, !wholeMajor);

  const formattedNumber = wholeMajor
    ? formatters.wholeMajorNumber.format(Math.trunc(majorUnitsFromMinor(amountMinor)))
    : (formatters.fractionalMajorNumber ?? formatters.wholeMajorNumber).format(
        majorUnitsFromMinor(amountMinor),
      );

  if (!currency || !isSupportedIso4217CurrencyCode(currency)) {
    return formattedNumber;
  }

  return `${formattedNumber}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}${currency}`;
}
