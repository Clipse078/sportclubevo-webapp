/**
 * @vitest-environment jsdom
 *
 * DASHBOARD-SHELL-UX-01 — tenant-first sidebar shell:
 *   - tenant identity (name) is rendered prominently in the header
 *   - SportClubEvo platform branding at footer (not "Powered by")
 *   - MatchCenter renders nested under Planung (not as a standalone item)
 *   - permission-driven visibility is preserved
 *
 * DASHBOARD-V3-03E — two-level module navigation:
 *   - accordion child expansion
 *   - active module auto-expands
 *   - collapsed icon rail
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const pathnameState = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useSidebarResize", () => ({
  useSidebarResize: () => ({
    width: 224,
    isResizing: false,
    onResizePointerDown: vi.fn(),
    onResizeKeyDown: vi.fn(),
  }),
}));

const CLUB_ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

describe("AdminSidebar", () => {
  beforeEach(() => {
    pathnameState.value = "/dashboard";
    localStorage.clear();
  });

  it("renders the tenant name prominently in the brand header", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );
    expect(screen.getByText("FC Allschwil")).toBeInTheDocument();
  });

  it("shows SportClubEvo platform brand at the footer, not a Powered by attribution", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(screen.getByLabelText("SportClubEvo")).toBeInTheDocument();
    expect(screen.queryByText("Powered by")).not.toBeInTheDocument();
  });

  it("does not render user identity or logout in the sidebar footer", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(screen.queryByText("Abmelden")).not.toBeInTheDocument();
    expect(screen.queryByText("it@fcallschwil.ch")).not.toBeInTheDocument();
  });

  it("renders MatchCenter nested under Planung when Planung is expanded", () => {
    pathnameState.value = "/dashboard/matchcenter";

    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const matchCenterLink = screen.getByRole("link", { name: /MatchCenter/i });
    expect(matchCenterLink).toHaveAttribute("href", "/dashboard/matchcenter");
    expect(matchCenterLink.className).toContain("sce-nav-child");

    const labels = screen
      .getAllByRole("link")
      .map((el) => el.textContent?.trim())
      .filter((t): t is string => !!t);
    const trainingIdx = labels.indexOf("TrainingCenter");
    const matchIdx = labels.indexOf("MatchCenter");
    const tournamentIdx = labels.indexOf("TournamentCenter");
    expect(trainingIdx).toBeGreaterThan(-1);
    expect(trainingIdx).toBeLessThan(matchIdx);
    expect(matchIdx).toBeLessThan(tournamentIdx);
  });

  it("marks the active dashboard route with aria-current", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("auto-expands the active module and keeps inactive module children collapsed", () => {
    pathnameState.value = "/dashboard";

    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(screen.queryByRole("link", { name: "MatchCenter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "CMS Übersicht" })).not.toBeInTheDocument();
  });

  it("expands a module via accordion toggle and collapses the previously expanded module", () => {
    pathnameState.value = "/dashboard";

    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Planung ausklappen/i }));
    expect(screen.getByRole("link", { name: "MatchCenter" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Website ausklappen/i }));
    expect(screen.getByRole("link", { name: "CMS Übersicht" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "MatchCenter" })).not.toBeInTheDocument();
  });

  it("uses accessible collapse control labels", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Navigation einklappen" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Navigation einklappen" }));

    expect(
      screen.getByRole("button", { name: "Navigation ausklappen" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("renders collapsed icon rail labels for assistive technology", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Navigation einklappen" }));

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("title", "Dashboard");
    expect(within(dashboardLink).getByText("Dashboard", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("renders Kommunikation and Sponsoring once in the Club Admin runtime sidebar groups", () => {
    pathnameState.value = "/dashboard/communication";

    render(
      <AdminSidebar
        permissionKeys={[
          PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
          PERMISSIONS.ROLES_VIEW,
        ]}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const betrieb = screen.getByText("Betrieb").parentElement;
    const fuehrung = screen.getByText("Führung").parentElement;
    expect(betrieb).not.toBeNull();
    expect(fuehrung).not.toBeNull();

    const communication = within(betrieb!).getByRole("link", {
      name: "Kommunikation",
    });
    expect(communication).toHaveAttribute("href", "/dashboard/communication");
    expect(within(betrieb!).getByRole("link", { name: "E-Mail-Absender" })).toHaveAttribute(
      "href",
      "/dashboard/communication/email-sender",
    );

    const sponsoring = within(fuehrung!).getByRole("link", {
      name: "Sponsoring",
    });
    expect(sponsoring).toHaveAttribute("href", "/dashboard/sponsoring");

    expect(screen.getAllByRole("link", { name: "Kommunikation" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Sponsoring" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Meetings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Club Entwicklung" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Material & Inventar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Finanzen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Administration" })).toBeInTheDocument();
  });

  it("hides permission-gated sections the user lacks access to (Club Admin still sees Administration)", () => {
    render(
      <AdminSidebar
        permissionKeys={[PERMISSIONS.ROLES_VIEW, PERMISSIONS.SEASONS_VIEW]}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );
    expect(screen.getByRole("link", { name: "Administration" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "MatchCenter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Organisation" })).not.toBeInTheDocument();
  });

  it("derives visible modules from getVisibleNavSections without duplicating permission logic", () => {
    render(
      <AdminSidebar
        permissionKeys={[PERMISSIONS.ROLES_VIEW, PERMISSIONS.SEASONS_VIEW]}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Administration" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Website" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Planung" })).not.toBeInTheDocument();
  });
});
