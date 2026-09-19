/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubAllDayLane from "../PlanningHubAllDayLane";
import type { AllDayLaneSegment } from "@/lib/planning-hub/all-day-lane";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function segment(partial: Partial<WeekplannerItem>): AllDayLaneSegment {
  const item = {
    tenantId: "t",
    id: "ev:1",
    type: "VERANSTALTUNG",
    title: "Clubfest",
    allDay: true,
    startAt: new Date("2026-09-16T00:00:00.000Z"),
    endAt: new Date("2026-09-17T00:00:00.000Z"),
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    conflicts: [],
    ...partial,
  } as WeekplannerItem;
  return {
    item,
    startDayIndex: 2,
    spanDays: 1,
    lane: 0,
  };
}

describe("PlanningHubAllDayLane", () => {
  it("renders nothing when no all-day rows", () => {
    const { container } = render(
      <PlanningHubAllDayLane
        segments={[]}
        rowCount={0}
        dayMinWidthPx={120}
        timeGutterWidthPx={48}
        onItemActivate={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("preserves all-day lane without Ganzer Tag daypart header copy", () => {
    render(
      <PlanningHubAllDayLane
        segments={[segment({})]}
        rowCount={1}
        dayMinWidthPx={120}
        timeGutterWidthPx={48}
        onItemActivate={() => {}}
      />,
    );
    expect(screen.getByTestId("planning-hub-all-day-lane")).toBeInTheDocument();
    expect(screen.getByText("Ganztägig")).toBeInTheDocument();
    expect(screen.queryByText("Ganzer Tag")).toBeNull();
    expect(screen.getByTestId("planning-hub-all-day-segment")).toHaveTextContent("Clubfest");
  });
});
