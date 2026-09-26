/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-02 — explorer + planning nav SCE icon adoption
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/planner/week",
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

describe("AppShellNavigation SCE-ICONS-02", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("renders approved SCE icons for planning secondary nav destinations", () => {
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

    const weekLink = screen.getByRole("link", { name: /Wochenplaner/i });
    expect(weekLink).toHaveAttribute("data-sce-nav-icon", "week-planner");
    expect(weekLink.querySelector('[data-sce-nav-destination-icon="week-planner"]')).toBeTruthy();

    const eventsLink = screen.getByRole("link", { name: /Veranstaltungen/i });
    expect(eventsLink).toHaveAttribute("data-sce-nav-icon", "events");
    expect(eventsLink.querySelector('[data-sce-nav-destination-icon="events"]')).toBeTruthy();
  });

  it("shows SCE module icons in explorer module pane and search results", async () => {
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
    expect(
      screen
        .getByTestId("global-nav-drawer-tree")
        .querySelector('[data-sce-nav-destination-icon="week-planner"]'),
    ).toBeTruthy();

    const search = screen.getByTestId("global-nav-explorer-search");
    await user.type(search, "Spiele");
    const results = screen.getByTestId("global-nav-explorer-search-results");
    expect(
      results.querySelector('[data-sce-nav-destination-icon="match"]'),
    ).toBeTruthy();
  });
});
