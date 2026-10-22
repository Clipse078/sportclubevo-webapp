/**
 * ISO 4217 currency catalogue for organisation finance (FIN-01E R3).
 * Uses runtime Intl data — no hardcoded 3–5 currency shortlist.
 */

export type Iso4217CurrencyPickerOption = {
  value: string;
  label: string;
  searchText: string;
};

let cachedCodes: readonly string[] | null = null;

export function getSupportedIso4217CurrencyCodes(): readonly string[] {
  if (!cachedCodes) {
    cachedCodes = Object.freeze(
      Intl.supportedValuesOf("currency").map((code) => code.toUpperCase()),
    );
  }
  return cachedCodes;
}

export function isSupportedIso4217CurrencyCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return false;
  }
  return getSupportedIso4217CurrencyCodes().includes(normalized);
}

/** Search assistance tokens only — never used to auto-select currency from country. */
const ISO4217_SEARCH_ALIAS_TOKENS: Readonly<Record<string, readonly string[]>> = {
  CHF: ["ch", "schweiz", "swiss", "switzerland", "suisse", "svizzera"],
  EUR: ["euro", "eu", "europe", "deutschland", "germany", "france", "italy"],
  USD: ["us", "usa", "dollar", "united states", "america"],
  GBP: ["uk", "britain", "pound", "sterling", "england"],
  JPY: ["jp", "japan", "yen"],
  CAD: ["ca", "canada"],
  AUD: ["au", "australia"],
  SEK: ["se", "sweden", "schweden", "krona"],
  NOK: ["no", "norway", "krone"],
  DKK: ["dk", "denmark", "krone"],
};

function currencyDisplayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatIso4217CurrencyOptionLabel(code: string, locale: string): string {
  const upper = code.toUpperCase();
  return `${upper} — ${currencyDisplayName(upper, locale)}`;
}

export function buildIso4217CurrencySearchText(code: string, locale: string): string {
  const upper = code.toUpperCase();
  const name = currencyDisplayName(upper, locale).toLowerCase();
  const aliases = ISO4217_SEARCH_ALIAS_TOKENS[upper] ?? [];
  return [upper, upper.toLowerCase(), name, ...aliases].join(" ");
}

export function buildIso4217CurrencyPickerOptions(locale: string): Iso4217CurrencyPickerOption[] {
  return getSupportedIso4217CurrencyCodes().map((code) => ({
    value: code,
    label: formatIso4217CurrencyOptionLabel(code, locale),
    searchText: buildIso4217CurrencySearchText(code, locale),
  }));
}

export function filterIso4217CurrencyPickerOptions(
  options: readonly Iso4217CurrencyPickerOption[],
  query: string,
): Iso4217CurrencyPickerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...options];
  }
  return options.filter((option) => {
    const hay = `${option.label} ${option.searchText}`.toLowerCase();
    return hay.includes(q);
  });
}
