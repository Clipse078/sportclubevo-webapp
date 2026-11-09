/**
 * @vitest-environment jsdom
 *
 * SCE-DS2-05B-R11 — desktop mega menu uses one grid across all five domains.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { SCE_DOMAIN_NAV_CHECK_VIEWPORTS } from "@/lib/nav/sce-domain-nav-menu-layout";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard/org-units",
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => router,
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

const DOMAINS = [
  { id: "club", l3: true },
  { id: "planning", l3: false },
  { id: "publishing", l3: true },
  { id: "communication", l3: true },
  { id: "admin", l3: false },
] as const;

function renderClubShell() {
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
        logoUrl={null}
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />
      <main data-testid="page-content">Dashboard</main>
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

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

function assertSharedGrid(panel: HTMLElement, expectsL3: boolean) {
  expect(panel).toHaveClass("sce-domain-nav-panel--three-column");
  expect(panel.className).not.toContain("two-column");
  const frame = within(panel).getByTestId("sce-domain-nav-panel-frame");
  expect(frame).toHaveAttribute("data-sce-domain-nav-grid", "title-l2-l3");
  expect(frame).toHaveClass("sce-domain-nav-panel-cham-frame");
  expect(frame.className).not.toContain("two-column");

  const title = within(frame).getByTestId("sce-domain-nav-panel-title");
  const l2 = frame.querySelector<HTMLElement>("[data-sce-domain-nav-column='2']");
  expect(l2).toBeTruthy();
  const rows = l2!.querySelectorAll("a, button");
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(l2!.contains(row)).toBe(true);
    expect(row.getAttribute("style") ?? "").not.toMatch(/grid-column|span/);
    expect(row.className).not.toMatch(/col-span|span-2/);
  }
  expect(
    title.compareDocumentPosition(l2!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  const l3 = frame.querySelector("[data-sce-domain-nav-column='3']");
  if (expectsL3) {
    expect(frame).toHaveAttribute("data-sce-domain-nav-l3", "populated");
    expect(l3).toBeTruthy();
    expect(l3!.querySelectorAll("a").length).toBeGreaterThan(0);
    expect(
      l2!.compareDocumentPosition(l3!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  } else {
    expect(frame).toHaveAttribute("data-sce-domain-nav-l3", "empty");
    expect(l3).toBeNull();
    expect(frame.querySelector(".sce-domain-nav-panel-l3")).toBeNull();
    expect(frame.children).toHaveLength(2);
  }

  expect(frame.querySelector("[data-sce-domain-nav-placeholder]")).toBeNull();
  expect(frame.textContent).not.toMatch(/Platzhalter|Empty|Keine Einträge/i);
  return { frame, l2: l2! };
}

describe("SCE-DS2-05B-R11 desktop mega-menu consistency", () => {
  afterEach(() => {
    cleanup();
    navigation.pathname = "/dashboard/org-units";
    router.push.mockReset();
  });

  it("keeps one grid, empty L3 column, and a stable frame while switching domains", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(54);

    const shell = screen.getByTestId("page-shell");
    const header = screen.getByTestId("sce-global-navigation");
    const contentIndex = () =>
      [...shell.children].findIndex(
        (node) => node.getAttribute("data-testid") === "page-content",
      );
    const headerChildren = header.childElementCount;
    const indexBefore = contentIndex();
    let overlayTop = "";
    let overlayMaxHeight = "";

    for (const viewport of SCE_DOMAIN_NAV_CHECK_VIEWPORTS) {
      setViewport(viewport.width, viewport.height);
      for (const domain of DOMAINS) {
        await user.click(
          screen.getByTestId(`primary-domain-panel-trigger-${domain.id}`),
        );
        window.dispatchEvent(new Event("resize"));
        const panel = screen.getByTestId("sce-domain-nav-panel");
        expect(header.contains(panel)).toBe(false);
        expect(shell.contains(panel)).toBe(false);
        expect(header.childElementCount).toBe(headerChildren);
        expect(contentIndex()).toBe(indexBefore);
        expect(screen.getByTestId("page-content")).toHaveTextContent("Dashboard");

        if (!overlayTop) {
          overlayTop = panel.style.top;
          overlayMaxHeight =
            panel.style.getPropertyValue("--sce-domain-nav-overlay-max-height");
        }
        expect(panel.style.top).toBe(overlayTop);
        expect(panel.style.top).toBe("54px");
        expect(
          panel.style.getPropertyValue("--sce-domain-nav-overlay-max-height"),
        ).toBe(overlayMaxHeight);

        const { frame } = assertSharedGrid(panel, domain.l3);
        expect(frame.getAttribute("data-sce-domain-nav-grid")).toBe("title-l2-l3");
      }
    }
  });

  it("keeps Verein L3, switches categories without moving the overlay, and navigates from Planung", async () => {
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(54);

    await user.click(screen.getByTestId("primary-domain-panel-trigger-club"));
    const clubPanel = screen.getByTestId("sce-domain-nav-panel");
    const top = clubPanel.style.top;
    const activeL2 = within(clubPanel).getByRole("button", { name: /Organisation/i });
    expect(activeL2).toHaveClass("sce-domain-nav-panel-l2-control--active");
    expect(activeL2.className).not.toMatch(/underline|border-l|border-s|bg-/);
    const activeL3 = within(clubPanel).getByRole("link", {
      name: "Organisationseinheiten",
    });
    expect(activeL3).toHaveClass("sce-domain-nav-panel-l3-link--active");
    expect(activeL3).toHaveAttribute("aria-current", "page");
    expect(activeL3).toHaveAttribute("href", "/dashboard/org-units");

    await user.click(within(clubPanel).getByRole("button", { name: "Mitgliedschaft" }));
    const switched = screen.getByTestId("sce-domain-nav-panel");
    expect(switched.style.top).toBe(top);
    expect(switched).toHaveAttribute("data-sce-domain-nav-panel-mode", "hierarchical");
    expect(
      within(switched).getByRole("link", { name: "Mitgliedschaft Übersicht" }),
    ).toHaveAttribute("href", "/dashboard/registrations");
    assertSharedGrid(switched, true);

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("primary-domain-panel-trigger-club")).toHaveFocus();

    await user.click(screen.getByTestId("primary-domain-panel-trigger-planning"));
    const planning = screen.getByTestId("sce-domain-nav-panel");
    expect(planning).toHaveAttribute("data-sce-domain-nav-panel-mode", "simple");
    expect(planning.style.top).toBe(top);
    assertSharedGrid(planning, false);
    const week = within(planning).getByRole("link", { name: "Wochenplaner" });
    expect(week).toHaveAttribute("href", "/dashboard/planner/week");
    expect(week.className).not.toMatch(/underline|border-l|bg-/);
    await user.click(week);
    expect(screen.queryByTestId("sce-domain-nav-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("marks the active Planung destination with orange text classes only", async () => {
    navigation.pathname = "/dashboard/planner/week";
    const user = userEvent.setup();
    renderClubShell();
    mockAnchorRect(54);

    await user.click(screen.getByTestId("primary-domain-panel-trigger-planning"));
    const panel = screen.getByTestId("sce-domain-nav-panel");
    assertSharedGrid(panel, false);
    const week = within(panel).getByRole("link", { name: "Wochenplaner" });
    expect(week).toHaveClass("sce-domain-nav-panel-l2-link--active");
    expect(week).toHaveAttribute("aria-current", "page");
    expect(week.className).not.toMatch(/underline|border-l|border-s|bg-/);
    expect(panel.querySelector(".sce-domain-nav-panel-l3")).toBeNull();
  });
});
