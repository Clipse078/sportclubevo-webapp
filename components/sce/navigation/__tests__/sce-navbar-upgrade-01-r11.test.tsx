/**
 * @vitest-environment jsdom
 *
 * SCE-NAVBAR-UPGRADE-01-R11 — desktop utilities + season presentation
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { SceRow2SeasonContext } from "@/components/sce/navigation/SceRow2SeasonContext";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => (key === "seasonLabel" ? "Saison" : key),
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

describe("SCE-NAVBAR-UPGRADE-01-R11 shell polish", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("keeps notifications and avatar without desktop hamburger", () => {
    render(
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="FC Allschwil"
        activeSeasonLabel="2026/2027"
        activeSeasonKey="2026/2027"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    expect(screen.queryByTestId("global-nav-hamburger")).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByTestId("account-menu")).toBeInTheDocument();
    expect(screen.getByTestId("global-nav-mobile-menu")).toBeInTheDocument();
  });

  it("renders full localized season label in Row 2 wide tier", () => {
    render(
      <SceRow2SeasonContext
        platformWorkspace={false}
        activeSeasonLabel="2026/2027"
        activeSeasonKey="2026/2027"
        seasonSwitchLabel="Saison wechseln"
      />,
    );

    const row2 = screen.getByTestId("sce-row2-season-context");
    const wideSwitcher = row2.querySelector('[data-sce-season-display="wide"]');
    expect(wideSwitcher).toHaveTextContent("Saison 2026/2027");
    expect(wideSwitcher).toHaveAccessibleName(/Saison wechseln: Saison 2026\/2027/);
  });
});
