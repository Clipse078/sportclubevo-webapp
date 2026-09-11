/**
 * Tests for lib/integrations/stripe/config.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifyStripeKeyMode,
  getStripeConfig,
  getStripeConfigStatus,
  isStripeKeyModeAllowedForRuntime,
} from "../config";
import { StripeConfigurationError } from "../errors";
import { getRuntimeEnvironment } from "@/lib/env";

const TEST_KEY = "sk_test_" + "01234567890123456789012345678901";
const LIVE_KEY = "sk_live_" + "01234567890123456789012345678901";

function clearStripeEnv() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.APP_ENV;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_TARGET_ENV;
  delete process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS;
}

beforeEach(() => {
  clearStripeEnv();
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  clearStripeEnv();
});

describe("classifyStripeKeyMode", () => {
  it("detects test and live prefixes without exposing values", () => {
    expect(classifyStripeKeyMode(TEST_KEY)).toBe("test");
    expect(classifyStripeKeyMode(LIVE_KEY)).toBe("live");
    expect(classifyStripeKeyMode("invalid")).toBeNull();
  });
});

describe("getStripeConfigStatus", () => {
  it("reports missing key", () => {
    const status = getStripeConfigStatus();
    expect(status.hasSecretKey).toBe(false);
    expect(status.allValid).toBe(false);
  });

  it("accepts valid test key on local APP_ENV", () => {
    process.env.APP_ENV = "local";
    process.env.STRIPE_SECRET_KEY = TEST_KEY;

    const status = getStripeConfigStatus();
    expect(status.allValid).toBe(true);
    expect(status.keyMode).toBe("test");
  });

  it("rejects live key on stage APP_ENV", () => {
    process.env.APP_ENV = "stage";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.STRIPE_SECRET_KEY = LIVE_KEY;

    const status = getStripeConfigStatus();
    expect(status.keyFormatValid).toBe(true);
    expect(status.runtimeAllowsKeyMode).toBe(false);
    expect(status.allValid).toBe(false);
  });

  it("rejects live key on acceptance", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_TARGET_ENV = "acceptance";
    process.env.STRIPE_SECRET_KEY = LIVE_KEY;
    process.env.ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS = "stripe";

    const status = getStripeConfigStatus();
    expect(status.runtimeAllowsKeyMode).toBe(false);
  });
});

describe("getStripeConfig", () => {
  it("throws when key is missing without printing secrets", () => {
    try {
      getStripeConfig();
      expect.unreachable("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(StripeConfigurationError);
      const message = (error as Error).message;
      expect(message).toContain("STRIPE_SECRET_KEY");
      expect(message).not.toContain("sk_test_");
      expect(message).not.toContain("sk_live_");
    }
  });

  it("returns config for valid local test key", () => {
    process.env.APP_ENV = "local";
    process.env.STRIPE_SECRET_KEY = TEST_KEY;

    const config = getStripeConfig();
    expect(config.keyMode).toBe("test");
    expect(config.secretKey).toBe(TEST_KEY);
  });

  it("hard fails stage with live key", () => {
    process.env.APP_ENV = "stage";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.STRIPE_SECRET_KEY = LIVE_KEY;

    expect(() => getStripeConfig()).toThrow(StripeConfigurationError);
    try {
      getStripeConfig();
    } catch (error) {
      expect((error as Error).message).toContain("test secret key");
    }
  });
});

describe("isStripeKeyModeAllowedForRuntime", () => {
  it("allows live keys only in production", () => {
    const prod = getRuntimeEnvironment({
      NODE_ENV: "production",
      APP_ENV: "prod",
      VERCEL: "1",
      VERCEL_ENV: "production",
    });
    expect(isStripeKeyModeAllowedForRuntime("live", prod)).toBe(true);
    expect(isStripeKeyModeAllowedForRuntime("test", prod)).toBe(false);
  });
});
