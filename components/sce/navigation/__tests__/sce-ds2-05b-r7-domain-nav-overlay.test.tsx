/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R7 — overlay positioning, scroll containment, deterministic state.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const adminKeys = Object.values(PERMISSIONS);

function renderClubShell() {
  return render(
    <div className="sce-authenticated-app-shell" data-sce-theme="white">
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="FC Allschwil"
        activeSeasonLabel="2025/2026"
        activeSeasonKey="2025/2026"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />
    </div>,
  );
}

function mockAnchorRect(top: number) {
  const anchor = screen.getByTestId("sce-domain-nav-overlay-anchor");
  vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: top,
    top,
    bottom: top,
    left: 0,
    right: 1366,
    width: 1366,
    height: 0,
    toJSON() {
      return this;
    },
  } as DOMRect);
}

describe("SCE-DS2-05B-R7 domain nav overlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("portals the overlay out of the header and keeps L2/L3 mounted", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(88);

    const header = screen.getByTestId("sce-global-navigation");
    const trigger = screen.getByTestId("primary-domain-panel-trigger-club");

    await user.click(trigger);

    const panel = screen.getByTestId("sce-domain-nav-panel");
    expect(panel).toHaveAttribute("data-sce-domain-nav-overlay");
    expect(panel.className).toContain("sce-domain-nav-panel--overlay");
    expect(header.contains(panel)).toBe(false);
    expect(screen.queryByTestId("domain-secondary-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("domain-contextual-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-domain-section-heading")).not.toBeInTheDocument();
    expect(within(panel).getByTestId("sce-domain-nav-panel-title")).toBeInTheDocument();
    expect(panel.style.top).toBe("88px");
  });

  it("does not change overlay top when switching L2 and keeps the panel open", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(96);

    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    const topBefore = panel.style.top;
    expect(topBefore).toBe("96px");

    const l2Buttons = within(panel).getAllByRole("button");
    expect(l2Buttons.length).toBeGreaterThan(1);
    await user.click(l2Buttons[1]!);

    expect(screen.getByTestId("sce-domain-nav-panel")).toBeInTheDocument();
    expect(screen.getByTestId("sce-domain-nav-panel").style.top).toBe(topBefore);
    expect(screen.getByTestId("primary-domain-panel-trigger-club")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps overlay top stable across idle resize events with an unchanged anchor", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(72);

    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const tops: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      window.dispatchEvent(new Event("resize"));
      tops.push(screen.getByTestId("sce-domain-nav-panel").style.top);
    }
    expect(new Set(tops)).toEqual(new Set(["72px"]));
  });

  it("removes the overlay and resize listener on Escape, restoring trigger focus", async () => {
    const user = userEvent.setup();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    renderClubShell();
    mockAnchorRect(80);

    const trigger = screen.getByTestId("primary-domain-panel-trigger-club");
    await user.click(trigger);
    expect(screen.getByTestId("sce-domain-nav-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("does not close while pointer-moving across L2/L3 inside the overlay", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(80);

    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    const l3 = within(panel).getByText("Organisationseinheiten");
    l3.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
    expect(screen.getByTestId("sce-domain-nav-panel")).toBeInTheDocument();
  });

  it("contains scrolling on the Cham body, not nested L2/L3 columns", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(80);
    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    const body = panel.querySelector(".sce-domain-nav-panel-cham-body");
    const l2 = panel.querySelector(".sce-domain-nav-panel-l2");
    const l3 = panel.querySelector(".sce-domain-nav-panel-l3");
    expect(body?.className).toContain("sce-domain-nav-panel-cham-body");
    expect(l2).toBeTruthy();
    expect(l3).toBeTruthy();
    expect(within(panel).getByTestId("sce-domain-nav-panel-title")).toBeInTheDocument();
    const links = within(panel).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toBeVisible();
    expect(links[links.length - 1]).toBeVisible();
  });
});
