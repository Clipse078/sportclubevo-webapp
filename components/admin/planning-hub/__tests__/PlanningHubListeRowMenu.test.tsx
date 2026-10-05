/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-06R1 — Liste row action menu.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeRowMenu from "../PlanningHubListeRowMenu";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

vi.mock("../PlanningHubManipulationContext", () => ({
  usePlanningHubManipulation: () => ({
    enabled: true,
    openActivityScheduleEditor: vi.fn(),
    openResourceEditorForConflict: vi.fn(),
  }),
}));

const item: WeekplannerTrainingItem = {
  id: "training:1",
  tenantId: "t1",
  type: "TRAINING",
  startAt: new Date("2026-10-05T15:00:00.000Z"),
  endAt: new Date("2026-10-05T16:30:00.000Z"),
  canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
  canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
  timeOverridden: false,
  title: "Training",
  teamNames: ["Junioren F2"],
  pitchAllocations: [
    {
      facilityResourceId: "p1",
      facilityId: "f1",
      code: "STADION_A",
      name: "Hauptfeld A",
      facilityName: "Hauptfeld",
      resourceType: "HALF_PITCH",
      occupancyBeforeMinutes: 15,
      occupancyAfterMinutes: 0,
    },
  ],
  dressingRoomAllocations: [],
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
  trainingSeriesId: "s1",
  trainingSessionId: "1",
  teamSeasonId: "ts1",
};

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: false,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

function renderMenu(canEditItem = true, permissions = permissionContext) {
  return render(
    <PlanningHubListeRowMenu
      item={item}
      permissionContext={permissions}
      canEditItem={canEditItem}
      onOpenItem={vi.fn()}
      onEditPlanning={vi.fn()}
      onReviewConflict={vi.fn()}
    />,
  );
}

describe("PlanningHubListeRowMenu", () => {
  it("lists open and planning actions without overflow-y clipping class on the popover", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTestId("planning-hub-liste-row-menu-training:1"));

    expect(screen.getByTestId("planning-hub-liste-action-open-training:1")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-action-plan-training:1")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-action-schedule-training:1")).toBeInTheDocument();

    const panel = screen.getByTestId("planning-hub-liste-action-open-training:1").closest("[role='dialog']");
    expect(panel).toBeTruthy();
    expect(panel?.className).not.toMatch(/overflow-y-auto/);
  });

  it("hides planning edit when item is not editable", async () => {
    const user = userEvent.setup();
    renderMenu(false, { ...permissionContext, canManageTrainings: false });

    await user.click(screen.getByTestId("planning-hub-liste-row-menu-training:1"));

    expect(screen.queryByTestId("planning-hub-liste-action-plan-training:1")).not.toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-action-open-training:1")).toBeInTheDocument();
  });
});
