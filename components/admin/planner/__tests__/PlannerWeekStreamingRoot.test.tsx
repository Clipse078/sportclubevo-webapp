/**
 * @vitest-environment jsdom
 *
 * PLANNING-UX-03C — regression for /dashboard/planner/week streaming shell:
 * the route uses PlannerWeekStreamingRoot (not WeekPlannerPage), so visible
 * time-range context must be provided here or hooks throw at runtime.
 */

import { useLayoutEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlannerWeekStreamingRoot, {
  usePublishPlannerWeekChrome,
} from "@/components/admin/planner/PlannerWeekChromeBridge";
import { useWeekplannerVisibleTimeRange } from "@/components/admin/planning-hub/WeekplannerVisibleTimeRangeContext";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import {
  WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY,
  defaultWeekplannerVisibleTimeRange,
} from "@/lib/planning-hub/weekplanner-visible-time-range";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

const MINIMAL_WEEK: WeekplannerWeek = {
  days: [
    { dayKey: "2026-08-10", items: [] },
    { dayKey: "2026-08-11", items: [] },
    { dayKey: "2026-08-12", items: [] },
    { dayKey: "2026-08-13", items: [] },
    { dayKey: "2026-08-14", items: [] },
    { dayKey: "2026-08-15", items: [] },
    { dayKey: "2026-08-16", items: [] },
  ],
  weekNumberLabel: "KW 33",
  rangeLabel: "10.–16. Aug 2026",
  param: "2026-08-10",
  previousParam: "2026-08-03",
  nextParam: "2026-08-17",
};

function StreamingRouteHarness() {
  const publish = usePublishPlannerWeekChrome();
  useWeekplannerVisibleTimeRange();
  useLayoutEffect(() => {
    publish({ week: MINIMAL_WEEK, teamOptions: [], facilityOptions: [], incompleteCount: 0 });
  }, [publish]);
  return <div data-testid="streaming-workspace-harness" />;
}

const STREAMING_CHROME_PROPS = {
  weekNav: {
    param: "2026-08-10",
    previousParam: "2026-08-03",
    nextParam: "2026-08-17",
    rangeLabel: "10.–16. Aug 2026",
  },
  urlState: {
    week: "2026-08-10",
    perspective: "kalender" as const,
    activity: "alle" as const,
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch" as const,
  },
  todayParam: "2026-08-12",
  wochenplanPlans: [],
  plans: [],
  viewedWochenplanPlanId: null,
  selectedPlanParam: null,
  materializedWeekplannerPlanId: null,
  canManagePlans: false,
  createPermissions: { training: false, match: false, tournament: false, veranstaltung: false },
};

describe("PlannerWeekStreamingRoot — visible time range provider", () => {
  it("renders chrome and workspace hooks without an external provider", async () => {
    localStorage.clear();

    render(
      <PlannerWeekStreamingRoot {...STREAMING_CHROME_PROPS}>
        <StreamingRouteHarness />
      </PlannerWeekStreamingRoot>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("planning-hub-visible-time-range")).toBeInTheDocument();
    });
    expect(screen.getByTestId("weekplanner-management-chrome")).toBeInTheDocument();

    const defaults = defaultWeekplannerVisibleTimeRange();
    expect(screen.getByTestId("planning-hub-visible-time-start")).toHaveValue(
      String(defaults.startMinutes),
    );
    expect(screen.getByTestId("planning-hub-visible-time-end")).toHaveValue(
      String(defaults.endMinutes),
    );
  });

  it("falls back to 08:00–23:00 when localStorage holds malformed JSON", async () => {
    localStorage.setItem(WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY, "{not-json");

    render(
      <PlannerWeekStreamingRoot {...STREAMING_CHROME_PROPS}>
        <StreamingRouteHarness />
      </PlannerWeekStreamingRoot>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("planning-hub-visible-time-range")).toBeInTheDocument();
    });

    const defaults = defaultWeekplannerVisibleTimeRange();
    expect(screen.getByTestId("planning-hub-visible-time-start")).toHaveValue(
      String(defaults.startMinutes),
    );
    expect(screen.getByTestId("planning-hub-visible-time-end")).toHaveValue(
      String(defaults.endMinutes),
    );
  });
});
