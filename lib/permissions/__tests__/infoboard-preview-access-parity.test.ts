/**
 * Infoboard preview shell ↔ embed parity — view actors must reach the frame with
 * INFOBOARD_READ permissions; embed denials must not redirect to /dashboard.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestAuthSession: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/get-request-auth-session", () => ({
  getRequestAuthSession: mocks.getRequestAuthSession,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { INFOBOARD_READ_PERMISSIONS } from "@/lib/permissions/content-view-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { resolveRequestAnyPermission } from "@/lib/permissions/resolve-request-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const viewerSession = {
  user: {
    id: "admin-actor",
    effectiveUserId: "viewer-effective",
    activeTenantId: "tenant-fca",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveRequestAnyPermission — Benutzeransicht effective actor", () => {
  it("evaluates permissions for effectiveUserId, not the impersonating actor", async () => {
    mocks.getRequestAuthSession.mockResolvedValue(viewerSession);
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.INFOBOARD_VIEW],
    });

    const result = await resolveRequestAnyPermission([...INFOBOARD_READ_PERMISSIONS]);

    expect(result.kind).toBe("granted");
    expect(mocks.getRequestEffectivePermissions).toHaveBeenCalledWith(
      "viewer-effective",
      "tenant-fca",
    );
  });

  it("returns forbidden instead of redirecting (embed-safe)", async () => {
    mocks.getRequestAuthSession.mockResolvedValue(viewerSession);
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [],
    });

    const result = await resolveRequestAnyPermission([...INFOBOARD_READ_PERMISSIONS]);

    expect(result.kind).toBe("forbidden");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("requireAnyPermission — shared redirect preserved for full pages", () => {
  it("still redirects denied full-page navigation to /dashboard", async () => {
    mocks.getRequestAuthSession.mockResolvedValue({
      user: { id: "user-1", activeTenantId: "tenant-1" },
    });
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [],
    });

    await expect(
      requireAnyPermission([...INFOBOARD_READ_PERMISSIONS]),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("preview-frame guard contract", () => {
  it("embed route accepts INFOBOARD_VIEW-only tenants", async () => {
    mocks.getRequestAuthSession.mockResolvedValue({
      user: { id: "user-1", activeTenantId: "tenant-fca" },
    });
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.INFOBOARD_VIEW],
    });

    const access = await resolveRequestAnyPermission([...INFOBOARD_READ_PERMISSIONS]);
    expect(access.kind).toBe("granted");
  });

  it("would have denied INFOBOARD_VIEW under the old manage-only embed guard", async () => {
    mocks.getRequestAuthSession.mockResolvedValue({
      user: { id: "user-1", activeTenantId: "tenant-fca" },
    });
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.INFOBOARD_VIEW],
    });

    const legacyManageOnly = await resolveRequestAnyPermission([
      PERMISSIONS.INFOBOARD_MANAGE,
      PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
    ]);
    expect(legacyManageOnly.kind).toBe("forbidden");
  });
});