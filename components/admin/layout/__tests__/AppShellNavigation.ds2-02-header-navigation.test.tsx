/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-02 — premium uppercase icon-free header navigation
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/planner/week",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn(), replace: vi.fn() }),
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

describe("AppShellNavigation SCE-DS2-02", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("renders uppercase primary nav labels without decorative domain icons", () => {
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

    const primaryNav = screen.getByTestId("sce-primary-navigation");
    expect(primaryNav.querySelector(".sce-global-primary-nav-domain-icon")).toBeNull();
    expect(primaryNav.querySelector('[data-sce-nav-destination-icon]')).toBeNull();

    const planningTrigger = screen.getByTestId("primary-domain-panel-trigger-planning");
    expect(planningTrigger.className).toContain("sce-global-primary-nav-item");
    const label = planningTrigger.querySelector(".sce-global-primary-nav-domain-label");
    expect(label).toBeTruthy();
    expect(label?.textContent?.length).toBeGreaterThan(0);
  });

  it("keeps keyboard-accessible domain panel without destination icons", async () => {
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

    const trigger = screen.getByTestId("primary-domain-panel-trigger-planning");
    trigger.focus();
    await user.keyboard("{Enter}");

    const panel = screen.getByTestId("sce-domain-nav-panel");
    expect(within(panel).queryByTestId(/sce-nav-destination-icon/)).toBeNull();
    expect(panel.querySelector('[data-sce-nav-destination-icon]')).toBeNull();

    const weekLink = within(panel).getByRole("link", { name: /Wochenplaner/i });
    weekLink.focus();
    expect(weekLink).toHaveFocus();
  });
});
