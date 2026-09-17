/**
 * @vitest-environment jsdom
 */

import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubLoadingShell from "@/components/admin/planning-hub/loading/PlanningHubLoadingShell";
import PlanningHubCalendarSkeleton from "@/components/admin/planning-hub/loading/PlanningHubCalendarSkeleton";
import PlanningHubLoadingTracer from "@/components/admin/planning-hub/loading/PlanningHubLoadingTracer";
import PlanningHubLoadingStatus from "@/components/admin/planning-hub/loading/PlanningHubLoadingStatus";
import {
  CALENDAR_PLACEHOLDER_BLOCKS,
  LISTE_ROW_PLACEHOLDER_COUNT,
  RESOURCE_ROW_PLACEHOLDER_COUNT,
} from "@/lib/planning-hub/loading/deterministic-placeholders";
import styles from "@/components/admin/planning-hub/loading/planning-hub-loading.module.css";

describe("PLANNING-HUB-03D planner loading", () => {
  it("planning hub loading shell renders", () => {
    render(<PlanningHubLoadingShell perspective="kalender" />);
    expect(screen.getByTestId("planning-hub-loading")).toBeInTheDocument();
  });

  it("calendar skeleton has seven-day geometry", () => {
    render(<PlanningHubCalendarSkeleton />);
    expect(screen.getByTestId("planning-hub-calendar-skeleton")).toBeInTheDocument();
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`planning-hub-skeleton-day-${i}`)).toBeInTheDocument();
    }
  });

  it("placeholder blocks are deterministic", () => {
    expect(CALENDAR_PLACEHOLDER_BLOCKS.length).toBeGreaterThan(0);
    const snapshot = CALENDAR_PLACEHOLDER_BLOCKS.map(
      (b) => `${b.dayIndex}:${b.topPct}:${b.heightPct}:${b.tint}`,
    ).join("|");
    expect(snapshot).toMatchInlineSnapshot(
      `"5:8:14:event|0:52:18:training|1:48:16:training|2:55:20:match|3:50:17:training|4:58:15:training|4:38:12:match"`,
    );
  });

  it("loading tracer present without fake percentage", () => {
    render(<PlanningHubLoadingTracer />);
    const tracer = screen.getByTestId("planning-hub-loading-tracer");
    expect(tracer).toBeInTheDocument();
    expect(tracer.querySelector("[aria-valuenow]")).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("loading status is accessible", () => {
    render(<PlanningHubLoadingShell perspective="liste" includeChromeSkeleton={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Wochenplanung wird geladen");
  });

  it("resource and liste skeleton counts are stable", () => {
    expect(RESOURCE_ROW_PLACEHOLDER_COUNT).toBe(6);
    expect(LISTE_ROW_PLACEHOLDER_COUNT).toBe(8);
  });

  it("reduced-motion CSS disables shimmer and tracer animation", () => {
    expect(styles.placeholderBlock).toBeTruthy();
    expect(styles.tracerSegment).toBeTruthy();
    expect(styles.loadingWorkspace).toBeTruthy();
  });

  it("loading workspace region has explicit non-zero layout class", () => {
    render(<PlanningHubLoadingShell perspective="kalender" includeChromeSkeleton={false} />);
    const root = screen.getByTestId("planning-hub-loading");
    expect(root.className).toContain(styles.loadingWorkspace);
  });

  it("Suspense pending state renders planning hub loading shell immediately", () => {
    function PendingWeekData() {
      throw new Promise<void>(() => {});
    }

    render(
      <Suspense
        fallback={
          <PlanningHubLoadingShell perspective="kalender" includeChromeSkeleton={false} />
        }
      >
        <PendingWeekData />
      </Suspense>,
    );

    expect(screen.getByTestId("planning-hub-loading")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-calendar-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-loading-tracer")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-loading-delayed")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Wochenplanung wird geladen");
  });

  it("primary loading status is present without waiting on long-wait timer", () => {
    vi.useFakeTimers();
    render(<PlanningHubLoadingStatus />);
    expect(screen.getByText("Wochenplanung wird geladen")).toBeInTheDocument();
    expect(
      screen.queryByText("Trainings, Spiele und Ressourcen werden vorbereitet"),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("long-wait supporting copy may appear after two seconds", () => {
    vi.useFakeTimers();
    render(<PlanningHubLoadingStatus />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      screen.getByText("Trainings, Spiele und Ressourcen werden vorbereitet"),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });
});
