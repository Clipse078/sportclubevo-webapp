/**
 * @vitest-environment jsdom
 *
 * SCE-NAVBAR-UPGRADE-01 — navigation semantics + utilities
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { SceGlobalSeasonSwitcher } from "@/components/sce/navigation/SceGlobalSeasonSwitcher";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/planner/week",
  useSearchParams: () => new URLSearchParams("season=2025%2F2026"),
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
  usePrimaryNavLayoutTier: () => "laptop",
  maxInlineDomainsForTier: () => 8,
}));

describe("SceGlobalSeasonSwitcher", () => {
  it("prefers explicit season query over persisted active season label", () => {
    render(
      <SceGlobalSeasonSwitcher
        activeSeasonLabel="2024/2025"
        activeSeasonKey="2024/2025"
        selectedSeasonKey="2025/2026"
      />,
    );
    const link = screen.getByTestId("global-season-switcher");
    expect(link).toHaveAttribute("href", "/dashboard/seasons?season=2025%2F2026");
    expect(link).toHaveTextContent("2025/2026");
  });
});

describe("AppShellNavigation landmarks", () => {
  const adminKeys = Object.values(PERMISSIONS);

  it("exposes primary nav and tenant row with on-demand domain panel disclosures", async () => {
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

    expect(screen.getByTestId("sce-global-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("sce-primary-navigation")).toHaveAttribute(
      "aria-label",
      "primaryNavAria",
    );

    const moduleNav = screen.getByTestId("domain-secondary-nav");
    expect(moduleNav).toHaveAttribute("aria-label", "moduleNavAria");

    const planningTrigger = screen.getByTestId("primary-domain-panel-trigger-planning");
    expect(planningTrigger).toHaveAttribute("aria-expanded", "false");
    expect(planningTrigger).toHaveClass("sce-global-primary-nav-item--active");

    expect(screen.queryByRole("link", { name: "Wochenplaner" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(planningTrigger);
    expect(planningTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("sce-domain-nav-panel")).toBeInTheDocument();
    const wochenplaner = screen.getByRole("link", { name: "Wochenplaner" });
    expect(wochenplaner).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByTestId("global-nav-hamburger"));
    expect(screen.getByTestId("global-nav-drawer")).toBeInTheDocument();
  });

  it("aligns L1/L2 through the shared navigation spine grid", () => {
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

    const primarySpine = document.querySelector('[data-sce-nav-spine-row="primary"]');
    expect(primarySpine).toBeTruthy();
    expect(primarySpine?.querySelector('[data-sce-nav-brand-rail="occupied"]')).toBeTruthy();
    expect(primarySpine?.querySelector("[data-sce-nav-workspace]")).toBeTruthy();
    expect(primarySpine?.querySelector("[data-sce-nav-utilities]")).toBeTruthy();

    const moduleSpine = document.querySelector('[data-sce-nav-spine-row="module"]');
    expect(moduleSpine).toBeTruthy();
    expect(moduleSpine?.querySelector('[data-sce-nav-brand-rail="occupied"]')).toBeTruthy();
    expect(moduleSpine?.querySelector("[data-sce-nav-workspace]")).toBeTruthy();
    expect(moduleSpine?.querySelector("[data-sce-nav-utilities]")).toBeTruthy();
    expect(screen.getAllByTestId("tenant-identity").length).toBeGreaterThan(0);
    const primaryUtilities = primarySpine?.querySelector("[data-sce-nav-utilities]");
    expect(primaryUtilities).toBeTruthy();
    expect(
      within(primaryUtilities as HTMLElement).queryByTestId("global-season-switcher"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("sce-row2-season-context")).toBeInTheDocument();
  });
});
