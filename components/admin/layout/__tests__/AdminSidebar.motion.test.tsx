/**
 * @vitest-environment jsdom
 *
 * SCE-DESIGN-04C/04D — AdminSidebar premium animated iconography tests
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getAllSidebarNavLabels,
  getNavIconKey,
} from "@/lib/motion/nav-icon-registry";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/matchcenter",
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

describe("AdminSidebar animated icons (SCE-DESIGN-04C)", () => {
  it("renders premium animated nav icons for all visible items", () => {
    const { container } = render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const animatedIcons = container.querySelectorAll(".sce-animated-nav-icon");
    expect(animatedIcons.length).toBeGreaterThan(0);

    const navLinks = container.querySelectorAll(
      ".sce-nav-item, .sce-nav-module-link, .sce-nav-child",
    );
    expect(animatedIcons.length).toBe(navLinks.length);
  });

  it("does not render legacy MotionIcon / Lucide fallback icons in sidebar", () => {
    const { container } = render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const legacyIcons = container.querySelectorAll(".sce-motion-icon");
    expect(legacyIcons.length).toBe(0);
  });

  it("assigns data-nav-icon for every visible sidebar label", () => {
    const { container } = render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const visibleLabels = getVisibleNavSections(CLUB_ADMIN_PERMISSIONS).flatMap((section) =>
      section.items.flatMap((item) => [
        item.label,
        ...(expandedModuleIncludes(item.key)
          ? (item.children ?? []).map((child) => child.label)
          : []),
      ]),
    );

    for (const label of visibleLabels) {
      const expectedKey = getNavIconKey(label);
      const icon = container.querySelector(`[data-nav-icon="${expectedKey}"]`);
      expect(icon, `missing icon for ${label}`).toBeTruthy();
    }

    for (const label of getAllSidebarNavLabels()) {
      expect(getNavIconKey(label)).toBeTruthy();
    }
  });

  it("preserves navigation links and hrefs", () => {
    render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const matchCenterLink = screen.getByRole("link", { name: /MatchCenter/i });
    expect(matchCenterLink).toHaveAttribute("href", "/dashboard/matchcenter");
  });

  it("applies continuous hover loop CSS (infinite iteration while hovered)", () => {
    const css = readFileSync(
      join(process.cwd(), "app/nav-icon-animations.css"),
      "utf8",
    );
    expect(css).toContain("animation-iteration-count: infinite");
    expect(css).toContain("sce-nav-loop-copper-travel");
  });

  it("active route icon is not continuously animated without hover", () => {
    const { container } = render(
      <AdminSidebar
        permissionKeys={CLUB_ADMIN_PERMISSIONS}
        clubName="FC Allschwil"
        logoUrl={null}
      />,
    );

    const activeIcon = container.querySelector(
      '.sce-nav-child.active .sce-animated-nav-icon--active[data-nav-icon="matchcenter"]',
    );
    expect(activeIcon).toBeInTheDocument();
    expect(activeIcon?.parentElement?.matches(":hover")).toBe(false);
  });
});

function expandedModuleIncludes(moduleKey: string): boolean {
  return moduleKey === "planung";
}
