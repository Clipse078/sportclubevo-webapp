/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R10 — desktop mega-menu frame, active text, overlay stability.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

function renderClubShell(logoUrl: string | null = "/crests/cham.svg") {
  return render(
    <div
      className="sce-authenticated-app-shell"
      data-sce-theme="white"
      data-testid="page-shell"
    >
      <AppShellNavigation
        permissionKeys={adminKeys}
        workspaceContext="club"
        clubName="SC Cham"
        logoUrl={logoUrl}
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />
      <main data-testid="page-content">Dashboard</main>
    </div>,
  );
}

describe("SCE-DS2-05B-R10 desktop mega menu", () => {
  it("renders the tenant crest beside the club name and omits horizontal L2/L3 rows", () => {
    renderClubShell();
    const header = screen.getByTestId("sce-global-navigation");
    const crests = within(header).getAllByTestId("tenant-header-crest");
    const names = within(header).getAllByText("SC Cham");
    expect(crests.length).toBeGreaterThan(0);
    expect(
      crests[0]!.compareDocumentPosition(names[0]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(header)
        .getAllByTestId("tenant-logo-image")
        .every((image) => image.getAttribute("src") === "/crests/cham.svg"),
    ).toBe(true);
    expect(
      names.some((name) =>
        name.classList.contains("sce-tenant-header-identity-name"),
      ),
    ).toBe(true);
    expect(
      screen.queryByTestId("domain-secondary-nav"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("domain-contextual-nav"),
    ).not.toBeInTheDocument();
    expect(header.querySelector(".sce-global-module-nav")).toBeNull();
    expect(header.querySelector(".sce-global-context-nav")).toBeNull();
    expect(
      header.querySelector("[data-sce-nav-spine-row='module']"),
    ).toBeNull();
  });

  it("opens a three-column frame with orange text-only active states", async () => {
    const user = userEvent.setup();
    renderClubShell(null);
    const header = screen.getByTestId("sce-global-navigation");
    const content = screen.getByTestId("page-content");
    const shell = screen.getByTestId("page-shell");

    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    const scroll = within(panel).getByTestId("sce-domain-nav-panel-scroll");
    const frame = within(scroll).getByTestId("sce-domain-nav-panel-frame");
    const title = within(frame).getByTestId("sce-domain-nav-panel-title");
    const categories = frame.querySelector(".sce-domain-nav-panel-l2");
    const destinations = frame.querySelector(".sce-domain-nav-panel-l3");

    expect(panel).toHaveClass("sce-domain-nav-panel--three-column");
    expect(panel).toHaveAttribute("data-sce-domain-nav-overlay");
    expect(header.contains(panel)).toBe(false);
    expect(shell.contains(panel)).toBe(false);
    expect(content).toBeInTheDocument();
    expect(scroll).toHaveClass("sce-domain-nav-panel-cham-body");
    expect(frame.className).not.toContain(
      "sce-domain-nav-panel-cham-frame--two-column",
    );
    expect(
      title.compareDocumentPosition(categories!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      categories!.compareDocumentPosition(destinations!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const activeL2 = within(frame).getByRole("button", {
      name: /Organisation/i,
    });
    expect(activeL2.className).toContain(
      "sce-domain-nav-panel-l2-control--active",
    );
    expect(activeL2.className).not.toMatch(/underline|border-l|border-s/);
    const activeL3 = within(frame).getByRole("link", {
      name: "Organisationseinheiten",
    });
    expect(activeL3).toHaveClass("sce-domain-nav-panel-l3-link--active");
    expect(activeL3.className).not.toMatch(/underline/);

    const top = panel.style.top;
    await user.click(
      within(frame).getByRole("button", { name: "Mitgliedschaft" }),
    );
    expect(screen.getByTestId("sce-domain-nav-panel").style.top).toBe(top);

    await user.keyboard("{Escape}");
    expect(
      screen.queryByTestId("sce-domain-nav-panel"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
