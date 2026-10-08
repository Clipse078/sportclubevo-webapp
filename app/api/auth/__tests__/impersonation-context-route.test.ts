import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPersonProfileByUserIdCached: vi.fn(),
  getActiveTenant: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/server/request-cache", () => ({
  getPersonProfileByUserIdCached: mocks.getPersonProfileByUserIdCached,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

import { GET } from "../impersonation-context/route";

describe("GET /api/auth/impersonation-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveTenant.mockResolvedValue({ name: "FC Allschwil" });
    mocks.getPersonProfileByUserIdCached.mockResolvedValue({
      firstName: "Sandra",
      lastName: "Fischer",
    });
  });

  it("returns inactive payload when not impersonating", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "admin", isImpersonating: false },
    });
    const response = await GET();
    const body = await response.json();
    expect(body.isImpersonating).toBe(false);
  });

  it("returns actor and effective labels while impersonating", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "sandra-user",
        email: "spielbetrieb@fcallschwil.ch",
        firstName: "Sandra",
        lastName: "Fischer",
        isImpersonating: true,
        actorUserId: "admin-user",
        actorEmail: "it@fcallschwil.ch",
        actorName: "FC Allschwil Club Admin",
      },
    });
    const response = await GET();
    const body = await response.json();
    expect(body.isImpersonating).toBe(true);
    expect(body.effectiveDisplayName).toContain("Sandra");
    expect(body.actorDisplayName).toContain("Club Admin");
    expect(body.effectiveUserId).toBe("sandra-user");
    expect(body.actorUserId).toBe("admin-user");
  });
});
