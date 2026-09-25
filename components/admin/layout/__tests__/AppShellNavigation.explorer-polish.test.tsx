/**
 * @vitest-environment jsdom
 *
 * SCE-VISUAL-06R1 — application explorer search position + scroll polish
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
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

function renderExplorerAdmin() {
  const adminKeys = Object.values(PERMISSIONS);
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
  return adminKeys;
}

function isBeforeInDocument(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("SCE-VISUAL-06R1 application explorer polish", () => {
  it("exposes exactly one explorer search input before the workspace", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const searches = screen.getAllByTestId("global-nav-explorer-search");
    expect(searches).toHaveLength(1);

    const header = screen.getByTestId("global-nav-explorer-header");
    const searchShell = screen.getByTestId("global-nav-explorer-search-shell");
    const workspace = screen.getByTestId("global-nav-explorer-workspace");

    expect(isBeforeInDocument(header, searchShell)).toBe(true);
    expect(isBeforeInDocument(searchShell, workspace)).toBe(true);
  });

  it("keeps header and search outside the module scroll region", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const modulePane = screen.getByTestId("global-nav-explorer-module-pane");
    expect(modulePane.className).toMatch(/overflow-y-auto/);
    expect(within(modulePane).queryByTestId("global-nav-explorer-search")).toBeNull();
    expect(within(modulePane).queryByTestId("global-nav-explorer-header")).toBeNull();
  });

  it("finds authorized modules and child destinations via search", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const search = screen.getByTestId("global-nav-explorer-search");
    await user.type(search, "Train");
    expect(screen.getByTestId("global-nav-explorer-search-results")).toHaveTextContent("Trainings");

    await user.clear(search);
    await user.type(search, "Woche");
    expect(screen.getByTestId("global-nav-explorer-search-results")).toHaveTextContent("Wochenplaner");
  });

  it("does not expose unauthorized destinations in search", async () => {
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
    await user.type(screen.getByTestId("global-nav-explorer-search"), "Website");
    expect(screen.queryByText("Website")).not.toBeInTheDocument();
  });

  it("closes explorer when selecting a search result link", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));
    await user.type(screen.getByTestId("global-nav-explorer-search"), "Train");
    const searchResults = screen.getByTestId("global-nav-explorer-search-results");
    await user.click(within(searchResults).getByRole("link", { name: /Trainings/i }));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });

  it("keeps domain rail structurally separate from module pane", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const workspace = screen.getByTestId("global-nav-explorer-workspace");
    expect(within(workspace).getByTestId("global-nav-explorer-domain-rail")).toBeInTheDocument();
    expect(within(workspace).getByTestId("global-nav-explorer-module-pane")).toBeInTheDocument();
  });

  it("preserves progressive disclosure for module children", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));
    await user.click(screen.getByTestId("global-nav-explorer-domain-organisation"));

    const expandButtons = within(screen.getByTestId("global-nav-drawer-tree")).queryAllByRole(
      "button",
      { expanded: false },
    );
    expect(expandButtons.length).toBeGreaterThan(0);
    await user.click(expandButtons[0]!);
    expect(expandButtons[0]).toHaveAttribute("aria-expanded", "true");
  });

  it("preserves dialog accessibility and close interactions", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const drawer = screen.getByTestId("global-nav-drawer");
    expect(drawer).toHaveAttribute("role", "dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");

    await user.click(screen.getByTestId("global-nav-drawer-close"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("global-nav-hamburger"));
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("global-nav-hamburger"));
    await user.click(screen.getByTestId("global-nav-drawer-backdrop"));
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });

  it("keeps sensible keyboard tab order with close before search in the drawer", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));

    const drawer = screen.getByTestId("global-nav-drawer");
    const close = within(drawer).getByTestId("global-nav-drawer-close");
    const search = within(drawer).getByTestId("global-nav-explorer-search");
    expect(isBeforeInDocument(close, search)).toBe(true);
  });

  it("closes explorer when selecting a module link from the tree", async () => {
    const user = userEvent.setup();
    renderExplorerAdmin();
    await user.click(screen.getByTestId("global-nav-hamburger"));
    const moduleLink = within(screen.getByTestId("global-nav-drawer-tree")).getByRole("link", {
      name: "Wochenplaner",
    });
    await user.click(moduleLink);
    expect(screen.queryByTestId("global-nav-drawer")).not.toBeInTheDocument();
  });

  it("maintains zero-orphan canonical navigation completeness", () => {
    const adminKeys = Object.values(PERMISSIONS);
    const model = buildAppNavigationModelForUser(adminKeys, "club");
    const sections = getVisibleNavSections(adminKeys, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.orphanedDestinations).toEqual([]);
    expect(report.reachableDestinations).toBe(report.canonicalVisibleDestinations);
    expect(report.canonicalVisibleDestinations).toBe(60);
  });
});

