import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock("@/lib/email/mailer", () => ({
  sendMail: (...args: unknown[]) => mocks.sendMail(...args),
  MailConfigurationError: class MailConfigurationError extends Error {
    name = "MailConfigurationError";
  },
  MailAttachmentPreflightError: class MailAttachmentPreflightError extends Error {
    name = "MailAttachmentPreflightError";
  },
}));

import {
  OutboundEmailTransportError,
  sendOutboundEmail,
} from "@/lib/email/outbound-email-transport";
import { withOutboundEmailOperationTimeout } from "@/lib/email/outbound-email-operation-timeout";

describe("COMM-14 outbound email transport timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.sendMail.mockImplementation(
      () =>
        new Promise(() => {
          /* simulate hung provider */
        }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("rejects hung provider I/O with TRANSPORT_TIMEOUT", async () => {
    const pending = sendOutboundEmail({
      to: "recipient@example.com",
      subject: "Subject",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    const rejection = expect(pending).rejects.toBeInstanceOf(OutboundEmailTransportError);
    await vi.advanceTimersByTimeAsync(25_000);
    await rejection;
    const error = await pending.catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "TRANSPORT_TIMEOUT", permanent: false });
  });

  it("withOutboundEmailOperationTimeout clears timer on success", async () => {
    await expect(
      withOutboundEmailOperationTimeout(
        "fast",
        Promise.resolve("ok"),
        100,
      ),
    ).resolves.toBe("ok");
  });
});
