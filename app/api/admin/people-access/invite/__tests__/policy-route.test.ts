import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: vi.fn(),
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-send-policy", () => ({
  resolveVlInvitationSendMode: vi.fn(() => "LIVE_ALLOWED"),
}));

import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { resolveVlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import { GET } from "@/app/api/admin/people-access/invite/policy/route";

describe("GET /api/admin/people-access/invite/policy", () => {
  beforeEach(() => {
    vi.mocked(requireApiPermission).mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", activeTenantId: "t1" } },
    } as never);
  });

  it("returns canonical server sendMode", async () => {
    vi.mocked(resolveVlInvitationSendMode).mockReturnValue("LIVE_ALLOWED");
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.sendMode).toBe("LIVE_ALLOWED");
    expect(resolveVlInvitationSendMode).toHaveBeenCalled();
  });

  it("rejects without users.invite", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue({
      ok: false,
      error: "Forbidden",
      status: 403,
    } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});