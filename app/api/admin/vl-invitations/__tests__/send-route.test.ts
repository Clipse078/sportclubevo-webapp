import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireApiPermission = vi.fn();

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mockRequireApiPermission,
}));

vi.mock("@/lib/admin/vl-onboarding/resolve-vl-invitation-rows", () => ({
  resolveVlInvitationRows: vi.fn(async () => [
    {
      email: "irem.uysal@fcallschwil.ch",
      action: "NEW_INVITATION",
      label: "Neue Einladung",
    },
  ]),
}));

const { POST } = await import("../send/route");

describe("POST /api/admin/vl-invitations/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiPermission.mockResolvedValue({
      ok: true,
      session: { user: { activeTenantId: "tenant-fca" } },
    });
  });

  it("returns dry-run mock transport without sending", async () => {
    const req = new NextRequest("http://localhost/api/admin/vl-invitations/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw: "irem.uysal@fcallschwil.ch",
        confirmLiveSend: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(false);
    expect(body.transport?.[0]?.queued).toBe(false);
    expect(body.preservedDraft).toBe(true);
  });
});