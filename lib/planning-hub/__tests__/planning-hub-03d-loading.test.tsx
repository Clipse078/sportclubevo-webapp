/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubLoadingShell from "@/components/admin/planning-hub/loading/PlanningHubLoadingShell";
import PlanningHubCalendarSkeleton from "@/components/admin/planning-hub/loading/PlanningHubCalendarSkeleton";
import PlanningHubLoadingTracer from "@/components/admin/planning-hub/loading/PlanningHubLoadingTracer";
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
});
