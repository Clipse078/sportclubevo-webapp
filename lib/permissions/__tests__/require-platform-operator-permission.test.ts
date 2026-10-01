import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mockGetRequestAuthSession = vi.fn();
const mockRedirect = vi.fn((url: string): never => {
  throw new Error(`REDIRECT:${url}`);
});
const mockFindUnique = vi.fn();
const mockHasPermission = vi.fn();

vi.mock("@/lib/auth/get-request-auth-session", () => ({
  getRequestAuthSession: mockGetRequestAuthSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: mockHasPermission,
  }),
}));

const { requirePlatformOperatorPermission, requirePlatformWorkspaceOperator } =
  await import("../require-platform-operator-permission");

function platformSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "platform-1",
      effectiveUserId: "platform-1",
      actorUserId: "platform-1",
      isImpersonating: false,
      activeTenantId: null,
      roleKeys: ["super_admin"],
      ...overrides,
    },
  };
}

describe("requirePlatformOperatorPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestAuthSession.mockResolvedValue(platformSession());
    mockFindUnique.mockResolvedValue({ isActive: true });
    mockHasPermission.mockResolvedValue(true);
  });

  it("redirects unauthenticated users to login", async () => {
    mockGetRequestAuthSession.mockResolvedValue(null);
    await expect(
      requirePlatformOperatorPermission(PERMISSIONS.TENANTS_MANAGE),
    ).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects impersonated users to dashboard", async () => {
    mockGetRequestAuthSession.mockResolvedValue(
      platformSession({ isImpersonating: true }),
    );
    await expect(
      requirePlatformOperatorPermission(PERMISSIONS.TENANTS_MANAGE),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockHasPermission).not.toHaveBeenCalled();
  });

  it("redirects actor/effective mismatch to dashboard", async () => {
    mockGetRequestAuthSession.mockResolvedValue(
      platformSession({ effectiveUserId: "other-user" }),
    );
    await expect(
      requirePlatformOperatorPermission(PERMISSIONS.TENANTS_MANAGE),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects when platform permission is denied", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(
      requirePlatformOperatorPermission(PERMISSIONS.TENANTS_MANAGE),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("returns session for active platform operator with permission", async () => {
    const session = await requirePlatformOperatorPermission(PERMISSIONS.TENANTS_MANAGE);
    expect(session.user.id).toBe("platform-1");
    expect(mockHasPermission).toHaveBeenCalledWith({
      userId: "platform-1",
      permission: PERMISSIONS.TENANTS_MANAGE,
    });
  });
});

describe("requirePlatformWorkspaceOperator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestAuthSession.mockResolvedValue(platformSession());
    mockFindUnique.mockResolvedValue({ isActive: true });
  });

  it("redirects unauthenticated users to login", async () => {
    mockGetRequestAuthSession.mockResolvedValue(null);
    await expect(requirePlatformWorkspaceOperator()).rejects.toThrow(
      "REDIRECT:/login",
    );
  });

  it("redirects impersonated users to dashboard", async () => {
    mockGetRequestAuthSession.mockResolvedValue(
      platformSession({ isImpersonating: true }),
    );
    await expect(requirePlatformWorkspaceOperator()).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("redirects club workspace users to dashboard", async () => {
    mockGetRequestAuthSession.mockResolvedValue(
      platformSession({ activeTenantId: "tenant-1", roleKeys: ["super_admin"] }),
    );
    await expect(requirePlatformWorkspaceOperator()).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("redirects when session is not a platform super-admin", async () => {
    mockGetRequestAuthSession.mockResolvedValue(
      platformSession({ roleKeys: ["club_admin"] }),
    );
    await expect(requirePlatformWorkspaceOperator()).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("returns session for platform workspace operator", async () => {
    const session = await requirePlatformWorkspaceOperator();
    expect(session.user.id).toBe("platform-1");
    expect(mockHasPermission).not.toHaveBeenCalled();
  });
});
