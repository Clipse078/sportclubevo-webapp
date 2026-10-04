/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubManipulationEditDialog from "../PlanningHubManipulationEditDialog";
import PlanningHubManipulationResourceAvailabilityBoard from "../PlanningHubManipulationResourceAvailabilityBoard";
import {
  buildManipulationResourceAvailabilityList,
  sortManipulationResourceAvailabilityForPicker,
} from "@/lib/planning-hub/manipulation-resource-availability";
import { buildPlanningResourceGroupsFromFacilityGroups } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { WeekplannerMatchItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

const KR2_FULL: WeekplannerResourceRef = {
  facilityResourceId: "kr2-full",
  facilityId: "fac-kr2",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Anlage",
  resourceType: "FULL_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR2_A: WeekplannerResourceRef = {
  facilityResourceId: "kr2-a",
  facilityId: "fac-kr2",
  code: "KR2_A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR2_B: WeekplannerResourceRef = {
  facilityResourceId: "kr2-b",
  facilityId: "fac-kr2",
  code: "KR2_B",
  name: "Kunstrasen 2 B",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR3_A: WeekplannerResourceRef = {
  facilityResourceId: "kr3-a",
  facilityId: "fac-kr3",
  code: "KR3_A",
  name: "Kunstrasen 3 A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const facilityGroupsPitch = [
  {
    facilityId: "fac-kr2",
    facilityName: "Kunstrasen 2",
    resources: [
      {
        id: KR2_FULL.facilityResourceId,
        name: "Kunstrasen 2",
        code: "KR2",
        type: "FULL_PITCH" as const,
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
      {
        id: KR2_A.facilityResourceId,
        name: "Kunstrasen 2 A",
        code: "KR2_A",
        type: "HALF_PITCH" as const,
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
      {
        id: KR2_B.facilityResourceId,
        name: "Kunstrasen 2 B",
        code: "KR2_B",
        type: "HALF_PITCH" as const,
        facilityId: "fac-kr2",
        facilityName: "Kunstrasen 2",
      },
    ],
  },
  {
    facilityId: "fac-kr3",
    facilityName: "Kunstrasen 3",
    resources: [
      {
        id: KR3_A.facilityResourceId,
        name: "Kunstrasen 3 A",
        code: "KR3_A",
        type: "HALF_PITCH" as const,
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
    ],
  },
];

function matchBase(overrides: Partial<WeekplannerMatchItem> = {}): WeekplannerMatchItem {
  const startAt = new Date("2026-09-20T15:00:00.000Z");
  const endAt = new Date("2026-09-20T16:30:00.000Z");
  return {
    id: "match:edit",
    tenantId: "t1",
    type: "MATCH",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Junioren F1",
    teamNames: ["F1"],
    opponentName: "X",
    homeAway: "HOME",
    eventId: "ev-edit",
    pitchAllocations: [KR2_A],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [KR2_A],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [
      {
        facilityResourceId: "kr2-b",
        facilityResourceName: "Kunstrasen 2 B",
        resourceKind: "PITCH_HALL",
        partnerItemId: "match:other",
        partnerTitle: "Junioren F1 Training",
        overlapStartAt: startAt,
        overlapEndAt: endAt,
        occupancyStartAt: startAt,
        occupancyEndAt: endAt,
      },
    ],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
    ...overrides,
  } as WeekplannerMatchItem;
}

function buildPitchAvailability(item: WeekplannerMatchItem, allItems: WeekplannerMatchItem[]) {
  const reservationStart = new Date("2026-09-20T15:00:00.000Z");
  const reservationEnd = new Date("2026-09-20T16:30:00.000Z");
  return sortManipulationResourceAvailabilityForPicker(
    buildManipulationResourceAvailabilityList({
      allItems,
      editingItem: item,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_FULL, KR2_A, KR2_B, KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    }),
  );
}

describe("PlanningHubManipulationResourceAvailabilityBoard — SCE-PLANNER-UX-08-05R3", () => {
  it("shows pitch board immediately with facility grouping and segment headers", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Junioren F1 Training",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const entries = buildPitchAvailability(editing, [editing, other]);
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={facilityGroupsPitch}
        planningResourceGroups={groups}
        selectedResourceId={KR2_A.facilityResourceId}
        onSelectResourceId={vi.fn()}
        reservationStartAt={new Date("2026-09-20T15:00:00.000Z")}
        reservationEndAt={new Date("2026-09-20T16:30:00.000Z")}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByTestId("planning-hub-manipulation-resource-board")).toBeTruthy();
    expect(screen.getByText("Spielfeld-Verfügbarkeit")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-pitch-board-grid")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-board-facility-fac-kr2")).toHaveTextContent(
      "Kunstrasen 2",
    );
    expect(screen.getByTestId("planning-hub-manipulation-board-segment-header-Gesamt")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-board-segment-header-A")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-board-segment-header-B")).toBeTruthy();
  });

  it("renders Frei, Belegt, Aktuell, Konflikt, and Empfohlen semantics", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Junioren F1 Training",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const entries = buildPitchAvailability(editing, [editing, other]);
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={facilityGroupsPitch}
        planningResourceGroups={groups}
        selectedResourceId={KR2_A.facilityResourceId}
        onSelectResourceId={vi.fn()}
        reservationStartAt={new Date("2026-09-20T15:00:00.000Z")}
        reservationEndAt={new Date("2026-09-20T16:30:00.000Z")}
        timezone="Europe/Zurich"
      />,
    );

    const currentCell = screen.getByTestId("planning-hub-manipulation-board-cell-kr2-a");
    expect(within(currentCell).getByText("Aktuell")).toBeTruthy();
    expect(within(currentCell).getByText("Konflikt")).toBeTruthy();

    const occupiedCell = screen.getByTestId("planning-hub-manipulation-board-cell-kr2-b");
    expect(within(occupiedCell).getByText("Belegt")).toBeTruthy();

    const kr3Cell = screen.getByTestId("planning-hub-manipulation-board-cell-kr3-a");
    expect(within(kr3Cell).getByText("Frei")).toBeTruthy();
    expect(within(kr3Cell).getByText("Empfohlen")).toBeTruthy();
  });

  it("selects target resource via keyboard on a free board cell", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const entries = buildPitchAvailability(editing, [editing, other]);
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={facilityGroupsPitch}
        planningResourceGroups={groups}
        selectedResourceId={KR2_A.facilityResourceId}
        onSelectResourceId={onSelect}
        reservationStartAt={new Date("2026-09-20T15:00:00.000Z")}
        reservationEndAt={new Date("2026-09-20T16:30:00.000Z")}
        timezone="Europe/Zurich"
      />,
    );

    const freeCell = screen.getByTestId("planning-hub-manipulation-board-cell-kr3-a");
    freeCell.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(KR3_A.facilityResourceId);
  });

  it("selects target resource when clicking a free board cell", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const entries = buildPitchAvailability(editing, [editing, other]);
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={facilityGroupsPitch}
        planningResourceGroups={groups}
        selectedResourceId={KR2_A.facilityResourceId}
        onSelectResourceId={onSelect}
        reservationStartAt={new Date("2026-09-20T15:00:00.000Z")}
        reservationEndAt={new Date("2026-09-20T16:30:00.000Z")}
        timezone="Europe/Zurich"
      />,
    );

    await user.click(screen.getByTestId("planning-hub-manipulation-board-cell-kr3-a"));
    expect(onSelect).toHaveBeenCalledWith(KR3_A.facilityResourceId);
  });

  it("exposes occupied conflict details via keyboard-focusable control", async () => {
    const user = userEvent.setup();
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      title: "Junioren F1 Training",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const entries = buildPitchAvailability(editing, [editing, other]);
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={facilityGroupsPitch}
        planningResourceGroups={groups}
        selectedResourceId={KR2_A.facilityResourceId}
        onSelectResourceId={vi.fn()}
        reservationStartAt={new Date("2026-09-20T15:00:00.000Z")}
        reservationEndAt={new Date("2026-09-20T16:30:00.000Z")}
        timezone="Europe/Zurich"
      />,
    );

    const detail = screen.getByTestId("planning-hub-manipulation-board-occupied-detail-kr2-b");
    detail.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Junioren F1 Training")).toBeTruthy();
  });

  it("integrates in edit dialog with reservation reactivity and picker fallback", async () => {
    const user = userEvent.setup();
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      title: "Junioren F1 Training",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const groups = buildPlanningResourceGroupsFromFacilityGroups(facilityGroupsPitch, "pitch");

    render(
      <PlanningHubManipulationEditDialog
        item={editing}
        segmentId="pitch:0"
        resourceId={KR2_A.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="pitch"
        resourceOptions={[KR2_FULL, KR2_A, KR2_B, KR3_A]}
        planningResourceGroups={groups}
        facilityGroups={facilityGroupsPitch}
        allItems={[editing, other]}
        onClose={vi.fn()}
        onSubmitDraft={vi.fn()}
        evaluateConflicts={() => ({
          status: "valid",
          message: "OK",
          newResourceConflictCount: 0,
        })}
      />,
    );

    expect(screen.getByTestId("planning-hub-manipulation-resource-board")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-pitch-board-grid")).toBeTruthy();

    await user.click(screen.getByTestId("planning-hub-manipulation-board-cell-kr3-a"));
    const trigger = screen.getByTestId("planning-hub-manipulation-resource-picker-trigger");
    expect(trigger.textContent).toContain("Kunstrasen 3");

    await user.clear(screen.getByLabelText("Reserviert ab"));
    await user.type(screen.getByLabelText("Reserviert ab"), "19:30");
    expect(screen.getByTestId("planning-hub-manipulation-resource-board-reservation-window").textContent).toContain(
      "19:30",
    );

    await user.click(screen.getByTestId("planning-hub-manipulation-resource-picker-trigger"));
    expect(screen.getByTestId("planning-hub-manipulation-resource-picker")).toBeTruthy();
  });
});
