import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  clubDashboard: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/components/admin/dashboard/ClubDashboardView", () => ({
  default: mocks.clubDashboard,
}));

import DashboardPage from "../page";

describe("SCE-SUPERADMIN-SHELL-01B — /dashboard routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clubDashboard.mockReturnValue(null);
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("redirects platform superadmin without tenant to /dashboard/platform", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        activeTenantId: null,
        roleKeys: ["super_admin"],
      },
    });

    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/dashboard/platform");
    expect(mocks.clubDashboard).not.toHaveBeenCalled();
  });

  it("renders club dashboard for club workspace users", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        activeTenantId: "tenant-1",
        roleKeys: ["club_admin"],
      },
    });

    await expect(DashboardPage()).resolves.toBeDefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
