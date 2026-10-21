/**
 * SCE Finance — money representation contracts (FIN-01A).
 *
 * Aligns with native billing (`amountMinor` integer + ISO currency code).
 * Finance planning amounts use the same semantics; no floating-point money.
 */

export interface TenantMoneyAmount {
  /** Minor units (e.g. Rappen for CHF). Must be a safe integer. */
  amountMinor: number;
  /** ISO 4217 code; tenant base currency for club finance. */
  currency: string;
}

export const FINANCE_AMOUNT_STORAGE = {
  /** Integer minor units — never IEEE float in persistence or aggregation. */
  representation: "AMOUNT_MINOR_INTEGER",
  defaultCurrencyField: "Tenant.currency",
  billingAlignment: "Invoice.grossTotalMinor / InvoiceLine.*Minor",
} as const;

export function assertSafeAmountMinor(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("FINANCE_AMOUNT_INVALID: amountMinor must be a safe integer");
  }
}
