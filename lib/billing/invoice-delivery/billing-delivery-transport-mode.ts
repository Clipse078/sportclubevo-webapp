import { getRuntimeEnvironment } from "@/lib/env";
import { isBillingTestDeliveryEnabled } from "./billing-test-delivery-guards";
import { getBillingSmtpConfigReadiness } from "./billing-smtp-config";
import { isInfomaniakBillingSmtpTransportSelected } from "./billing-email-transport-selection";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

export type { BillingEmailDeliveryIntent } from "./billing-invoice-email-policy";
import type { BillingEmailDeliveryIntent } from "./billing-invoice-email-policy";

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

/**
 * Protected BILLING_INVOICE_TEST_DELIVERY may use real billing transport on Preview
 * when canonical test-delivery eligibility passes. Normal invoice delivery is unchanged.
 */
export function shouldUseBillingDeliveryDryRunTransportForIntent(
  deliveryIntent: BillingEmailDeliveryIntent = "normal",
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (deliveryIntent === "protected-test") {
    if (!isBillingTestDeliveryEnabled(env)) {
      throw new NativeBillingValidationError(
        "Protected test delivery transport is not eligible in this environment.",
      );
    }
    return false;
  }
  return shouldUseBillingDeliveryDryRunTransport();
}

export function isBillingProtectedTestDeliveryRealTransportEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isBillingTestDeliveryEnabled(env)) {
    return false;
  }
  if (!isInfomaniakBillingSmtpTransportSelected()) {
    return false;
  }
  const readiness = getBillingSmtpConfigReadiness(env);
  return (
    readiness.hostConfigured &&
    readiness.portConfigured &&
    readiness.userConfigured &&
    readiness.passwordConfigured &&
    readiness.encryptionConfigured
  );
}
