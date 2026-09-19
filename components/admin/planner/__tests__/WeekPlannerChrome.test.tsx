/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeekplannerVisibleTimeRangeProvider } from "@/components/admin/planning-hub/WeekplannerVisibleTimeRangeContext";
import WeekPlannerChrome from "@/components/admin/planner/WeekPlannerChrome";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

describe("WeekPlannerChrome — planning family shell", () => {
  it("renders planning header, week navigation, and perspective switcher", () => {
    render(
      <WeekplannerVisibleTimeRangeProvider>
      <WeekPlannerChrome
        weekNav={{
          param: "2026-08-10",
          previousParam: "2026-08-03",
          nextParam: "2026-08-17",
          rangeLabel: "10.–16. Aug 2026",
        }}
        urlState={{
          week: "2026-08-10",
          perspective: "kalender",
          activity: "alle",
          team: null,
          facility: null,
          conflictsOnly: false,
          resourceCategory: "pitch",
        }}
        todayParam="2026-08-12"
        teamOptions={[]}
        facilityOptions={[]}
      />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    expect(screen.getByTestId("weekplanner-management-chrome")).toBeInTheDocument();
    expect(screen.getByTestId("weekplanner-header-subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("planning-week-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("weekplanner-range-label")).toHaveTextContent("10.–16. Aug 2026");
    expect(screen.getByTestId("planning-hub-perspective-kalender")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("planning-hub-filter-panel")).toBeInTheDocument();
    expect(screen.getByText("Planung")).toBeInTheDocument();
  });
});
