/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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
  default: () => null,
}));

vi.mock("@/components/admin/layout/AccountMenu", () => ({
  default: () => null,
}));

vi.mock("@/lib/nav/use-primary-nav-layout-tier", () => ({
  usePrimaryNavLayoutTier: () => "desktop",
  maxInlineDomainsForTier: () => 8,
}));

describe("AppShellNavigation dashboard home", () => {
  it("shows the primary header without a persistent module row and omits dashboard from L1", () => {
    render(
      <AppShellNavigation
        permissionKeys={Object.values(PERMISSIONS)}
        workspaceContext="club"
        clubName="FC Allschwil"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    expect(screen.getByTestId("sce-global-navigation")).toBeInTheDocument();
    expect(screen.queryByTestId("domain-secondary-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("domain-contextual-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-row2-context-workspace-empty")).not.toBeInTheDocument();
    const primaryNav = screen.getByTestId("sce-primary-navigation");
    expect(
      within(primaryNav).queryByRole("link", { name: /domains.dashboard/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("tenant-identity").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("tenant-identity")[0]).toHaveTextContent("FC Allschwil");

    const planningLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("data-nav-domain") === "planning");
    expect(planningLinks.every((link) => link.getAttribute("aria-current") !== "page")).toBe(true);
  });
});
