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

export function resolveIso4217FractionDigits(currencyCode: string): number {
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

/** Minor units per one major unit for ISO 4217 (e.g. 100 for CHF, 1 for JPY). */
export function iso4217MinorUnitsPerMajor(currencyCode: string | null): number {
  const code = normalizeCurrencyCode(currencyCode);
  const fractionDigits = code ? resolveIso4217FractionDigits(code) : 2;
  return 10 ** fractionDigits;
}

/**
 * FIN-04B-05R2 — tenant-facing automatic forecast amounts use whole major currency units.
 * Internal `amountMinor` precision is unchanged; this rounds for display only.
 */
export const AUTOMATIC_FORECAST_PRESENTATION_PRECISION = "WHOLE_CURRENCY_UNIT" as const;

/** Half-away-from-zero rounding at whole-major presentation boundary. */
export function roundAmountMinorToWholeMajorPresentation(
  amountMinor: number,
  currencyCode: string | null,
): number {
  if (!Number.isFinite(amountMinor)) return amountMinor;
  const factor = iso4217MinorUnitsPerMajor(currencyCode);
  const major = amountMinor / factor;
  if (major >= 0) {
    return Math.round(major) * factor;
  }
  return -Math.round(Math.abs(major)) * factor;
}

function formatWholeMajorFromMinorPresentation(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  const factor = iso4217MinorUnitsPerMajor(currencyCode);
  const roundedMajor = roundAmountMinorToWholeMajorPresentation(amountMinor, currencyCode) / factor;
  return getFinanceMoneyFormatters(null, locale, false).wholeMajorNumber.format(roundedMajor);
}

export function formatFinanceAutomaticForecastWholeMajorNumber(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor)) return "";
  return formatWholeMajorFromMinorPresentation(amountMinor, currencyCode, locale);
}

export function formatFinanceAutomaticForecastMoneyMinor(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor)) return "";
  if (Number.isNaN(amountMinor)) return "";

  const currency = normalizeCurrencyCode(currencyCode);
  const formattedNumber = formatWholeMajorFromMinorPresentation(amountMinor, currency, locale);

  if (!currency || !isSupportedIso4217CurrencyCode(currency)) {
    return formattedNumber;
  }

  return `${formattedNumber}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}${currency}`;
}

export function formatFinanceAutomaticForecastSignedWholeMajorNumber(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor) || amountMinor === 0) {
    return formatFinanceAutomaticForecastWholeMajorNumber(0, currencyCode, locale);
  }
  const magnitude = formatFinanceAutomaticForecastWholeMajorNumber(
    Math.abs(amountMinor),
    currencyCode,
    locale,
  );
  return amountMinor > 0 ? `+${magnitude}` : `−${magnitude}`;
}

export function formatFinanceAutomaticForecastSignedMinor(
  amountMinor: number,
  currencyCode: string | null,
  locale: string,
): string {
  if (!Number.isFinite(amountMinor) || amountMinor === 0) {
    return formatFinanceAutomaticForecastMoneyMinor(0, currencyCode, locale);
  }
  const magnitude = formatFinanceAutomaticForecastMoneyMinor(
    Math.abs(amountMinor),
    currencyCode,
    locale,
  );
  return amountMinor > 0 ? `+${magnitude}` : `−${magnitude}`;
}

/**
 * FIN-04C-05R2 — canonical Finance management-presentation money (whole major units).
 * Use for forecast workspace summaries, comparisons, history, and management tables (read mode).
 * Internal `amountMinor` and calculation precision are unchanged.
 */
export const FINANCE_MANAGEMENT_PRESENTATION_PRECISION =
  AUTOMATIC_FORECAST_PRESENTATION_PRECISION;

export const formatFinanceManagementMoneyMinor = formatFinanceAutomaticForecastMoneyMinor;
export const formatFinanceManagementWholeMajorNumber =
  formatFinanceAutomaticForecastWholeMajorNumber;
export const formatFinanceManagementSignedWholeMajorNumber =
  formatFinanceAutomaticForecastSignedWholeMajorNumber;
export const formatFinanceManagementSignedMinor = formatFinanceAutomaticForecastSignedMinor;

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
