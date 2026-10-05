/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-05R9 — manipulation dialog viewport & sticky actions
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubManipulationEditDialog from "../PlanningHubManipulationEditDialog";
import {
  PLANNING_HUB_MANIPULATION_MODAL_BODY,
  PLANNING_HUB_MANIPULATION_MODAL_PANEL,
} from "../PlanningHubManipulationModalShell";
import {
  buildManipulationAvailabilityLargeCatalog,
  buildManipulationAvailabilitySmallFcaCatalog,
} from "@/lib/planning-hub/manipulation-availability-scale-fixtures";
import { buildPlanningResourceGroupsFromFacilityGroups } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

const defaultApplyProps = {
  onApplyDraft: vi.fn().mockResolvedValue(undefined),
  applySaving: false,
  applyError: null,
};

function dressingFacilityGroups(rooms: { id: string; name: string }[]): FacilityGroup[] {
  return [
    {
      facilityId: "f-dress",
      facilityName: "Garderobe",
      resources: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.name,
        type: "DRESSING_ROOM" as const,
        facilityId: "f-dress",
        facilityName: "Garderobe",
      })),
    },
  ];
}

function refsFromDressing(groups: FacilityGroup[]): WeekplannerResourceRef[] {
  return groups[0]!.resources.map((r) => ({
    facilityResourceId: r.id,
    facilityId: r.facilityId,
    code: r.code,
    name: r.name,
    facilityName: r.facilityName,
    occupancyBeforeMinutes: 60,
    occupancyAfterMinutes: 45,
  }));
}

function refsFromPitchCatalog(catalog: FacilityGroup[]): WeekplannerResourceRef[] {
  const pitchGroups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
  return pitchGroups.flatMap((g) =>
    g.segments.map((s) => ({
      facilityResourceId: s.resourceId,
      facilityId: g.facilityId,
      code: s.fullResource.code,
      name: s.fullResource.name,
      facilityName: g.facilityName,
      resourceType: s.fullResource.type,
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    })),
  );
}

