/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R9 — persistent desktop L2/L3 rows are gone; the mega menu remains.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard/planner/week",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
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

const DOMAIN_ROUTES = [
  ["/dashboard/org-units", "club"],
  ["/dashboard/planner/week", "planning"],
  ["/dashboard/website", "publishing"],
  ["/dashboard/communication/mitteilungen", "communication"],
  ["/dashboard/admin/branding", "admin"],
] as const;

function renderShell(permissionKeys: string[] = adminKeys) {
  return render(
    <div data-testid="page-shell">
      <AppShellNavigation
        permissionKeys={permissionKeys}
        workspaceContext="club"
        clubName="FC Allschwil"
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />
      <main data-testid="page-content">Page heading</main>
    </div>,
  );
}

function expectNoPersistentRows() {
  expect(screen.queryByTestId("domain-secondary-nav")).not.toBeInTheDocument();
  expect(screen.queryByTestId("domain-contextual-nav")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sce-row2-context-workspace-empty")).not.toBeInTheDocument();
  expect(screen.queryByTestId("sce-domain-section-heading")).not.toBeInTheDocument();
  const header = screen.getByTestId("sce-global-navigation");
  expect(header.querySelector(".sce-global-module-nav")).toBeNull();
  expect(header.querySelector(".sce-global-context-nav")).toBeNull();
  expect(header.querySelector("[data-sce-nav-spine-row='module']")).toBeNull();
  expect(header.querySelector("[data-sce-nav-spine-row='context']")).toBeNull();
}

describe("SCE-DS2-05B-R9 remove redundant horizontal navigation", () => {
  it("keeps L1 and omits persistent L2/L3 rows on every club domain route", () => {
    navigation.pathname = "/dashboard/planner/week";
    const view = renderShell();

    for (const [pathname, domainId] of DOMAIN_ROUTES) {
      navigation.pathname = pathname;
      view.rerender(
        <div data-testid="page-shell">
          <AppShellNavigation
            permissionKeys={adminKeys}
            workspaceContext="club"
            clubName="FC Allschwil"
            firstName="Test"
            lastName="User"
            email="test@example.com"
          />
          <main data-testid="page-content">Page heading</main>
        </div>,
      );

      expect(screen.getByTestId("sce-primary-navigation")).toBeInTheDocument();
      expect(screen.getByTestId(`primary-domain-panel-trigger-${domainId}`)).toHaveClass(
        "sce-global-primary-nav-item--active",
      );
      expectNoPersistentRows();
      expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    }
  });

  it("opens functional mega-menu L2/L3 links with route-active highlighting", async () => {
    navigation.pathname = "/dashboard/planner/week";
    const user = userEvent.setup();
    const view = renderShell();

    const planning = screen.getByTestId("primary-domain-panel-trigger-planning");
    expect(planning).toHaveClass("sce-global-primary-nav-item--active");
    await user.click(planning);

    const panel = screen.getByTestId("sce-domain-nav-panel");
    const wochenplaner = within(panel).getByRole("link", { name: "Wochenplaner" });
    expect(wochenplaner).toHaveAttribute("aria-current", "page");
    expect(wochenplaner).toHaveClass("sce-domain-nav-panel-l2-link--active");
    expect(wochenplaner.getAttribute("href")).toContain("/dashboard/planner/week");
    expectNoPersistentRows();
    expect(screen.getByTestId("sce-global-navigation").contains(panel)).toBe(false);

    await user.keyboard("{Escape}");
    navigation.pathname = "/dashboard/org-units";
    view.unmount();
    renderShell();
    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const clubPanel = screen.getByTestId("sce-domain-nav-panel");
    const organisation = within(clubPanel).getByRole("button", { name: /Organisation/i });
    expect(organisation.className).toContain("sce-domain-nav-panel-l2-control--active");
    const orgUnits = within(clubPanel).getByRole("link", { name: "Organisationseinheiten" });
    expect(orgUnits).toHaveAttribute("aria-current", "page");
    expect(orgUnits).toHaveClass("sce-domain-nav-panel-l3-link--active");
  });

  it("preserves RBAC filtering in the primary header and mega menu", async () => {
    navigation.pathname = "/dashboard/planner/week";
    const user = userEvent.setup();
    const limited = renderShell([PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW]);

    expect(screen.getByTestId("primary-domain-panel-trigger-planning")).toBeInTheDocument();
    expect(screen.queryByTestId("primary-domain-panel-trigger-publishing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("primary-domain-panel-trigger-admin")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("primary-domain-panel-trigger-planning"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    expect(
      within(panel)
        .getAllByRole("link")
        .some((link) => /Trainings|Wochenplaner/.test(link.textContent ?? "")),
    ).toBe(true);
    expect(within(panel).queryByRole("link", { name: "Website" })).not.toBeInTheDocument();
    expectNoPersistentRows();

    limited.unmount();
    renderShell(adminKeys);
    expect(screen.getByTestId("primary-domain-panel-trigger-publishing")).toBeInTheDocument();
    expect(screen.getByTestId("primary-domain-panel-trigger-admin")).toBeInTheDocument();
    expect(screen.getByTestId("primary-domain-panel-trigger-club")).toBeInTheDocument();
    expect(screen.getByTestId("primary-domain-panel-trigger-communication")).toBeInTheDocument();
  });

  it("does not reflow page content when the mega menu opens and closes", async () => {
    navigation.pathname = "/dashboard/infoboard";
    const user = userEvent.setup();
    renderShell();

    const shell = screen.getByTestId("page-shell");
    const header = screen.getByTestId("sce-global-navigation");
    const contentIndex = () =>
      [...shell.children].findIndex((node) => node.getAttribute("data-testid") === "page-content");
    const headerChildren = header.childElementCount;
    const indexBefore = contentIndex();
    expect(indexBefore).toBeGreaterThanOrEqual(0);
    expectNoPersistentRows();

    await user.click(screen.getByTestId("primary-domain-panel-trigger-publishing"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    expect(header.contains(panel)).toBe(false);
    expect(shell.contains(panel)).toBe(false);
    expect(header.childElementCount).toBe(headerChildren);
    expect(contentIndex()).toBe(indexBefore);
    expect(screen.getByTestId("page-content")).toHaveTextContent("Page heading");

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    expect(header.childElementCount).toBe(headerChildren);
    expect(contentIndex()).toBe(indexBefore);
    expectNoPersistentRows();
  });

  it("keeps the mobile navigation drawer functional", async () => {
    navigation.pathname = "/dashboard";
    const user = userEvent.setup();
    renderShell();

    const menu = screen.getByTestId("global-nav-mobile-menu");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await user.click(menu);
    const drawer = screen.getByTestId("global-nav-drawer");
    expect(drawer).toBeInTheDocument();
    expect(screen.getByTestId("global-nav-explorer-domain-rail")).toBeInTheDocument();
    await user.click(screen.getByTestId("global-nav-explorer-domain-planning"));
    expect(screen.getByTestId("global-nav-drawer-tree")).toHaveTextContent("Wochenplaner");
    expectNoPersistentRows();
    await user.click(screen.getByTestId("global-nav-drawer-close"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });
});
