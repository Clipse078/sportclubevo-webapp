import { getRuntimeEnvironment } from "@/lib/env";

/**
 * Preview / acceptance / local test runs must not deliver real customer email by default.
 * Set BILLING_DELIVERY_LIVE=1 to force live Resend (non-production only).
 */
export function shouldUseBillingDeliveryDryRunTransport(): boolean {
  const runtime = getRuntimeEnvironment();
  if (runtime.isProd) {
    return false;
  }
  if (process.env.BILLING_DELIVERY_LIVE?.trim() === "1") {
    return false;
  }
  if (runtime.isPreview || runtime.isAcceptance || runtime.isTest || runtime.isLocal) {
    return true;
  }
  return false;
}

export function billingDeliveryDryRunDelayMs(): number {
  const raw = process.env.BILLING_DELIVERY_DRY_RUN_DELAY_MS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  const runtime = getRuntimeEnvironment();
  if (runtime.isPreview && shouldUseBillingDeliveryDryRunTransport()) {
    return 1200;
  }
  return 0;
}

export function isBillingDeliveryAcceptanceSimulateFailureAllowed(): boolean {
  return shouldUseBillingDeliveryDryRunTransport();
}
