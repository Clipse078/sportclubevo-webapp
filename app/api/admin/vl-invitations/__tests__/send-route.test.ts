import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireApiPermission = vi.fn();
const orchestrateMock = vi.fn();

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mockRequireApiPermission,
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-orchestration", () => ({
  orchestrateVlInvitationSend: orchestrateMock,
}));

const { POST } = await import("../send/route");

describe("POST /api/admin/vl-invitations/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiPermission.mockResolvedValue({
      ok: true,
      session: { user: { activeTenantId: "tenant-fca", id: "actor-1" } },
    });
    orchestrateMock.mockResolvedValue({
      sent: false,
      mode: "DRY_RUN",
      preservedDraft: true,
      contributorRoleProvisioned: false,
      contributorRoleSyncDiff: { permissionKeys: Array(8).fill("tasks.view") },
      validationRows: [],
      resolved: [],
      rows: [],
      transport: [{ queued: false, mode: "DRY_RUN", recipientEmail: "irem.uysal@fcallschwil.ch", subject: "x" }],
      error: "Dry-Run",
    });
  });

  it("returns orchestration dry-run payload without 501", async () => {
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
    expect(orchestrateMock).toHaveBeenCalledWith(
      expect.objectContaining({ liveExecution: false }),
    );
  });
});