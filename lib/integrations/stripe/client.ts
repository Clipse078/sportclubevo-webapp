/**
 * lib/integrations/stripe/client.ts
 *
 * Canonical server-only Stripe SDK client factory.
 */

import Stripe from "stripe";
import { getStripeConfig } from "./config";
import { StripeConfigurationError } from "./errors";

export const STRIPE_API_VERSION = Stripe.API_VERSION;

let stripeClient: Stripe | null = null;

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new StripeConfigurationError(
      "STRIPE_CONFIGURATION_INVALID",
      "Stripe client is server-only and must not be imported in the browser.",
    );
  }
}

export function getStripeClient(): Stripe {
  assertServerOnly();

  if (stripeClient) {
    return stripeClient;
  }

  const config = getStripeConfig();

  stripeClient = new Stripe(config.secretKey, {
    apiVersion: Stripe.API_VERSION,
    typescript: true,
  });

  return stripeClient;
}

/** Test hook — resets the singleton between Vitest cases. */
export function resetStripeClientForTests(): void {
  stripeClient = null;
}
