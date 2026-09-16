/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubDaypartSwitcher from "../PlanningHubDaypartSwitcher";
import { parsePlanningHubUrlState } from "@/lib/planning-hub/planner-url";

describe("PlanningHubDaypartSwitcher — 02F1 temporal rail", () => {
  const urlState = parsePlanningHubUrlState({ week: "2026-09-14", zeit: "abend" });

  it("renders one dark navigation rail without per-segment outline pills", () => {
    render(
      <PlanningHubDaypartSwitcher
        urlState={urlState}
        activeDaypart="abend"
        showAdvancedFullDay
        onSelectDaypart={vi.fn()}
        onSelectFullDay={vi.fn()}
      />,
    );
    const rail = screen.getByTestId("planning-hub-daypart-rail");
    expect(rail.className).not.toMatch(/\bbg-white\b/);
    expect(screen.getByTestId("planning-hub-daypart-rail-separator")).toBeTruthy();
    const active = screen.getByTestId("planning-hub-daypart-abend");
    expect(active.getAttribute("aria-selected")).toBe("true");
    expect(active.getAttribute("aria-current")).toBe("true");
  });

  it("marks Ganzer Tag active when fullDayActive", () => {
    render(
      <PlanningHubDaypartSwitcher
        urlState={urlState}
        activeDaypart="morgen"
        fullDayActive
        showAdvancedFullDay
        onSelectDaypart={vi.fn()}
        onSelectFullDay={vi.fn()}
      />,
    );
    const full = screen.getByTestId("planning-hub-daypart-advanced-full");
    expect(full.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("planning-hub-daypart-abend").getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("invokes daypart handler without navigation", () => {
    const onSelect = vi.fn();
    render(
      <PlanningHubDaypartSwitcher
        urlState={urlState}
        activeDaypart="abend"
        onSelectDaypart={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("planning-hub-daypart-spaet"));
    expect(onSelect).toHaveBeenCalledWith("spaet");
  });
});
