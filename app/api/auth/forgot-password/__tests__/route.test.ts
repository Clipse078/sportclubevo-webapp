import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_SECURITY_MESSAGES } from "@/lib/security/abuse-policy";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  createPasswordResetToken: vi.fn(),
  checkApplicationRateLimit: vi.fn(),
  sendMail: vi.fn(),
  buildPasswordResetEmail: vi.fn(() => ({
    subject: "Reset",
    html: "<p>Reset</p>",
    text: "Reset",
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}));
vi.mock("@/lib/auth/password-reset", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
  TOKEN_EXPIRY_MS: 60 * 60 * 1000,
}));
vi.mock("@/lib/security/abuse-policy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/abuse-policy")>();
  return {
    ...actual,
    checkApplicationRateLimit: mocks.checkApplicationRateLimit,
  };
});
vi.mock("@/lib/email/mailer", () => ({
  sendMail: mocks.sendMail,
  MailConfigurationError: class MailConfigurationError extends Error {},
}));
vi.mock("@/lib/email/templates/password-reset", () => ({
  buildPasswordResetEmail: mocks.buildPasswordResetEmail,
}));

import { POST } from "../route";

const originalAppBaseUrl = process.env.APP_BASE_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

function makeRequest(ip = "203.0.113.1") {
  return new NextRequest("http://hostile.example/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "hostile.example",
      "X-Forwarded-Host": "hostile.example",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email: "user@example.test" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_BASE_URL = "https://canonical.example.test";
  delete process.env.NEXTAUTH_URL;
  mocks.checkApplicationRateLimit.mockReturnValue({ allowed: true });
  mocks.userFindUnique.mockResolvedValue({
    id: "user-1",
    email: "user@example.test",
    isActive: true,
    userRoles: [],
  });
  mocks.createPasswordResetToken.mockResolvedValue("reset+a/b?c=d%e");
  mocks.sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBaseUrl;
  if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalNextAuthUrl;
  vi.restoreAllMocks();
});

describe("POST /api/auth/forgot-password security link generation", () => {
  it("uses the canonical base and encodes the reset token once", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    const input = (
      mocks.buildPasswordResetEmail.mock.calls as unknown[][]
    )[0]?.[0] as {
      resetUrl: string;
    };
    const resetUrl = new URL(input.resetUrl);
    expect(resetUrl.origin).toBe("https://canonical.example.test");
    expect(resetUrl.pathname).toBe("/reset-password");
    expect(resetUrl.searchParams.get("token")).toBe("reset+a/b?c=d%e");
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
  });

  it("fails closed before token creation or provider invocation", async () => {
    process.env.APP_BASE_URL =
      "https://operator:credential@hostile.example/unexpected?token=secret";
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.buildPasswordResetEmail).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns the opaque response without issuing recovery for a platform Superadmin", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "platform-admin",
      email: "user@example.test",
      isActive: true,
      userRoles: [{ id: "superadmin-assignment" }],
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: AUTH_SECURITY_MESSAGES.forgotPasswordSuccess,
    });
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/forgot-password abuse protection", () => {
  it("returns generic 429 with Retry-After when rate limited", async () => {
    mocks.checkApplicationRateLimit.mockReturnValue({
      allowed: false,
      retryAfterMs: 120_000,
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/exist|@example/i);
  });
});
