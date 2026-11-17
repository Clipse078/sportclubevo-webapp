import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const orchestrateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: vi.fn(async () => ({
    ok: true,
    session: {
      user: { activeTenantId: "tenant-fca", id: "actor-1", effectiveUserId: "actor-1" },
    },
  })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(async () => ({ key: "fc-allschwil" })),
    },
  },
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-orchestration", () => ({
  orchestrateVlInvitationSend: orchestrateMock,
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-send-policy", () => ({
  assertVlInvitationSendAllowed: vi.fn(() => ({ ok: false, error: "DRY_RUN" })),
  resolveVlInvitationSendMode: vi.fn(() => "DRY_RUN"),
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-transport", () => ({
  createLiveVlInvitationTransport: vi.fn(),
  createMockVlInvitationTransport: vi.fn(() => ({ deliver: vi.fn() })),
}));

import { POST } from "@/app/api/admin/people-access/vl-invite/send/route";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";

describe("POST /api/admin/people-access/vl-invite/send", () => {
  beforeEach(() => {
    orchestrateMock.mockReset();
    orchestrateMock.mockResolvedValue({
      sent: false,
      rows: [{ email: "a@fcallschwil.ch", status: "planned", action: "NEW_INVITATION" }],
      contributorRoleProvisioned: false,
      contributorRoleSyncDiff: { permissionKeys: ["tasks.view"] },
      transport: [{ queued: false }],
    });
  });

  it("routes single recipient through orchestrateVlInvitationSend", async () => {
    const req = new NextRequest("http://localhost/api/admin/people-access/vl-invite/send", {
      method: "POST",
      body: JSON.stringify({
        email: "a@fcallschwil.ch",
        firstName: "Ada",
        lastName: "Test",
        functionKey: PERSON_FUNCTIONS.COORDINATOR,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(orchestrateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        liveExecution: false,
        identities: [
          expect.objectContaining({
            email: "a@fcallschwil.ch",
            functionKey: PERSON_FUNCTIONS.COORDINATOR,
          }),
        ],
      }),
    );
  });
});