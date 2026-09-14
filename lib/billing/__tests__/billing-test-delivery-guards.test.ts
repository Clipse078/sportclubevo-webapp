import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";

const stageUrl = "postgresql://user:secret@stage.example.test:5432/sce_stage";

function stubDeployedStageRuntime() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("APP_ENV", "stage");
}

function stubLocalStageRuntime() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "stage");
}

function stubVerifiedStagePreviewRuntime(options?: {
  dataEnvironment?: string;
  fingerprint?: string;
}) {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("APP_ENV", "stage");
  vi.stubEnv("SCE_DATA_ENVIRONMENT", options?.dataEnvironment ?? "STAGE");
  vi.stubEnv("DATABASE_URL", stageUrl);
  const fingerprint =
    options?.fingerprint ??
    getDatabaseFingerprintFromEffectivePrismaSource({
      NODE_ENV: "production",
      DATABASE_URL: stageUrl,
    })!;
  vi.stubEnv("SCE_DATA_DATABASE_FINGERPRINT", fingerprint);
}

function stubTestDeliveryFlags(recipient = "billing-test@sportclubevo.test") {
  vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
  vi.stubEnv("BILLING_TEST_RECIPIENT", recipient);
}

function stubCompleteSmtpEnv() {
  vi.stubEnv("BILLING_EMAIL_TRANSPORT", "infomaniak_smtp");
  vi.stubEnv("BILLING_SMTP_HOST", "mail.infomaniak.com");
  vi.stubEnv("BILLING_SMTP_PORT", "587");
  vi.stubEnv("BILLING_SMTP_USER", "billing@sportclubevo.com");
  vi.stubEnv("BILLING_SMTP_PASSWORD", "secret-device-password");
  vi.stubEnv("BILLING_SMTP_ENCRYPTION", "STARTTLS");
}

describe("billing test-delivery enablement guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("enables deployed STAGE when allow flag and recipient are set", async () => {
    stubDeployedStageRuntime();
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(true);
  });

  it("disables deployed STAGE when allow flag is not set", async () => {
    stubDeployedStageRuntime();
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "0");
    vi.stubEnv("BILLING_TEST_RECIPIENT", "billing-test@sportclubevo.test");

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("disables deployed STAGE when test recipient is missing", async () => {
    stubDeployedStageRuntime();
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("enables verified STAGE Preview when allow flag and recipient are set", async () => {
    stubVerifiedStagePreviewRuntime();
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(true);
    expect(resolveRuntimeIdentity(process.env).deploymentEnvironment).toBe(
      "PREVIEW",
    );
  });

  it("disables Preview when data environment is not STAGE", async () => {
    stubVerifiedStagePreviewRuntime({ dataEnvironment: "PRODUCTION" });
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("disables generic Preview without STAGE data attestation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("APP_ENV", "prod");
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("disables production runtime even with test-delivery flags", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "prod");
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("disables STAGE-attested Preview when database fingerprint does not match", async () => {
    stubVerifiedStagePreviewRuntime({ fingerprint: "0000000000000000" });
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("reports the same enablement in readiness as the canonical guard", async () => {
    stubVerifiedStagePreviewRuntime();
    stubTestDeliveryFlags();
    stubCompleteSmtpEnv();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    const { buildBillingEmailIdentityReport } = await import(
      "../invoice-delivery/billing-email-identity-report"
    );

    const report = await buildBillingEmailIdentityReport();
    expect(report.testDeliveryEnabled).toBe(isBillingTestDeliveryEnabled());
    expect(report.testDeliveryEnabled).toBe(true);
  });

  it("keeps local STAGE test harness eligible without Vercel metadata", async () => {
    stubLocalStageRuntime();
    stubTestDeliveryFlags();

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(true);
  });
});
