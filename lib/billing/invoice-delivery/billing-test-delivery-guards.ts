import { getRuntimeEnvironment } from "@/lib/env";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

export function isBillingTestDeliveryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const runtime = getRuntimeEnvironment(env);
  if (!runtime.isStage) {
    return false;
  }
  if (env.BILLING_ALLOW_TEST_DELIVERY?.trim() !== "1") {
    return false;
  }
  return Boolean(env.BILLING_TEST_RECIPIENT?.trim());
}

export function getBillingTestRecipientConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.BILLING_TEST_RECIPIENT?.trim());
}

export function requireBillingTestDeliveryRecipient(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!isBillingTestDeliveryEnabled(env)) {
    throw new NativeBillingValidationError(
      "Test delivery is not enabled for this environment.",
    );
  }
  return env.BILLING_TEST_RECIPIENT!.trim();
}

export function assertBillingTestDeliveryAllowed(
  env: NodeJS.ProcessEnv = process.env,
): void {
  requireBillingTestDeliveryRecipient(env);
}
