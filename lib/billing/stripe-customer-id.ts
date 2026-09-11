/**
 * Stripe customer id validation (linkage only — no Stripe API).
 *
 * Accepts standard Stripe customer object ids (cus_…).
 */

const STRIPE_CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;

export function normalizeStripeCustomerId(raw: string): string {
  return raw.trim();
}

export function isValidStripeCustomerId(raw: string): boolean {
  const normalized = normalizeStripeCustomerId(raw);
  if (!normalized) return false;
  return STRIPE_CUSTOMER_ID_PATTERN.test(normalized);
}

export function assertValidStripeCustomerId(raw: string): string {
  const normalized = normalizeStripeCustomerId(raw);
  if (!isValidStripeCustomerId(normalized)) {
    throw new BillingValidationError("Ungültige Stripe-Kunden-ID.");
  }
  return normalized;
}

export class BillingValidationError extends Error {
  readonly name = "BillingValidationError";

  constructor(message: string) {
    super(message);
  }
}
