/**
 * @vitest-environment jsdom
 *
 * SCE-NAVBAR-UPGRADE-01-R9 — domain panel interaction smoke tests
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/org-units",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

describe("SCE-NAVBAR-UPGRADE-01-R9 domain panel interactions", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("opens club hierarchical panel, shows L3 column, closes on Escape", async () => {
    render(
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="FC Allschwil"
        activeSeasonLabel="2025/2026"
        activeSeasonKey="2025/2026"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    const clubTrigger = screen.getByTestId("primary-domain-panel-trigger-club");
    const user = userEvent.setup();
    await user.click(clubTrigger);

    const panel = screen.getByTestId("sce-domain-nav-panel");
    expect(panel).toHaveAttribute("data-sce-domain-nav-panel-mode", "hierarchical");
    expect(screen.getByText("Organisationseinheiten")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    expect(clubTrigger).toHaveFocus();
  });

  it("switches open panel when another L1 domain is toggled", async () => {
    render(
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="FC Allschwil"
        activeSeasonLabel="2025/2026"
        activeSeasonKey="2025/2026"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    expect(screen.getByTestId("sce-domain-nav-panel")).toBeInTheDocument();

    await user.click(screen.getByTestId("primary-domain-panel-trigger-planning"));
    expect(screen.getByTestId("sce-domain-nav-panel")).toHaveAttribute(
      "data-sce-domain-nav-panel-mode",
      "simple",
    );
  });
});
