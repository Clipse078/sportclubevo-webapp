/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-02 — explorer + planning nav SCE icon adoption
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
  usePrimaryNavLayoutTier: () => "laptop",
  maxInlineDomainsForTier: () => 8,
}));

describe("AppShellNavigation SCE-ICONS-02", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("renders approved SCE icons for planning secondary nav destinations", async () => {
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

    await user.click(screen.getByTestId("primary-domain-panel-trigger-planning"));
    const panel = screen.getByTestId("sce-domain-nav-panel");

    const weekLink = within(panel).getByRole("link", { name: /Wochenplaner/i });
    expect(weekLink.querySelector('[data-sce-nav-destination-icon="week-planner"]')).toBeTruthy();

    const programmeLink = within(panel).getByRole("link", { name: /Vereinsprogramm/i });
    const programmeIcon = programmeLink.querySelector('[data-sce-nav-destination-icon="calendar"]');
    expect(programmeIcon).toBeTruthy();
    expect(programmeIcon?.querySelector("svg")).toHaveClass("text-current");
    expect(programmeIcon?.innerHTML).not.toContain("--sce-icon-accent");

    const eventsLink = within(panel).getByRole("link", { name: /Veranstaltungen/i });
    expect(eventsLink.querySelector('[data-sce-nav-destination-icon="events"]')).toBeTruthy();

    const spieleLink = within(panel).getByRole("link", { name: /Spiele/i });
    expect(spieleLink.querySelector('[data-sce-nav-destination-icon="match"]')).toBeTruthy();
    expect(spieleLink.querySelector("circle")).toBeTruthy();
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

    await user.click(screen.getByTestId("global-nav-mobile-menu"));
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
