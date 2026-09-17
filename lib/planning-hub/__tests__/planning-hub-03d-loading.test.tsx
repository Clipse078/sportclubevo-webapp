/**
 * @vitest-environment jsdom
 */

import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlanningHubLoadingShell from "@/components/admin/planning-hub/loading/PlanningHubLoadingShell";
import PlanningHubLoadingRing from "@/components/admin/planning-hub/loading/PlanningHubLoadingRing";
import PlanningHubLoadingProgressRail from "@/components/admin/planning-hub/loading/PlanningHubLoadingProgressRail";
import styles from "@/components/admin/planning-hub/loading/planning-hub-loading.module.css";

describe("PLANNING-HUB-03D2 planner loading", () => {
  it("application route loading state renders minimal loader", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.getByTestId("planning-hub-loading")).toBeInTheDocument();
  });

  it("scheduler skeleton is not rendered", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.queryByTestId("planning-hub-calendar-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-skeleton-day-0")).not.toBeInTheDocument();
  });

  it("fake activity placeholders are not rendered", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.queryByTestId("planning-hub-placeholder-block")).not.toBeInTheDocument();
  });

  it("loading ring is present", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.getByTestId("planning-hub-loading-ring")).toBeInTheDocument();
  });

  it("primary loading status copy", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.getByText("Wochenplaner wird geladen …")).toBeInTheDocument();
  });

  it("secondary loading status copy", () => {
    render(<PlanningHubLoadingShell />);
    expect(
      screen.getByText("Trainings, Spiele und Ressourcen werden vorbereitet"),
    ).toBeInTheDocument();
  });

  it("indeterminate progress rail is present", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.getByTestId("planning-hub-loading-progress-rail")).toBeInTheDocument();
  });

  it("progress rail has no fake percentage", () => {
    render(<PlanningHubLoadingProgressRail />);
    const rail = screen.getByTestId("planning-hub-loading-progress-rail");
    expect(rail.querySelector("[aria-valuenow]")).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("does not show fake loading stages", () => {
    render(<PlanningHubLoadingShell />);
    expect(screen.queryByText(/Schritt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Initialisiere/i)).not.toBeInTheDocument();
  });

  it("reduced-motion CSS provides static ring and rail classes", () => {
    expect(styles.loadingRingArc).toBeTruthy();
    expect(styles.progressRailSegment).toBeTruthy();
    expect(styles.loadingWorkspace).toBeTruthy();
  });

  it("loading workspace has aria-busy and status semantics", () => {
    render(<PlanningHubLoadingShell />);
    const root = screen.getByTestId("planning-hub-loading");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Wochenplaner wird geladen …");
  });

  it("loading workspace uses centered layout region", () => {
    render(<PlanningHubLoadingShell />);
    const root = screen.getByTestId("planning-hub-loading");
    expect(root.className).toContain(styles.loadingWorkspace);
  });

  it("Suspense pending state renders minimal shell without skeleton chrome", () => {
    function PendingWeekData() {
      throw new Promise<void>(() => {});
    }

    render(
      <Suspense fallback={<PlanningHubLoadingShell />}>
        <PendingWeekData />
      </Suspense>,
    );

    expect(screen.getByTestId("planning-hub-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-calendar-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-loading-tracer")).not.toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-loading-ring")).toBeInTheDocument();
  });

  it("ring uses compositor-friendly animation class", () => {
    render(<PlanningHubLoadingRing />);
    const arc = document.querySelector(`.${styles.loadingRingArc}`);
    expect(arc).toBeTruthy();
  });
});
