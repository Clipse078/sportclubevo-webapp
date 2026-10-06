/**
 * @vitest-environment jsdom
 *
 * SCE-PLANNER-UX-08-07R1 — Kalender runtime clipped-detail regression.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import PlanningHubActivityBlock from "../PlanningHubActivityBlock";
import PlanningHubCalendarClusterBlock from "../PlanningHubCalendarClusterBlock";
import PlanningHubCalendarView from "../PlanningHubCalendarView";
import { WeekplannerVisibleTimeRangeProvider } from "../WeekplannerVisibleTimeRangeContext";
import type { WeekplannerItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "res-1",
  facilityId: "fac-hf",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(id: string, team: string, hour: number): WeekplannerTrainingItem {
  const day = "2026-09-15";
  const start = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    id,
    tenantId: "tenant",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Training",
    teamNames: [team],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

function weekWith(items: WeekplannerItem[]): WeekplannerWeek {
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
    days: dayKeys.map((dayKey) => ({
      dayKey,
      items: dayKey === "2026-09-15" ? items : [],
    })),
    weekNumberLabel: "KW 38",
    rangeLabel: "14.09. – 20.09.",
    param: "2026-09-14",
    previousParam: "2026-09-07",
    nextParam: "2026-09-21",
  };
}

describe("PlanningHubCalendarClippedDetail SCE-PLANNER-UX-08-07R1", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("constrained individual Kalender activity opens detail on hover", async () => {
    vi.useRealTimers();
    const item = training("t-narrow", "FCA Senioren Mannschaftslang", 10);
    render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 52, height: 72 }}
        style={{ width: "calc(50% - 4px)", height: 72, top: 0, left: 0 }}
      />,
    );

    expect(screen.getByTestId("planning-hub-activity-detail-touch-trigger")).toBeInTheDocument();

    const user = userEvent.setup();
    const cardButton = screen.getByRole("button", { name: /FCA Senioren Mannschaftslang/i });
    await user.hover(cardButton);

    const detail = await screen.findByTestId("planning-hub-activity-clipped-detail");
    expect(detail.textContent).toContain("FCA Senioren Mannschaftslang");
  });

  it("spacious activity does not offer clipped-detail controls", () => {
    const item = training("t-wide", "Team A", 10);
    render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact={false}
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 220, height: 96 }}
        style={{ width: 220, height: 96, top: 0, left: 0 }}
      />,
    );

    expect(screen.queryByTestId("planning-hub-activity-detail-touch-trigger")).not.toBeInTheDocument();
  });

  it("constrained aggregated card opens aggregation detail on hover", async () => {
    vi.useRealTimers();
    const items = Array.from({ length: 7 }, (_, i) => training(`agg-${i}`, `Team ${i + 1}`, 11));
    render(
      <PlanningHubCalendarClusterBlock
        items={items}
        dayKey="2026-09-15"
        locale="de-CH"
        timezone="UTC"
        onOpenItem={vi.fn()}
        blockLayoutPx={{ width: 110, height: 80 }}
        style={{ width: "calc(100% - 4px)", height: 80, top: 0, left: 0 }}
      />,
    );

    expect(screen.getByText("7 Trainings")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-activity-detail-touch-trigger")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.hover(screen.getByTestId("planning-hub-calendar-cluster"));

    const detail = await screen.findByTestId("planning-hub-activity-clipped-detail");
    expect(detail).toBeInTheDocument();
    expect(detail.textContent).toContain("Team 1");
    expect(detail.textContent).toContain("Team 7");
  });

  it("keyboard focus opens equivalent detail for constrained activity", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const item = training("t-focus", "FCA Senioren", 12);
    render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 48, height: 70 }}
        style={{ width: "calc(50% - 4px)", height: 70, top: 0, left: 0 }}
      />,
    );

    await user.tab();
    await waitFor(() => {
      expect(screen.getByTestId("planning-hub-activity-clipped-detail")).toBeInTheDocument();
    });
  });

  it("touch info affordance remains on constrained cards", () => {
    const item = training("t-touch", "FCA Senioren", 13);
    render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 50, height: 68 }}
        style={{ width: "calc(50% - 4px)", height: 68, top: 0, left: 0 }}
      />,
    );

    expect(screen.getByTestId("planning-hub-activity-detail-touch-trigger")).toBeInTheDocument();
  });

  it("activity click still fires when detail is not pinned", async () => {
    const onActivate = vi.fn();
    const item = training("t-click", "FCA Senioren", 14);
    render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={onActivate}
        blockLayoutPx={{ width: 50, height: 68 }}
        style={{ width: "calc(50% - 4px)", height: 68, top: 0, left: 0 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Training/i }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("calendar path renders constrained parallel activities with disclosure wiring", () => {
    const overlapping = Array.from({ length: 3 }, (_, i) =>
      training(`cal-${i}`, `Parallel Team ${i}`, 9),
    );
    render(
      <WeekplannerVisibleTimeRangeProvider>
        <PlanningHubCalendarView
          week={weekWith(overlapping)}
          urlState={{ plan: "week", week: "2026-09-14" }}
          locale="de-CH"
          timezone="UTC"
          todayDayKey="2026-09-19"
          onItemActivate={vi.fn()}
        />
      </WeekplannerVisibleTimeRangeProvider>,
    );

    const triggers = screen.getAllByTestId("planning-hub-activity-detail-touch-trigger");
    expect(triggers.length).toBeGreaterThan(0);
  });

  it("re-measure after resize can enable disclosure", async () => {
    const item = training("t-resize", "FCA Senioren", 15);
    const { rerender } = render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact={false}
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 200, height: 80 }}
        style={{ width: 200, height: 80, top: 0, left: 0 }}
      />,
    );

    expect(screen.queryByTestId("planning-hub-activity-detail-touch-trigger")).not.toBeInTheDocument();

    rerender(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={vi.fn()}
        blockLayoutPx={{ width: 54, height: 70 }}
        style={{ width: "calc(50% - 4px)", height: 70, top: 0, left: 0 }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("planning-hub-activity-detail-touch-trigger")).toBeInTheDocument();
    });
  });
});
