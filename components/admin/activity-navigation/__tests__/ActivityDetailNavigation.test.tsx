/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActivityDetailNavigation from "../ActivityDetailNavigation";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import { SCE_ACTIVITY_NAV_TABLIST_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";
import { ActivityDirtyNavigationProvider } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { ActivityDetailTabProvider } from "@/lib/activity-navigation/use-activity-detail-tab";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard/matchcenter/m1"),
  useSearchParams: vi.fn(() => new URLSearchParams("tab=teilnahme")),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SCE-ACTIVITY-NAV-01 — ActivityDetailNavigation", () => {
  it("marks active tab from URL", () => {
    const config = buildActivityTabNavigationConfig({
      kind: "MATCH",
      matchSquadAvailable: true,
    });

    render(
      <ActivityDirtyNavigationProvider>
        <ActivityDetailTabProvider config={config}>
          <ActivityDetailNavigation config={config} />
        </ActivityDetailTabProvider>
      </ActivityDirtyNavigationProvider>,
    );

    expect(screen.getByTestId("activity-detail-nav-teilnahme")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("activity-detail-nav-uebersicht")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("uses SCE activity nav tablist scroll contract (no legacy scrollbar-thin utility)", () => {
    const config = buildActivityTabNavigationConfig({ kind: "TRAINING" });
    const { container } = render(
      <ActivityDirtyNavigationProvider>
        <ActivityDetailTabProvider config={config}>
          <ActivityDetailNavigation config={config} />
        </ActivityDetailTabProvider>
      </ActivityDirtyNavigationProvider>,
    );
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist?.className).toContain(SCE_ACTIVITY_NAV_TABLIST_CLASS);
    expect(tablist?.className).not.toContain("scrollbar-thin");
  });

  it("hides Aufgebot when not configured", () => {
    const config = buildActivityTabNavigationConfig({
      kind: "MATCH",
      matchSquadAvailable: false,
    });

    render(
      <ActivityDirtyNavigationProvider>
        <ActivityDetailTabProvider config={config}>
          <ActivityDetailNavigation config={config} />
        </ActivityDetailTabProvider>
      </ActivityDirtyNavigationProvider>,
    );

    expect(screen.queryByTestId("activity-detail-nav-aufgebot")).toBeNull();
  });
});
