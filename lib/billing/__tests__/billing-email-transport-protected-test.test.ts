import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
} from "@/lib/server/runtime-identity";

const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({
  sendMail: sendMailMock,
  close: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

vi.mock("@/lib/email/mailer", () => ({
  sendMail: vi.fn(),
}));

const stageUrl = "postgresql://user:secret@stage.example.test:5432/sce_stage";

function stubCompleteSmtpEnv() {
  vi.stubEnv("BILLING_EMAIL_TRANSPORT", "infomaniak_smtp");
  vi.stubEnv("BILLING_SMTP_HOST", "mail.infomaniak.com");
  vi.stubEnv("BILLING_SMTP_PORT", "587");
  vi.stubEnv("BILLING_SMTP_USER", "billing@sportclubevo.com");
  vi.stubEnv("BILLING_SMTP_PASSWORD", "secret-device-password");
  vi.stubEnv("BILLING_SMTP_ENCRYPTION", "STARTTLS");
}

function stubPreviewDryRun() {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("BILLING_DELIVERY_LIVE", "");
  vi.stubEnv("BILLING_DELIVERY_DRY_RUN_DELAY_MS", "0");
}

function stubVerifiedStagePreviewRuntime() {
  stubPreviewDryRun();
  vi.stubEnv("APP_ENV", "stage");
  vi.stubEnv("SCE_DATA_ENVIRONMENT", "STAGE");
  vi.stubEnv("DATABASE_URL", stageUrl);
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource({
    NODE_ENV: "production",
    DATABASE_URL: stageUrl,
  })!;
  vi.stubEnv("SCE_DATA_DATABASE_FINGERPRINT", fingerprint);
}

function stubTestDeliveryFlags(recipient = "billing-test@sportclubevo.test") {
  vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
  vi.stubEnv("BILLING_TEST_RECIPIENT", recipient);
}

describe("billing email transport protected test delivery (BILLING-MAIL-01B3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    sendMailMock.mockReset();
    createTransportMock.mockClear();
  });

  it("A: normal Preview invoice delivery stays dry-run and does not call SMTP", async () => {
    stubPreviewDryRun();
    stubCompleteSmtpEnv();
    stubTestDeliveryFlags();

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    const result = await sendBillingEmail({
      to: "customer@example.com",
      subject: "Invoice",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(result.provider).toBe("dry-run");
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("B: eligible STAGE Preview protected test uses Infomaniak SMTP to fixed test recipient", async () => {
    stubVerifiedStagePreviewRuntime();
    stubCompleteSmtpEnv();
    stubTestDeliveryFlags();
    sendMailMock.mockResolvedValue({ messageId: "<protected-test-1>" });

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    const result = await sendBillingEmail({
      to: "billing-test@sportclubevo.test",
      subject: "[TEST DELIVERY] Invoice",
      html: "<p>Hi</p>",
      text: "Hi",
      deliveryIntent: "protected-test",
      attachments: [
        { filename: "logo-sce.png", content: Buffer.from("sce"), contentType: "image/png", cid: "sce" },
        { filename: "logo-tulip.png", content: Buffer.from("tulip"), contentType: "image/png", cid: "tulip" },
        { filename: "inv.pdf", content: Buffer.from("%PDF"), contentType: "application/pdf" },
      ],
    });

    expect(result.provider).toBe("infomaniak-smtp");
    expect(createTransportMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "billing-test@sportclubevo.test",
        attachments: expect.arrayContaining([
          expect.objectContaining({ contentType: "image/png" }),
          expect.objectContaining({ contentType: "application/pdf" }),
        ]),
      }),
    );
    expect(sendMailMock.mock.calls[0]?.[0]?.attachments).toHaveLength(3);
  });

  it("C: protected test without valid STAGE attestation does not call SMTP", async () => {
    stubPreviewDryRun();
    stubCompleteSmtpEnv();
    stubTestDeliveryFlags();
    vi.stubEnv("SCE_DATA_ENVIRONMENT", "PROD");

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    await expect(
      sendBillingEmail({
        to: "billing-test@sportclubevo.test",
        subject: "[TEST DELIVERY] Invoice",
        html: "<p>Hi</p>",
        text: "Hi",
        deliveryIntent: "protected-test",
      }),
    ).rejects.toThrow(/not eligible/i);

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("D: protected test without allow flag does not call SMTP", async () => {
    stubVerifiedStagePreviewRuntime();
    stubCompleteSmtpEnv();
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "0");
    vi.stubEnv("BILLING_TEST_RECIPIENT", "billing-test@sportclubevo.test");

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    await expect(
      sendBillingEmail({
        to: "billing-test@sportclubevo.test",
        subject: "[TEST DELIVERY] Invoice",
        html: "<p>Hi</p>",
        text: "Hi",
        deliveryIntent: "protected-test",
      }),
    ).rejects.toThrow(/not eligible/i);

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("E: protected test without recipient configured does not call SMTP", async () => {
    stubVerifiedStagePreviewRuntime();
    stubCompleteSmtpEnv();
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
    vi.stubEnv("BILLING_TEST_RECIPIENT", "");

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    await expect(
      sendBillingEmail({
        to: "billing-test@sportclubevo.test",
        subject: "[TEST DELIVERY] Invoice",
        html: "<p>Hi</p>",
        text: "Hi",
        deliveryIntent: "protected-test",
      }),
    ).rejects.toThrow(/not eligible/i);

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("F: production runtime is not test-enabled from flags alone", async () => {
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

  it("readiness: deliveryDryRunTransport stays true on Preview while real test transport can be enabled", async () => {
    stubVerifiedStagePreviewRuntime();
    stubCompleteSmtpEnv();
    stubTestDeliveryFlags();

    const {
      shouldUseBillingDeliveryDryRunTransport,
      isBillingProtectedTestDeliveryRealTransportEnabled,
    } = await import("../invoice-delivery/billing-delivery-transport-mode");

    expect(shouldUseBillingDeliveryDryRunTransport()).toBe(true);
    expect(isBillingProtectedTestDeliveryRealTransportEnabled()).toBe(true);
  });
});
