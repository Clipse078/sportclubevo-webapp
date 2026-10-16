/**
 * @vitest-environment jsdom
 *
 * R9R2 — Infoboard Übersicht/Vorschau contextual navigation (on-demand L3 panel)
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/infoboard/preview",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push, prefetch: vi.fn(), replace: vi.fn() }),
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

const manageInfoboardKeys = [
  PERMISSIONS.INFOBOARD_VIEW,
  PERMISSIONS.INFOBOARD_MANAGE,
  PERMISSIONS.WEBSITE_VIEW,
];

async function openPublishingL3Panel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("primary-domain-panel-trigger-publishing"));
  const panel = screen.getByTestId("sce-domain-nav-panel");
  await user.click(within(panel).getByRole("button", { name: /Infoboard/i }));
  return panel;
}

describe("AppShellNavigation — Infoboard R9R2", () => {
  it("from preview — Übersicht link targets overview and Vorschau is active in the L3 panel", async () => {
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={manageInfoboardKeys}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    const panel = await openPublishingL3Panel(user);
    const overview = within(panel).getByRole("link", { name: "Übersicht" });
    const preview = within(panel).getByRole("link", { name: "Vorschau" });
    expect(overview).toHaveAttribute("href", "/dashboard/infoboard");
    expect(preview).toHaveAttribute("aria-current", "page");
    expect(overview).not.toHaveAttribute("aria-current");
  });

  it("clicking Übersicht from preview requests navigation to overview", async () => {
    push.mockClear();
    const user = userEvent.setup();
    render(
      <AppShellNavigation
        permissionKeys={manageInfoboardKeys}
        workspaceContext="club"
        clubName="Test Club"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    const panel = await openPublishingL3Panel(user);
    await user.click(within(panel).getByRole("link", { name: "Übersicht" }));
    expect(push).toHaveBeenCalled();
    const navigated = push.mock.calls.some(
      (call) => call[0] === "/dashboard/infoboard" || call[0]?.startsWith?.("/dashboard/infoboard"),
    );
    expect(navigated).toBe(true);
  });
});
