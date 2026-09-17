/**
 * SECURITY-GO-LIVE-01D — invitation accept abuse-protection tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_SECURITY_MESSAGES } from "@/lib/security/abuse-policy";

const mockConsumeExistingUserInvitationToken = vi.fn();
const mockActivateInvitationMembership = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/auth/password-reset", () => ({
  consumeExistingUserInvitationToken: mockConsumeExistingUserInvitationToken,
}));

vi.mock("@/lib/users/mutations", () => ({
  activateInvitationMembership: mockActivateInvitationMembership,
}));

const { POST } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
  mockConsumeExistingUserInvitationToken.mockResolvedValue(null);
  mockActivateInvitationMembership.mockResolvedValue(undefined);
});

describe("POST /api/auth/invitation/accept", () => {
  it("returns the same generic error for invalid tokens", async () => {
    mockConsumeExistingUserInvitationToken.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/auth/invitation/accept", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ token: "invalid-token-value" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(AUTH_SECURITY_MESSAGES.invalidInvitationLink);
    expect(JSON.stringify(body)).not.toContain("invalid-token-value");
  });

  it("returns success for valid existing-user invitation consumption", async () => {
    mockConsumeExistingUserInvitationToken.mockResolvedValue({
      userId: "user-1",
      invitationTenantId: "tenant-1",
    });

    const req = new NextRequest("http://localhost/api/auth/invitation/accept", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockActivateInvitationMembership).toHaveBeenCalledWith("user-1", "tenant-1");
  });

  it("returns canonical 429 when rate limited", async () => {
    const ip = `10.88.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    for (let i = 0; i < 10; i += 1) {
      mockConsumeExistingUserInvitationToken.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/auth/invitation/accept", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ token: "token" }),
      });
      await POST(req);
    }

    const blockedReq = new NextRequest("http://localhost/api/auth/invitation/accept", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ token: "token" }),
    });
    const blocked = await POST(blockedReq);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
