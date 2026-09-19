/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PlanningHubVisibleTimeRangeControl from "../PlanningHubVisibleTimeRangeControl";
import { WeekplannerVisibleTimeRangeProvider } from "../WeekplannerVisibleTimeRangeContext";
import { readStoredWeekplannerVisibleTimeRange } from "@/lib/planning-hub/weekplanner-visible-time-range";

describe("PlanningHubVisibleTimeRangeControl", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves custom range to canonical localStorage preference", () => {
    render(
      <WeekplannerVisibleTimeRangeProvider>
        <PlanningHubVisibleTimeRangeControl />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    fireEvent.change(screen.getByTestId("planning-hub-visible-time-start"), {
      target: { value: String(7 * 60) },
    });
    fireEvent.change(screen.getByTestId("planning-hub-visible-time-end"), {
      target: { value: String(21 * 60 + 30) },
    });
    fireEvent.click(screen.getByTestId("planning-hub-visible-time-save"));

    expect(readStoredWeekplannerVisibleTimeRange()).toEqual({
      startMinutes: 7 * 60,
      endMinutes: 21 * 60 + 30,
    });
  });

  it("blocks saving when end is before start", () => {
    render(
      <WeekplannerVisibleTimeRangeProvider>
        <PlanningHubVisibleTimeRangeControl />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    fireEvent.change(screen.getByTestId("planning-hub-visible-time-start"), {
      target: { value: String(20 * 60) },
    });
    fireEvent.change(screen.getByTestId("planning-hub-visible-time-end"), {
      target: { value: String(10 * 60) },
    });
    fireEvent.click(screen.getByTestId("planning-hub-visible-time-save"));

    expect(screen.getByTestId("planning-hub-visible-time-error")).toBeInTheDocument();
    expect(readStoredWeekplannerVisibleTimeRange().startMinutes).toBe(8 * 60);
  });
});
