/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSearchParams } from "next/navigation";
import SceContextTabs from "../SceContextTabs";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import { SceContextDirtyGuardProvider } from "@/lib/context-tabs/ContextDirtyNavigationContext";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { SCE_ACTIVITY_NAV_TABLIST_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard/matchcenter/m1"),
  useSearchParams: vi.fn(() => new URLSearchParams("tab=uebersicht")),
  useRouter: vi.fn(() => ({ push })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderMatchNav(tab = "uebersicht") {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(`tab=${tab}`) as ReturnType<
    typeof useSearchParams
  >);

  const config = buildActivityTabNavigationConfig({
    kind: "MATCH",
    matchSquadAvailable: true,
  });

  return render(
    <SceContextDirtyGuardProvider>
      <SceContextTabProvider config={config}>
        <SceContextTabs config={config} testId="ctx-nav" idPrefix="activity-tab" />
      </SceContextTabProvider>
    </SceContextDirtyGuardProvider>,
  );
}

describe("SCE-UI-ROLLOUT-01B — SceContextTabs", () => {
  it("renders tablist with nowrap scroll contract", () => {
    const { container } = renderMatchNav();
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist?.className).toContain(SCE_ACTIVITY_NAV_TABLIST_CLASS);
    expect(tablist?.className).toContain("flex-nowrap");
  });

  it("ArrowRight activates the next primary tab via router navigation", () => {
    renderMatchNav("uebersicht");
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/dashboard/matchcenter/m1?tab=aufgebot");
  });

  it("Home selects first primary tab", () => {
    renderMatchNav("teilnahme");
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
    expect(push).toHaveBeenCalledWith("/dashboard/matchcenter/m1?tab=uebersicht");
  });

  it("End selects last primary tab", () => {
    renderMatchNav("uebersicht");
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(push).toHaveBeenCalledWith("/dashboard/matchcenter/m1?tab=kommunikation");
  });

  it("uses roving tabindex on tabs", () => {
    renderMatchNav("uebersicht");
    expect(screen.getByTestId("ctx-nav-uebersicht")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("ctx-nav-aufgebot")).toHaveAttribute("tabindex", "-1");
  });
});
