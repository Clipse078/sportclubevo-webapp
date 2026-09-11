/**
 * Formats Stripe minor-unit amounts for admin UI (no floating-point math).
 */
export function formatBillingMoney(
  amountMinor: number,
  currency: string,
  locale = "de-DE",
): string {
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

export function formatBillingMoneyMultiCurrency(
  amountsByCurrency: Record<string, number>,
  locale = "de-DE",
): string {
  const entries = Object.entries(amountsByCurrency).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return "—";
  }
  return entries
    .map(([currency, amount]) => formatBillingMoney(amount, currency, locale))
    .join(" · ");
}
