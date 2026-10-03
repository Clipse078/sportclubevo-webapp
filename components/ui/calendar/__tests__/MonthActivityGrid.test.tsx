/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MonthActivityGrid from "../MonthActivityGrid";
import type { MonthActivityGridDay } from "../month-activity-grid-types";

function baseDay(overrides: Partial<MonthActivityGridDay> = {}): MonthActivityGridDay {
  return {
    dayKey: "2026-09-27",
    dayNumber: "27",
    inMonth: true,
    isToday: false,
    activityCount: 1,
    isSelected: false,
    accessibleLabel: "27 September",
    ...overrides,
  };
}

describe("MonthActivityGrid — shared infrastructure", () => {
  const navigation = { previousMonthHref: "/prev", nextMonthHref: "/next" };

  it("matchcenter variant keeps generic sky dot without programme palette attributes", () => {
    const { container } = render(
      <MonthActivityGrid
        monthLabel="September 2026"
        weekdayLabels={["Mo"]}
        days={[baseDay({ activityCount: 2, isToday: false })]}
        navigation={navigation}
        ariaLabel="Grid"
        previousMonthLabel="Prev"
        nextMonthLabel="Next"
        cellVariant="matchcenter"
        getDayHref={() => "/day"}
      />,
    );

    expect(container.querySelector("[data-programme-palette]")).toBeNull();
    expect(container.innerHTML).toContain("bg-sky-400");
  });

  it("personal variant uses semantic dot markers without type pill text", () => {
    render(
      <MonthActivityGrid
        monthLabel="September 2026"
        weekdayLabels={["Mo"]}
        days={[
          baseDay({
            primarySourceType: "TOURNAMENT",
            activityMarkerSourceTypes: ["TOURNAMENT"],
          }),
        ]}
        navigation={navigation}
        ariaLabel="Grid"
        previousMonthLabel="Prev"
        nextMonthLabel="Next"
        cellVariant="personal"
        selectable
        onSelectDay={() => undefined}
      />,
    );

    expect(screen.queryByText("Turnier")).toBeNull();
    expect(document.querySelector('[data-programme-palette="tournament-orange"]')).toBeTruthy();
  });

  it("selected personal day retains semantic marker attributes", () => {
    render(
      <MonthActivityGrid
        monthLabel="September 2026"
        weekdayLabels={["Mo"]}
        days={[
          baseDay({
            isSelected: true,
            primarySourceType: "TOURNAMENT",
            activityMarkerSourceTypes: ["TOURNAMENT"],
          }),
        ]}
        navigation={navigation}
        ariaLabel="Grid"
        previousMonthLabel="Prev"
        nextMonthLabel="Next"
        cellVariant="personal"
        selectable
        onSelectDay={() => undefined}
      />,
    );

    expect(document.querySelector('[data-programme-palette="tournament-orange"]')).toBeTruthy();
  });
});
