/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/platform",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useSidebarResize", () => ({
  useSidebarResize: () => ({
    width: 224,
    isResizing: false,
    onResizePointerDown: vi.fn(),
    onResizeKeyDown: vi.fn(),
  }),
}));

describe("SCE-SUPERADMIN-SHELL-01B — platform sidebar branding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows SportClubEvo Platform identity without club name", () => {
    render(
      <AdminSidebar
        workspaceContext="platform"
        permissionKeys={[
          PERMISSIONS.USERS_MANAGE,
          PERMISSIONS.TENANTS_VIEW,
        ]}
        clubName="FC Allschwil"
        logoUrl="/logo.png"
      />,
    );

    expect(screen.getByText("SportClubEvo Platform")).toBeInTheDocument();
    expect(screen.queryByText("FC Allschwil")).not.toBeInTheDocument();
    expect(screen.getByText("Platform Dashboard")).toBeInTheDocument();
  });
});
