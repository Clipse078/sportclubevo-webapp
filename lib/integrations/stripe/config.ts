/**
 * lib/integrations/stripe/config.ts
 *
 * Server-only Stripe configuration. Reads STRIPE_SECRET_KEY and enforces
 * test/live isolation by runtime classification.
 */

import { getRuntimeEnvironment, type RuntimeEnvironment } from "@/lib/env";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import { StripeConfigurationError } from "./errors";

export type StripeKeyMode = "test" | "live";

export type StripeConfigStatus = {
  hasSecretKey: boolean;
  keyMode: StripeKeyMode | null;
  keyFormatValid: boolean;
  providerEnabled: boolean;
  runtimeAllowsKeyMode: boolean;
  allValid: boolean;
};

export type StripeConfig = {
  secretKey: string;
  keyMode: StripeKeyMode;
};

export type StripeWebhookConfigStatus = {
  hasWebhookSecret: boolean;
  providerEnabled: boolean;
  allValid: boolean;
};

export function getStripeWebhookConfigStatus(
  env: NodeJS.ProcessEnv = process.env,
): StripeWebhookConfigStatus {
  assertServerOnly();
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const hasWebhookSecret = Boolean(secret);
  const providerEnabled = isExternalSideEffectConfigured(
    "stripe",
    ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    env,
  );
  return {
    hasWebhookSecret,
    providerEnabled,
    allValid: hasWebhookSecret && providerEnabled,
  };
}

export function getStripeWebhookSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  assertServerOnly();
  const status = getStripeWebhookConfigStatus(env);
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !status.allValid) {
    throw new StripeConfigurationError(
      "STRIPE_NOT_CONFIGURED",
      "STRIPE_WEBHOOK_SECRET is not configured.",
    );
  }
  return secret;
}

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new StripeConfigurationError(
      "STRIPE_CONFIGURATION_INVALID",
      "Stripe configuration is server-only and must not be imported in the browser.",
    );
  }
}

function readSecretKey(env: NodeJS.ProcessEnv): string | null {
  const value = env.STRIPE_SECRET_KEY?.trim();
  return value ? value : null;
}

export function classifyStripeKeyMode(secretKey: string): StripeKeyMode | null {
  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }
  return null;
}

/**
 * Enforces SportClubEvo Stripe mode isolation:
 * - Production (APP_ENV=prod): live keys only
 * - STAGE / acceptance: test keys only
 * - Local, test, preview, and other non-production runtimes: test keys only
 */
export function isStripeKeyModeAllowedForRuntime(
  keyMode: StripeKeyMode,
  runtime: RuntimeEnvironment,
): boolean {
  if (runtime.isProd) {
    return keyMode === "live";
  }

  return keyMode === "test";
}

export function getStripeConfigStatus(
  env: NodeJS.ProcessEnv = process.env,
): StripeConfigStatus {
  assertServerOnly();

  const secretKey = readSecretKey(env);
  const hasSecretKey = secretKey !== null;
  const keyMode = secretKey ? classifyStripeKeyMode(secretKey) : null;
  const keyFormatValid = keyMode !== null;
  const providerEnabled = isExternalSideEffectConfigured(
    "stripe",
    ["STRIPE_SECRET_KEY"],
    env,
  );
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
  });
  const runtimeAllowsKeyMode =
    keyMode !== null ? isStripeKeyModeAllowedForRuntime(keyMode, runtime) : false;

  const allValid =
    hasSecretKey && keyFormatValid && providerEnabled && runtimeAllowsKeyMode;

  return {
    hasSecretKey,
    keyMode,
    keyFormatValid,
    providerEnabled,
    runtimeAllowsKeyMode,
    allValid,
  };
}

export function getStripeConfig(
  env: NodeJS.ProcessEnv = process.env,
): StripeConfig {
  assertServerOnly();

  const status = getStripeConfigStatus(env);
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
  });

  if (!status.hasSecretKey) {
    throw new StripeConfigurationError(
      "STRIPE_NOT_CONFIGURED",
      "STRIPE_SECRET_KEY is not configured.",
    );
  }

  if (!status.keyFormatValid) {
    throw new StripeConfigurationError(
      "STRIPE_CONFIGURATION_INVALID",
      "STRIPE_SECRET_KEY has an invalid format.",
    );
  }

  if (!status.runtimeAllowsKeyMode) {
    const mode = status.keyMode === "live" ? "live" : "test";
    if (runtime.isProd && mode === "test") {
      throw new StripeConfigurationError(
        "STRIPE_CONFIGURATION_INVALID",
        "Production requires a Stripe live secret key (sk_live_). Test keys are not permitted.",
      );
    }
    throw new StripeConfigurationError(
      "STRIPE_CONFIGURATION_INVALID",
      "This environment requires a Stripe test secret key (sk_test_). Live keys are not permitted.",
    );
  }

  if (!status.providerEnabled) {
    throw new StripeConfigurationError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe integration is not enabled for this environment.",
    );
  }

  return {
    secretKey: readSecretKey(env)!,
    keyMode: status.keyMode!,
  };
}
