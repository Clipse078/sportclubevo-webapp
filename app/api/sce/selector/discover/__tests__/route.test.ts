/**
 * SCE-SELECTOR-01R2 — generic selector discover authorization
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveTenant: vi.fn(),
  requireApiAnyPermission: vi.fn(),
  discoverSceSelectorItems: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/tenants/active-tenant", () => ({ getActiveTenant: mocks.getActiveTenant }));
vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));
vi.mock("@/lib/sce/list-selector/discover-selector-items", () => ({
  discoverSceSelectorItems: mocks.discoverSceSelectorItems,
}));

import { GET } from "../route";
import { SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN } from "@/lib/sce/list-selector/selector-discover-api-errors";

describe("GET /api/sce/selector/discover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: { user: { id: "user-1" } },
    });
    mocks.discoverSceSelectorItems.mockResolvedValue([]);
  });

  it("returns 400 for missing authContext", async () => {
    const res = await GET(
      new Request("http://local/api/sce/selector/discover?sources=orgUnit"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid authContext (no arbitrary permission input)", async () => {
    const res = await GET(
      new Request(
        "http://local/api/sce/selector/discover?authContext=users.manage_memberships&sources=orgUnit",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when TARGET_GROUP source requested in TARGET_GROUP_MANAGEMENT context", async () => {
    const res = await GET(
      new Request(
        "http://local/api/sce/selector/discover?authContext=TARGET_GROUP_MANAGEMENT&sources=targetGroup",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 JSON for unauthorized callers", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: { user: { id: "user-1" } },
    });
    const res = await GET(
      new Request(
        "http://local/api/sce/selector/discover?authContext=TARGET_GROUP_MANAGEMENT&sources=orgUnit",
      ),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.getActiveTenant.mockResolvedValue(null);
    const res = await GET(
      new Request(
        "http://local/api/sce/selector/discover?authContext=TARGET_GROUP_MANAGEMENT&sources=orgUnit",
      ),
    );
    expect(res.status).toBe(401);
  });
});
