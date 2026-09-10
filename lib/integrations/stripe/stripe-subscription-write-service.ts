import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { findBillingAccountByTenantId } from "@/lib/billing/tenant-billing-account-repository";
import { getStripeClient } from "./client";
import { getStripeConfigStatus } from "./config";
import {
  mapStripeSdkError,
  StripeConfigurationError,
  StripeIntegrationError,
} from "./errors";
import { mapStripeSubscription } from "./billing-mappers";
import type { BillingSubscriptionSummary } from "./billing-types";

export type ResolvedTenantSubscription = {
  stripeSubscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
};

function assertStripeConfigured(): void {
  const status = getStripeConfigStatus();
  if (!status.allValid) {
    throw new StripeConfigurationError(
      status.hasSecretKey ? "STRIPE_CONFIGURATION_INVALID" : "STRIPE_NOT_CONFIGURED",
      "Stripe is not configured for subscription writes.",
    );
  }
}

async function loadSubscriptionsForTenant(
  tenantId: string,
  stripe: Stripe,
): Promise<BillingSubscriptionSummary[]> {
  const account = await findBillingAccountByTenantId(tenantId);
  if (!account) {
    throw new StripeIntegrationError(
      "NO_BILLING_ACCOUNT",
      "No billing account is linked for this tenant.",
    );
  }

  const response = await stripe.subscriptions.list({
    customer: account.stripeCustomerId,
    limit: 20,
    status: "all",
    expand: ["data.items.data.price.product"],
  });

  return response.data.map(mapStripeSubscription);
}

/**
 * Resolves the primary Stripe subscription for lifecycle billing actions.
 * Never accepts client-provided subscription IDs.
 */
export async function resolveTenantPrimarySubscription(
  tenantId: string,
  deps?: { stripe?: Stripe },
): Promise<ResolvedTenantSubscription | null> {
  assertStripeConfigured();
  const stripe = deps?.stripe ?? getStripeClient();

  try {
    const subscriptions = await loadSubscriptionsForTenant(tenantId, stripe);
    if (subscriptions.length === 0) {
      return null;
    }
    const ranked = [...subscriptions].sort((a, b) => {
      const score = (s: string) => {
        if (s === "active") return 0;
        if (s === "trialing") return 1;
        if (s === "past_due") return 2;
        return 3;
      };
      return score(a.status) - score(b.status);
    });
    const match = ranked[0];
    if (!match) {
      return null;
    }
    return {
      stripeSubscriptionId: match.stripeSubscriptionId,
      status: match.status,
      cancelAtPeriodEnd: match.cancelAtPeriodEnd,
    };
  } catch (error) {
    throw mapStripeSdkError(error);
  }
}

function idempotencyKey(parts: string[]): string {
  const raw = parts.join(":");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function setSubscriptionCancelAtPeriodEnd(
  tenantId: string,
  cancelAtPeriodEnd: boolean,
  deps?: { stripe?: Stripe },
): Promise<ResolvedTenantSubscription> {
  assertStripeConfigured();
  const stripe = deps?.stripe ?? getStripeClient();
  const current = await resolveTenantPrimarySubscription(tenantId, { stripe });

  if (!current) {
    throw new StripeIntegrationError(
      "STRIPE_RESOURCE_NOT_FOUND",
      "No Stripe subscription is available for this tenant.",
    );
  }

  if (current.status === "canceled") {
    throw new StripeIntegrationError(
      "STRIPE_INVALID_RESPONSE",
      "The Stripe subscription is already canceled.",
    );
  }

  if (current.cancelAtPeriodEnd === cancelAtPeriodEnd) {
    return current;
  }

  const key = idempotencyKey([
    "set-cancel-at-period-end",
    tenantId,
    current.stripeSubscriptionId,
    cancelAtPeriodEnd ? "true" : "false",
  ]);

  try {
    const updated = await stripe.subscriptions.update(
      current.stripeSubscriptionId,
      { cancel_at_period_end: cancelAtPeriodEnd },
      { idempotencyKey: key },
    );
    const mapped = mapStripeSubscription(updated);
    return {
      stripeSubscriptionId: mapped.stripeSubscriptionId,
      status: mapped.status,
      cancelAtPeriodEnd: mapped.cancelAtPeriodEnd,
    };
  } catch (error) {
    throw mapStripeSdkError(error);
  }
}

export async function undoSubscriptionCancellation(
  tenantId: string,
  deps?: { stripe?: Stripe },
): Promise<ResolvedTenantSubscription> {
  return setSubscriptionCancelAtPeriodEnd(tenantId, false, deps);
}

export async function scheduleSubscriptionEndAtPeriod(
  tenantId: string,
  deps?: { stripe?: Stripe },
): Promise<ResolvedTenantSubscription> {
  return setSubscriptionCancelAtPeriodEnd(tenantId, true, deps);
}
