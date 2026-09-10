import type Stripe from "stripe";
import { claimStripeWebhookEvent } from "@/lib/billing/stripe-webhook-idempotency";
import {
  extractStripeCustomerIdFromEvent,
  handleBillingRecovery,
  handlePaymentFailure,
  isBillingRecoveryStripeEvent,
  isPaymentFailureStripeEvent,
} from "@/lib/billing/platform-dunning-service";

export type StripeWebhookProcessResult =
  | { outcome: "duplicate" }
  | { outcome: "ignored"; reason: string }
  | { outcome: "processed"; handler: string };

export async function processStripeBillingWebhookEvent(
  event: Stripe.Event,
): Promise<StripeWebhookProcessResult> {
  const claim = await claimStripeWebhookEvent({
    stripeEventId: event.id,
    eventType: event.type,
  });

  if (claim === "duplicate") {
    return { outcome: "duplicate" };
  }

  const object = event.data.object as Record<string, unknown>;
  const stripeCustomerId = extractStripeCustomerIdFromEvent(object);
  if (!stripeCustomerId) {
    return { outcome: "ignored", reason: "no_customer" };
  }

  const eventAt = new Date(event.created * 1000);

  if (isPaymentFailureStripeEvent(event.type)) {
    const result = await handlePaymentFailure({
      stripeCustomerId,
      eventAt,
      stripeEventId: event.id,
    });
    return { outcome: "processed", handler: `payment_failure:${result}` };
  }

  if (isBillingRecoveryStripeEvent(event.type)) {
    const result = await handleBillingRecovery({
      stripeCustomerId,
      stripeEventId: event.id,
    });
    return { outcome: "processed", handler: `recovery:${result}` };
  }

  return { outcome: "ignored", reason: "unsupported_type" };
}