function matchWithDressing(
  room: WeekplannerResourceRef,
  start = "2026-09-20T14:30:00.000Z",
  end = "2026-09-20T17:00:00.000Z",
): WeekplannerItem {
  return {
    id: "match:m1",
    tenantId: "t1",
    type: "MATCH",
    eventId: "ev-1",
    startAt: new Date("2026-09-20T15:00:00.000Z"),
    endAt: new Date("2026-09-20T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T16:30:00.000Z"),
    timeOverridden: false,
    title: "Junioren F2",
    teamNames: ["F2"],
    pitchAllocations: [],
    dressingRoomAllocations: [room],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [room],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerItem;
}

function renderDressingEditor(rooms: { id: string; name: string }[], currentId: string) {
  const facilityGroups = dressingFacilityGroups(rooms);
  const resourceOptions = refsFromDressing(facilityGroups);
  const current = resourceOptions.find((r) => r.facilityResourceId === currentId)!;
  const item = matchWithDressing(current);
  render(
    <PlanningHubManipulationEditDialog
      item={item}
      segmentId="dressing:0"
      resourceId={currentId}
      locale="de-CH"
      timezone="Europe/Zurich"
      resourceCategory="dressing"
      resourceOptions={resourceOptions}
      facilityGroups={facilityGroups}
      allItems={[item]}
      onClose={vi.fn()}
      onSubmitDraft={vi.fn()}
      {...defaultApplyProps}
      evaluateConflicts={() => ({ status: "valid", message: "OK", newResourceConflictCount: 0 })}
    />,
  );
}

describe("PlanningHubManipulationEditDialog — 08-05R9 viewport shell", () => {
  it("exposes canonical header, scrollable body, and sticky footer regions", () => {
    renderDressingEditor(
      [
        { id: "room-e1", name: "E1" },
        { id: "room-o3", name: "O3" },
      ],
      "room-e1",
    );

    expect(screen.getByTestId("planning-hub-manipulation-edit-modal-header")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-edit-modal-body")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-edit-modal-footer")).toBeTruthy();

    const panel = screen.getByTestId("planning-hub-manipulation-edit-modal-panel");
    expect(panel.className).toContain("max-h-[var(--sce-dialog-max-height)]");
    expect(panel.className).toContain("overflow-hidden");

    const body = screen.getByTestId("planning-hub-manipulation-edit-modal-body");
    expect(body.className).toContain("overflow-y-auto");
  });

  it("keeps Abbrechen and Weiter in the footer outside the scrollable body", () => {
    renderDressingEditor(
      [
        { id: "room-e1", name: "E1" },
        { id: "room-o3", name: "O3" },
      ],
      "room-e1",
    );

    const body = screen.getByTestId("planning-hub-manipulation-edit-modal-body");
    const footer = screen.getByTestId("planning-hub-manipulation-edit-modal-footer");

    expect(within(footer).getByRole("button", { name: "Abbrechen" })).toBeTruthy();
    expect(within(footer).getByTestId("planning-hub-manipulation-edit-continue")).toBeTruthy();
    expect(within(body).queryByTestId("planning-hub-manipulation-edit-continue")).toBeNull();
    expect(body.className).toBe(PLANNING_HUB_MANIPULATION_MODAL_BODY);
    expect(screen.getByTestId("planning-hub-manipulation-edit-modal-panel").className).toContain(
      PLANNING_HUB_MANIPULATION_MODAL_PANEL.split(" ")[0]!,
    );
  });

  it("renders actions for a large dressing inventory", () => {
    const rooms = [
      ...["E1", "E2", "E3", "E4"].map((name, i) => ({ id: `room-e${i + 1}`, name })),
      ...["O1", "O2", "O3", "O4"].map((name, i) => ({ id: `room-o${i + 1}`, name })),
      ...Array.from({ length: 16 }, (_, i) => ({ id: `room-x${i}`, name: `X${i + 1}` })),
    ];
    renderDressingEditor(rooms, "room-e1");

    expect(screen.getByTestId("planning-hub-manipulation-edit-continue")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-board-large-inventory")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-resource-board")).toHaveAttribute(
      "data-presentation-mode",
      "LARGE_INVENTORY",
    );
  });

  it("renders actions for a large pitch inventory", () => {
    const catalog = buildManipulationAvailabilityLargeCatalog();
    const resourceOptions = refsFromPitchCatalog(catalog);
    const current = resourceOptions[0]!;
    const startAt = new Date("2026-09-20T15:00:00.000Z");
    const endAt = new Date("2026-09-20T16:30:00.000Z");
    const item = {
      id: "match:pitch",
      tenantId: "t1",
      type: "MATCH",
      eventId: "ev",
      startAt,
      endAt,
      canonicalStartAt: startAt,
      canonicalEndAt: endAt,
      timeOverridden: false,
      title: "Team",
      teamNames: ["A"],
      pitchAllocations: [current],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
      canonicalPitchAllocations: [current],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomResolvedBeforeMinutes: 60,
      dressingRoomResolvedAfterMinutes: 45,
    } as WeekplannerItem;

    render(
      <PlanningHubManipulationEditDialog
        item={item}
        segmentId="pitch:0"
        resourceId={current.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="pitch"
        resourceOptions={resourceOptions}
        facilityGroups={catalog}
        planningResourceGroups={buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch")}
        allItems={[item]}
        onClose={vi.fn()}
        onSubmitDraft={vi.fn()}
        {...defaultApplyProps}
        evaluateConflicts={() => ({ status: "valid", message: "OK", newResourceConflictCount: 0 })}
      />,
    );

    expect(screen.getByTestId("planning-hub-manipulation-edit-continue")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-resource-board")).toHaveAttribute(
      "data-presentation-mode",
      "LARGE_INVENTORY",
    );
  });

  it("preserves O3 selection and filter/search state after scrolling the modal body", async () => {
    const user = userEvent.setup();
    const rooms = [
      ...["E1", "E2", "E3", "E4"].map((name, i) => ({ id: `room-e${i + 1}`, name })),
      ...["O1", "O2", "O3", "O4"].map((name, i) => ({ id: `room-o${i + 1}`, name })),
    ];
    renderDressingEditor(rooms, "room-e1");

    const o3Cell = screen.getByTestId("planning-hub-manipulation-board-cell-room-o3");
    await user.click(o3Cell);
    expect(o3Cell).toHaveAttribute("aria-pressed", "true");

    const search = screen.getByTestId("planning-hub-manipulation-board-search");
    await user.type(search, "O3");
    await user.click(screen.getByTestId("planning-hub-manipulation-board-free-only"));

    const body = screen.getByTestId("planning-hub-manipulation-edit-modal-body");
    body.scrollTop = 400;
    body.dispatchEvent(new Event("scroll", { bubbles: true }));

    expect(screen.getByTestId("planning-hub-manipulation-board-cell-room-o3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(search).toHaveValue("O3");
    expect(screen.getByTestId("planning-hub-manipulation-board-free-only")).toBeChecked();

    await user.click(screen.getByTestId("planning-hub-manipulation-edit-continue"));
    expect(screen.getByTestId("planning-hub-manipulation-confirm-modal-footer")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-confirm-apply")).toBeTruthy();
  });

  it("uses grouped pitch matrix for medium FCA catalog without losing footer actions", () => {
    const catalog = buildManipulationAvailabilitySmallFcaCatalog();
    const resourceOptions = refsFromPitchCatalog(catalog);
    const current = resourceOptions.find((r) => r.name.includes("Kunstrasen 2")) ?? resourceOptions[0]!;
    const startAt = new Date("2026-09-20T15:00:00.000Z");
    const endAt = new Date("2026-09-20T16:30:00.000Z");
    const item = {
      id: "match:fca",
      tenantId: "t1",
      type: "MATCH",
      eventId: "ev",
      startAt,
      endAt,
      canonicalStartAt: startAt,
      canonicalEndAt: endAt,
      timeOverridden: false,
      title: "F2",
      teamNames: ["F2"],
      pitchAllocations: [current],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
      canonicalPitchAllocations: [current],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomResolvedBeforeMinutes: 60,
      dressingRoomResolvedAfterMinutes: 45,
    } as WeekplannerItem;

    render(
      <PlanningHubManipulationEditDialog
        item={item}
        segmentId="pitch:0"
        resourceId={current.facilityResourceId}
        locale="de-CH"
        timezone="Europe/Zurich"
        resourceCategory="pitch"
        resourceOptions={resourceOptions}
        facilityGroups={catalog}
        planningResourceGroups={buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch")}
        allItems={[item]}
        onClose={vi.fn()}
        onSubmitDraft={vi.fn()}
        {...defaultApplyProps}
        evaluateConflicts={() => ({ status: "valid", message: "OK", newResourceConflictCount: 0 })}
      />,
    );

    expect(screen.getByTestId("planning-hub-manipulation-pitch-board-grid")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-edit-modal-footer")).toBeTruthy();
  });
});
