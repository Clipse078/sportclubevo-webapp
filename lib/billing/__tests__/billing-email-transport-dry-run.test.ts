import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/mailer", () => ({
  sendMail: vi.fn(),
}));

describe("billing email transport dry-run", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not call Resend on preview dry-run success", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BILLING_DELIVERY_DRY_RUN_DELAY_MS", "0");

    const { sendBillingEmail } = await import("../invoice-delivery/billing-email-transport");
    const { sendMail } = await import("@/lib/email/mailer");

    const result = await sendBillingEmail({
      to: "billing@test.example",
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
      from: "SportClubEvo Billing <noreply@test>",
    });

    expect(result.provider).toBe("dry-run");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("simulates provider failure in dry-run", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BILLING_DELIVERY_DRY_RUN_DELAY_MS", "0");

    const { sendBillingEmail, BillingEmailDryRunFailureError } = await import(
      "../invoice-delivery/billing-email-transport"
    );

    await expect(
      sendBillingEmail({
        to: "billing@test.example",
        subject: "Test",
        html: "<p>Hi</p>",
        text: "Hi",
        simulateFailure: true,
      }),
    ).rejects.toBeInstanceOf(BillingEmailDryRunFailureError);
  });
});
