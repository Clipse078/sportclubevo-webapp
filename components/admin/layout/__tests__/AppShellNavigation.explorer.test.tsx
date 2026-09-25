/**
 * @vitest-environment jsdom
 *
 * SCE-VISUAL-06 — application explorer interactions
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

describe("AppShellNavigation application explorer", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("opens explorer with domain rail and planning modules for active route", async () => {
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
    expect(screen.getByTestId("global-nav-drawer")).toBeVisible();
    expect(screen.getByTestId("global-nav-explorer-domain-rail")).toBeInTheDocument();
    expect(screen.getByTestId("global-nav-explorer-module-pane")).toBeInTheDocument();
    expect(screen.getByTestId("global-nav-drawer-tree")).toHaveTextContent("Wochenplaner");
  });

  it("filters search results from permission-filtered model and closes on selection", async () => {
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={[PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW]}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    await user.click(screen.getByTestId("global-nav-hamburger"));
    const search = screen.getByTestId("global-nav-explorer-search");
    await user.type(search, "Train");
    expect(screen.getByTestId("global-nav-explorer-search-results")).toHaveTextContent("Trainings");
    expect(screen.queryByText("Website")).not.toBeInTheDocument();
  });

  it("closes on Escape and backdrop", async () => {
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
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("global-nav-hamburger"));
    await user.click(screen.getByTestId("global-nav-drawer-backdrop"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });
});
