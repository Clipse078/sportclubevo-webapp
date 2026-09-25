/**
 * @vitest-environment jsdom
 *
 * SCE-VISUAL-03R2 — global hamburger drawer interaction
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/admin/branding/SidebarPlatformBrand", () => ({
  default: () => <div data-testid="sce-brand" />,
}));

vi.mock("@/components/admin/layout/HeaderTenantIdentity", () => ({
  default: ({ tenantName }: { tenantName: string }) => (
    <div data-testid="tenant-identity">{tenantName}</div>
  ),
}));

vi.mock("@/components/admin/layout/AdminPageActions", () => ({
  default: () => null,
}));

vi.mock("@/components/admin/notifications/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/admin/layout/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));

vi.mock("@/lib/nav/use-primary-nav-layout-tier", () => ({
  usePrimaryNavLayoutTier: () => "desktop",
  maxInlineDomainsForTier: () => 8,
}));

describe("AppShellNavigation global menu", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("opens and closes the permission-aware global navigation drawer", async () => {
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    const hamburger = screen.getByTestId("global-nav-hamburger");
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();

    await user.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
    const drawer = screen.getByTestId("global-nav-drawer");
    expect(drawer).toBeVisible();
    expect(screen.getByTestId("global-nav-explorer-domain-rail")).toBeInTheDocument();
    await user.click(screen.getByTestId("global-nav-explorer-domain-planning"));
    const tree = screen.getByTestId("global-nav-drawer-tree");
    expect(tree).toHaveTextContent("Wochenplaner");

    await user.click(screen.getByTestId("global-nav-drawer-close"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the drawer when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    await user.click(screen.getByTestId("global-nav-hamburger"));
    expect(screen.getByTestId("global-nav-drawer")).toBeInTheDocument();
    await user.click(screen.getByTestId("global-nav-drawer-backdrop"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });
});
