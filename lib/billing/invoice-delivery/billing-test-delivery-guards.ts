import { getRuntimeEnvironment } from "@/lib/env";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

/**
 * Test delivery may run on deployed STAGE or on a Vercel Preview that is
 * explicitly attested to STAGE data (SCE_DATA_ENVIRONMENT + DB fingerprint).
 */
function isBillingTestDeliveryRuntimeEligible(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
  });

  if (runtime.isStage) {
    return true;
  }

  if (!runtime.isPreview) {
    return false;
  }

  const identity = resolveRuntimeIdentity(env);
  return (
    identity.dataEnvironment === "STAGE" &&
    identity.databaseFingerprintMatchesConfiguredTarget
  );
}

export function isBillingTestDeliveryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isBillingTestDeliveryRuntimeEligible(env)) {
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
