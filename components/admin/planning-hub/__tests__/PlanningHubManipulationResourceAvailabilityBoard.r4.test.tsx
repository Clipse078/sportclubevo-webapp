/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubManipulationResourceAvailabilityBoard from "../PlanningHubManipulationResourceAvailabilityBoard";
import {
  buildManipulationResourceAvailabilityList,
  sortManipulationResourceAvailabilityForPicker,
} from "@/lib/planning-hub/manipulation-resource-availability";
import {
  buildManipulationAvailabilityLargeCatalog,
  buildManipulationAvailabilityMediumCatalog,
  buildManipulationAvailabilitySmallFcaCatalog,
} from "@/lib/planning-hub/manipulation-availability-scale-fixtures";
import { buildPlanningResourceGroupsFromFacilityGroups } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { WeekplannerMatchItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

function refsFromCatalog(catalog: ReturnType<typeof buildManipulationAvailabilityMediumCatalog>): WeekplannerResourceRef[] {
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

function matchEditing(current: WeekplannerResourceRef, allRefs: WeekplannerResourceRef[]): WeekplannerMatchItem {
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
    title: "Team A",
    teamNames: ["A"],
    opponentName: "B",
    homeAway: "HOME",
    eventId: "ev",
    pitchAllocations: [current],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [current],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerMatchItem;
}

function renderBoard(catalog: ReturnType<typeof buildManipulationAvailabilityMediumCatalog>, currentIndex = 0) {
  const refs = refsFromCatalog(catalog);
  const current = refs[currentIndex]!;
  const editing = matchEditing(current, refs);
  const entries = sortManipulationResourceAvailabilityForPicker(
    buildManipulationResourceAvailabilityList({
      allItems: [editing],
      editingItem: editing,
      currentResourceId: current.facilityResourceId,
      resourceOptions: refs,
      reservationStartAt: editing.startAt,
      reservationEndAt: editing.endAt,
      resourceKind: "PITCH_HALL",
    }),
  );
  const groups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");

  render(
    <PlanningHubManipulationResourceAvailabilityBoard
      item={editing}
      resourceKind="PITCH_HALL"
      availabilityEntries={entries}
      facilityGroups={catalog}
      planningResourceGroups={groups}
      selectedResourceId={current.facilityResourceId}
      onSelectResourceId={vi.fn()}
      reservationStartAt={editing.startAt}
      reservationEndAt={editing.endAt}
      timezone="Europe/Zurich"
    />,
  );

  return { refs, entries, editing, groups };
}

describe("PlanningHubManipulationResourceAvailabilityBoard — SCE-PLANNER-UX-08-05R4", () => {
  it("E — compact FCA-like catalog keeps full matrix without adaptive controls", () => {
    const catalog = buildManipulationAvailabilitySmallFcaCatalog();
    renderBoard(catalog);
    expect(screen.getByTestId("planning-hub-manipulation-resource-board").getAttribute("data-presentation-mode")).toBe(
      "COMPACT_MATRIX",
    );
    expect(screen.getByTestId("planning-hub-manipulation-pitch-board-grid")).toBeTruthy();
    expect(screen.queryByTestId("planning-hub-manipulation-board-inventory-controls")).toBeNull();
  });

  it("F — medium inventory shows best alternatives", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    renderBoard(catalog);
    expect(screen.getByTestId("planning-hub-manipulation-resource-board").getAttribute("data-presentation-mode")).toBe(
      "GROUPED_MATRIX",
    );
    expect(screen.getByTestId("planning-hub-manipulation-board-best-alternatives")).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-board-inventory-controls")).toBeTruthy();
  });

  it("G — large inventory does not expand pitch grid initially", () => {
    const catalog = buildManipulationAvailabilityLargeCatalog();
    renderBoard(catalog);
    expect(screen.getByTestId("planning-hub-manipulation-resource-board").getAttribute("data-presentation-mode")).toBe(
      "LARGE_INVENTORY",
    );
    expect(screen.getByTestId("planning-hub-manipulation-board-large-inventory")).toBeTruthy();
    expect(screen.queryByTestId("planning-hub-manipulation-pitch-board-grid")).toBeNull();
  });

  it("M/N — expanding site group exposes matrix; direct selection from alternative works", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const catalog = buildManipulationAvailabilityLargeCatalog();
    const refs = refsFromCatalog(catalog);
    const current = refs[0]!;
    const editing = matchEditing(current, refs);
    const entries = sortManipulationResourceAvailabilityForPicker(
      buildManipulationResourceAvailabilityList({
        allItems: [editing],
        editingItem: editing,
        currentResourceId: current.facilityResourceId,
        resourceOptions: refs,
        reservationStartAt: editing.startAt,
        reservationEndAt: editing.endAt,
        resourceKind: "PITCH_HALL",
      }),
    );
    const groups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");
    const freeAlternative = entries.find((e) => e.state === "AVAILABLE" && !e.isCurrent)!;

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={catalog}
        planningResourceGroups={groups}
        selectedResourceId={current.facilityResourceId}
        onSelectResourceId={onSelect}
        reservationStartAt={editing.startAt}
        reservationEndAt={editing.endAt}
        timezone="Europe/Zurich"
      />,
    );

    await user.click(screen.getByTestId("planning-hub-manipulation-board-alternative-" + freeAlternative.resourceId));
    expect(onSelect).toHaveBeenCalledWith(freeAlternative.resourceId);

    await user.click(screen.getByTestId("planning-hub-manipulation-board-site-toggle-Sportzentrum Nord"));
    expect(screen.getByTestId("planning-hub-manipulation-pitch-board-grid")).toBeTruthy();
    const freeCell = screen.getByTestId(
      "planning-hub-manipulation-board-cell-" + freeAlternative.resourceId,
    );
    await user.click(freeCell);
    expect(onSelect).toHaveBeenCalledWith(freeAlternative.resourceId);
  });

  it("P — current resource banner visible while filtering", async () => {
    const user = userEvent.setup();
    const catalog = buildManipulationAvailabilityMediumCatalog();
    renderBoard(catalog);
    await user.click(screen.getByTestId("planning-hub-manipulation-board-free-only"));
    expect(screen.getByTestId("planning-hub-manipulation-board-current-resource")).toBeTruthy();
  });

  it("Q — no-free-resource copy when everything occupied", () => {
    const catalog = buildManipulationAvailabilityMediumCatalog();
    const refs = refsFromCatalog(catalog);
    const current = refs[0]!;
    const editing = matchEditing(current, refs);
    const others = refs.slice(1).map((ref, index) => {
      const item = matchEditing(ref, refs);
      return { ...item, id: `match:${index}`, eventId: `ev:${index}` };
    });
    const entries = sortManipulationResourceAvailabilityForPicker(
      buildManipulationResourceAvailabilityList({
        allItems: [editing, ...others],
        editingItem: editing,
        currentResourceId: current.facilityResourceId,
        resourceOptions: refs,
        reservationStartAt: editing.startAt,
        reservationEndAt: editing.endAt,
        resourceKind: "PITCH_HALL",
      }),
    );
    const groups = buildPlanningResourceGroupsFromFacilityGroups(catalog, "pitch");

    render(
      <PlanningHubManipulationResourceAvailabilityBoard
        item={editing}
        resourceKind="PITCH_HALL"
        availabilityEntries={entries}
        facilityGroups={catalog}
        planningResourceGroups={groups}
        selectedResourceId={current.facilityResourceId}
        onSelectResourceId={vi.fn()}
        reservationStartAt={editing.startAt}
        reservationEndAt={editing.endAt}
        timezone="Europe/Zurich"
      />,
    );

    expect(screen.getByTestId("planning-hub-manipulation-board-no-free-alternative")).toBeTruthy();
  });

  it("D search empty state", async () => {
    const user = userEvent.setup();
    const catalog = buildManipulationAvailabilityMediumCatalog();
    renderBoard(catalog);
    const search = screen.getByTestId("planning-hub-manipulation-board-search");
    await user.type(search, "Kunstrasen 7");
    expect(screen.getByTestId("planning-hub-manipulation-board-search-empty").textContent).toContain(
      "Kunstrasen 7",
    );
  });
});
