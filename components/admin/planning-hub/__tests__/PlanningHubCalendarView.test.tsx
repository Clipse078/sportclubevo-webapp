/**
 * @vitest-environment jsdom
 *
 * PLANNING-UX-03D — redundant daypart header removed from Wochenplaner calendar.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubCalendarView from "../PlanningHubCalendarView";
import { WeekplannerVisibleTimeRangeProvider } from "../WeekplannerVisibleTimeRangeContext";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";

function buildWeek(): WeekplannerWeek {
  const dayKeys = [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
  ];
  return {
    days: dayKeys.map((dayKey) => ({ dayKey, items: [] })),
    weekNumberLabel: "KW 38",
    rangeLabel: "14.09. – 20.09.",
    param: "2026-09-14",
    previousParam: "2026-09-07",
    nextParam: "2026-09-21",
  };
}

describe("PlanningHubCalendarView PLANNING-UX-03D", () => {
  it("does not render daypart switcher labels", () => {
    render(
      <WeekplannerVisibleTimeRangeProvider>
        <PlanningHubCalendarView
          week={buildWeek()}
          urlState={{ plan: "week", week: "2026-09-14" }}
          locale="de-CH"
          timezone="Europe/Zurich"
          todayDayKey="2026-09-19"
          onItemActivate={() => {}}
        />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    expect(screen.queryByTestId("planning-hub-daypart-switcher")).toBeNull();
    expect(screen.queryByText("Morgen")).toBeNull();
    expect(screen.queryByText("Nachmittag")).toBeNull();
    expect(screen.queryByText("Abend")).toBeNull();
    expect(screen.queryByText("Spät")).toBeNull();
    expect(screen.queryByText("Ganzer Tag")).toBeNull();
    expect(screen.queryByText("08–12")).toBeNull();
  });

  it("renders weekday/date headers and time grid", () => {
    render(
      <WeekplannerVisibleTimeRangeProvider>
        <PlanningHubCalendarView
          week={buildWeek()}
          urlState={{ plan: "week", week: "2026-09-14" }}
          locale="de-CH"
          timezone="Europe/Zurich"
          todayDayKey="2026-09-19"
          onItemActivate={() => {}}
        />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    expect(screen.getAllByTestId("planning-hub-calendar-day-header").length).toBe(7);
    expect(screen.getByText("Heute")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-calendar")).toBeInTheDocument();
  });

  it("source contract — no daypart switcher component", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/planning-hub/PlanningHubCalendarView.tsx"),
      "utf8",
    );
    expect(source).not.toContain("PlanningHubDaypartSwitcher");
    expect(source).toContain("useWeekplannerVisibleTimeRange");
    expect(source).not.toContain("daypartVisibleRange");
  });
});
