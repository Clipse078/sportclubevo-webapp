/**
 * @vitest-environment jsdom
 *
 * SCE-VISUAL-06R1 — mobile explorer search placement
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
  usePrimaryNavLayoutTier: () => "mobile",
  maxInlineDomainsForTier: () => 3,
}));

function isBeforeInDocument(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("SCE-VISUAL-06R1 mobile explorer", () => {
  it("keeps search above workspace and domain-first flow", async () => {
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={Object.values(PERMISSIONS)}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );
    await user.click(screen.getByTestId("global-nav-hamburger"));

    expect(screen.getAllByTestId("global-nav-explorer-search")).toHaveLength(1);
    const searchShell = screen.getByTestId("global-nav-explorer-search-shell");
    const workspace = screen.getByTestId("global-nav-explorer-workspace");
    expect(isBeforeInDocument(searchShell, workspace)).toBe(true);
    expect(screen.getByTestId("global-nav-explorer-domain-rail")).toBeVisible();

    await user.click(screen.getByTestId("global-nav-explorer-domain-planning"));
    expect(screen.getByTestId("global-nav-drawer-tree")).toBeInTheDocument();
  });
});
