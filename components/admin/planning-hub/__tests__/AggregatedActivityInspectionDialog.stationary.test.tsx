/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01P — pure overlay: application scroll positions unchanged.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import AggregatedActivityInspectionDialog from "../AggregatedActivityInspectionDialog";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { SCE_SIDEBAR_SCROLL_ROOT_ATTR } from "@/lib/ui/sce-modal-background-scroll";

function item(partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "id">): WeekplannerItem {
  return {
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-09-16T16:45:00.000Z"),
    endAt: new Date("2026-09-16T18:15:00.000Z"),
    canonicalStartAt: new Date("2026-09-16T16:45:00.000Z"),
    canonicalEndAt: new Date("2026-09-16T18:15:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["Junioren FF-14"],
    pitchAllocations: [
      {
        facilityResourceId: "p1",
        facilityId: "f",
        code: "KR2A",
        name: "Kunstrasen 2 A",
        facilityName: "Anlage",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
    dressingRoomAllocations: [
      {
        facilityResourceId: "d1",
        facilityId: "f",
        code: "E1",
        name: "E1",
        facilityName: "G",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "ser",
    trainingSessionId: "sess",
    teamSeasonId: "ts",
    ...partial,
  } as WeekplannerItem;
}

describe("AggregatedActivityInspectionDialog stationary SCE-RESPONSIVE-01P", () => {
  const scrollToSpy = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.spyOn(window, "scrollTo").mockImplementation(scrollToSpy);
    Object.defineProperty(window, "scrollY", { value: 420, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  });

  it("keeps window, shell, sidebar, and planner scroll unchanged through open/close", async () => {
    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");

    const sidebar = document.createElement("nav");
    sidebar.setAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR, "");
    sidebar.id = "admin-sidebar-nav";
    sidebar.scrollTop = 0;

    const planner = document.createElement("div");
    planner.setAttribute("data-sce-planner-scroll-root", "");
    planner.scrollTop = 610;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Cluster";
    background.append(sidebar, planner, trigger);
    document.body.append(background);

    trigger.focus();

    const capture = {
      windowY: window.scrollY,
      sidebarTop: sidebar.scrollTop,
      plannerTop: planner.scrollTop,
    };

    const { rerender } = render(
      <AggregatedActivityInspectionDialog
        open={false}
        onClose={() => {}}
        items={[item({ id: "training:0" })]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    rerender(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[item({ id: "training:0" })]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("aggregated-activity-inspection-dialog")).toBeInTheDocument();
    });

    expect(window.scrollY).toBe(capture.windowY);
    expect(sidebar.scrollTop).toBe(capture.sidebarTop);
    expect(planner.scrollTop).toBe(capture.plannerTop);
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(scrollToSpy).not.toHaveBeenCalled();

    const overlay = screen.getByTestId("aggregated-activity-inspection-dialog");
    expect(overlay.classList.contains("sce-modal-overlay-root")).toBe(true);
    const viewport = overlay.querySelector(".sce-modal-overlay-content-viewport");
    expect(viewport).toBeTruthy();

    const title = screen.getByTestId("aggregate-inspection-title");
    expect(title).toHaveAttribute("tabIndex", "-1");
    expect(document.activeElement).toBe(title);

    rerender(
      <AggregatedActivityInspectionDialog
        open={false}
        onClose={() => {}}
        items={[item({ id: "training:0" })]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    expect(window.scrollY).toBe(capture.windowY);
    expect(sidebar.scrollTop).toBe(capture.sidebarTop);
    expect(planner.scrollTop).toBe(capture.plannerTop);
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
});
