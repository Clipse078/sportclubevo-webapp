/**
 * @vitest-environment jsdom
 *
 * Documents the PLANNING-UX-03B production failure mode when the streaming
 * route omits WeekplannerVisibleTimeRangeProvider (fixed in 03C).
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubVisibleTimeRangeControl from "@/components/admin/planning-hub/PlanningHubVisibleTimeRangeControl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

describe("PlannerWeekStreamingRoot missing provider (03B regression signature)", () => {
  it("throws the exact hook guard error that crashed /dashboard/planner/week", () => {
    expect(() => render(<PlanningHubVisibleTimeRangeControl />)).toThrow(
      "useWeekplannerVisibleTimeRange must be used within WeekplannerVisibleTimeRangeProvider",
    );
  });
});
