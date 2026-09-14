import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("billing Infomaniak SMTP transport", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    sendMailMock.mockReset();
    createTransportMock.mockClear();
  });

  function stubCompleteSmtpEnv() {
    vi.stubEnv("BILLING_EMAIL_TRANSPORT", "infomaniak_smtp");
    vi.stubEnv("BILLING_SMTP_HOST", "mail.infomaniak.com");
    vi.stubEnv("BILLING_SMTP_PORT", "587");
    vi.stubEnv("BILLING_SMTP_USER", "billing@sportclubevo.com");
    vi.stubEnv("BILLING_SMTP_PASSWORD", "secret-device-password");
    vi.stubEnv("BILLING_SMTP_ENCRYPTION", "STARTTLS");
    vi.stubEnv("BILLING_DELIVERY_LIVE", "1");
    vi.stubEnv("APP_ENV", "stage");
  }

  it("selects infomaniak_smtp when configured", async () => {
    vi.stubEnv("BILLING_EMAIL_TRANSPORT", "infomaniak_smtp");
    const { getSelectedBillingEmailTransport } = await import(
      "../invoice-delivery/billing-email-transport-selection"
    );
    expect(getSelectedBillingEmailTransport()).toBe("infomaniak_smtp");
  });

  it("defaults transport to resend", async () => {
    const { getSelectedBillingEmailTransport } = await import(
      "../invoice-delivery/billing-email-transport-selection"
    );
    expect(getSelectedBillingEmailTransport()).toBe("resend");
  });

  it("fails closed when SMTP config is incomplete", async () => {
    vi.stubEnv("BILLING_EMAIL_TRANSPORT", "infomaniak_smtp");
    vi.stubEnv("BILLING_SMTP_HOST", "mail.infomaniak.com");
    const { requireBillingSmtpConfig, BillingSmtpConfigurationError } = await import(
      "../invoice-delivery/billing-smtp-config"
    );
    expect(() => requireBillingSmtpConfig()).toThrow(BillingSmtpConfigurationError);
  });

  it("configures STARTTLS on port 587", async () => {
    stubCompleteSmtpEnv();
    sendMailMock.mockResolvedValue({ messageId: "<msg@test>" });

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");

    await sendBillingEmail({
      to: "operator@test.example",
      subject: "Invoice",
      html: "<p>Hi</p>",
      text: "Hi",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "mail.infomaniak.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: "billing@sportclubevo.com",
          pass: "secret-device-password",
        },
      }),
    );
    expect(sendMailMock).toHaveBeenCalled();
  });

  it("returns infomaniak-smtp provider metadata", async () => {
    stubCompleteSmtpEnv();
    sendMailMock.mockResolvedValue({ messageId: "<smtp-123>" });

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");
    const result = await sendBillingEmail({
      to: "operator@test.example",
      subject: "Invoice",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(result.provider).toBe("infomaniak-smtp");
    expect(result.messageId).toBe("<smtp-123>");
  });

  it("preserves Resend when transport is not infomaniak_smtp", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BILLING_DELIVERY_LIVE", "1");

    const sendMailResend = vi.fn().mockResolvedValue({
      providerMessageId: "resend-1",
      from: "noreply@test",
    });

    vi.doMock("@/lib/email/mailer", () => ({
      sendMail: sendMailResend,
    }));

    vi.resetModules();
    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");
    const result = await sendBillingEmail({
      to: "customer@test.example",
      subject: "Invoice",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(result.provider).toBe("resend");
    expect(sendMailResend).toHaveBeenCalled();
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("resolves billing From and Reply-To for Infomaniak SMTP", async () => {
    stubCompleteSmtpEnv();
    vi.stubEnv("BILLING_EMAIL_FROM", "SportClubEvo Billing <billing@sportclubevo.com>");
    vi.stubEnv("BILLING_REPLY_TO_EMAIL", "billing@sportclubevo.com");

    const { resolveBillingEmailIdentity } = await import(
      "../invoice-delivery/resolve-billing-email-identity"
    );
    const identity = await resolveBillingEmailIdentity();
    expect(identity.from).toBe("SportClubEvo Billing <billing@sportclubevo.com>");
    expect(identity.replyTo).toBe("billing@sportclubevo.com");
  });

  it("readiness never exposes SMTP password", async () => {
    stubCompleteSmtpEnv();
    vi.stubEnv("BILLING_TEST_RECIPIENT", "operator-secret@test.example");
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
    vi.stubEnv("APP_ENV", "stage");

    const { buildBillingEmailIdentityReport } = await import(
      "../invoice-delivery/billing-email-identity-report"
    );
    const report = await buildBillingEmailIdentityReport();
    const serialized = JSON.stringify(report);

    expect(report.smtp.passwordConfigured).toBe(true);
    expect(serialized).not.toContain("secret-device-password");
    expect(serialized).not.toContain("operator-secret@test.example");
    expect(report.testRecipientConfigured).toBe(true);
    expect(report.transportSelected).toBe("infomaniak_smtp");
  });
});
