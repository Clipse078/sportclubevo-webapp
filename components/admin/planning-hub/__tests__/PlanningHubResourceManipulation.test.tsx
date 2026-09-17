/**
 * @vitest-environment jsdom
 *
 * PLANNING-HUB-03A — Ressourcen drag/resize composition + capability matrix.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeekPlannerPage from "@/components/admin/planner/WeekPlannerPage";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { PlanningHubManipulationProvider } from "@/components/admin/planning-hub/PlanningHubManipulationContext";
import { getSchedulerManipulationCapabilities } from "@/lib/planning-hub/manipulation-capabilities";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerDay, WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const FACILITY_GROUPS = {
  PITCH_HALL: [
    {
      facilityId: "f-pitch",
      facilityName: "Anlage",
      resources: [
        {
          id: "pitch-1",
          name: "Platz 1",
          code: "P1",
          type: "FULL_PITCH" as const,
          facilityId: "f-pitch",
          facilityName: "Anlage",
        },
      ],
    },
  ] as FacilityGroup[],
  DRESSING_ROOM: [
    {
      facilityId: "f-dress",
      facilityName: "Garderobe",
      resources: [
        {
          id: "room-a",
          name: "Kabine A",
          code: "A",
          type: "DRESSING_ROOM" as const,
          facilityId: "f-dress",
          facilityName: "Garderobe",
        },
        {
          id: "room-b",
          name: "Kabine B",
          code: "B",
          type: "DRESSING_ROOM" as const,
          facilityId: "f-dress",
          facilityName: "Garderobe",
        },
      ],
    },
  ] as FacilityGroup[],
};

function baseItem(partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "id" | "type">): WeekplannerItem {
  return {
    tenantId: "t1",
    startAt: new Date("2026-09-20T07:30:00.000Z"),
    endAt: new Date("2026-09-20T09:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T07:30:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T09:30:00.000Z"),
    timeOverridden: false,
    title: "Activity",
    teamNames: [],
    pitchAllocations: [],
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
    ...partial,
  } as WeekplannerItem;
}

const TRAINING: WeekplannerItem = baseItem({
  id: "training:s1",
  type: "TRAINING",
  title: "Training",
  teamNames: ["Junioren F2"],
  trainingSeriesId: "ser",
  trainingSessionId: "sess",
  teamSeasonId: "ts",
  dressingRoomAllocations: [
    {
      facilityResourceId: "room-a",
      facilityId: "f-dress",
      code: "A",
      name: "Kabine A",
      facilityName: "Garderobe",
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    },
  ],
  canonicalDressingRoomAllocations: [
    {
      facilityResourceId: "room-a",
      facilityId: "f-dress",
      code: "A",
      name: "Kabine A",
      facilityName: "Garderobe",
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    },
  ],
});

const MATCH: WeekplannerItem = baseItem({
  id: "match:m1",
  type: "MATCH",
  title: "Spiel",
  teamNames: ["Junioren D-7 D2"],
  opponentName: "FC Münchenstein b",
  eventId: "ev1",
  homeAway: "HOME",
  awayDressingRoomAllocations: [],
  dressingRoomAllocations: [
    {
      facilityResourceId: "room-a",
      facilityId: "f-dress",
      code: "A",
      name: "Kabine A",
      facilityName: "Garderobe",
      occupancyBeforeMinutes: 60,
      occupancyAfterMinutes: 45,
    },
  ],
});

const TOURNAMENT: WeekplannerItem = baseItem({
  id: "tournament:t1",
  type: "TOURNAMENT",
  title: "PlayMore Turnier",
  teamNames: ["Junioren F1", "Junioren F2"],
  eventId: "ev2",
  homeAway: "HOME",
  participantAllocations: [],
  pitchAllocations: [
    {
      facilityResourceId: "pitch-1",
      facilityId: "f-pitch",
      code: "P1",
      name: "Platz 1",
      facilityName: "Anlage",
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    },
  ],
});

const EVENT: WeekplannerItem = baseItem({
  id: "veranstaltung:e1",
  type: "VERANSTALTUNG",
  title: "Clubveranstaltung",
  eventId: "ev3",
  location: null,
  teamSeasonId: null,
  allDay: false,
});

function weekWithDay(dayKey: string, items: WeekplannerItem[]): WeekplannerWeek {
  const days = [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
  ].map((k) => ({ dayKey: k, items: k === dayKey ? items : [] }));
  return {
    days,
    weekNumberLabel: "KW 38",
    rangeLabel: "14.–20. Sep 2026",
    param: "2026-09-14",
    previousParam: "2026-09-07",
    nextParam: "2026-09-21",
  };
}

const URL_STATE = {
  week: "2026-09-14",
  perspective: "ressourcen" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
  conflictsOnly: false,
  resourceCategory: "dressing" as const,
  day: "2026-09-20",
};

function renderResourceView(items: WeekplannerItem[], isStandardplan = true) {
  const week = weekWithDay("2026-09-20", items);
  const onActivate = vi.fn();
  render(
    <PlanningHubManipulationProvider
      week={week}
      urlState={URL_STATE}
      locale="de-CH"
      timezone="Europe/Zurich"
      isStandardplan={isStandardplan}
      alternativePlanId={isStandardplan ? null : "plan-alt"}
      canManageTrainings
      canManageEvents
      facilityGroupsByAllocationGroup={FACILITY_GROUPS}
      resourceRows={[
        { resourceId: "room-a", ref: TRAINING.dressingRoomAllocations[0]! },
        { resourceId: "room-b", ref: MATCH.dressingRoomAllocations[0]! },
      ]}
    >
      <PlanningHubResourceDayView
        week={week}
        urlState={URL_STATE}
        locale="de-CH"
        timezone="Europe/Zurich"
        todayDayKey="2026-09-20"
        onItemActivate={onActivate}
      />
    </PlanningHubManipulationProvider>,
  );
  return { onActivate };
}

describe("manipulation capabilities — Standardplan vs alternative", () => {
  const stdCtx = {
    isStandardplan: true,
    canManageTrainings: true,
    canManageEvents: true,
    alternativePlanId: null,
    resourceCategory: "dressing" as const,
  };
  const altCtx = { ...stdCtx, isStandardplan: false, alternativePlanId: "plan-1" };

  it("training on Standardplan Garderobe supports occupancy manipulation not activity time", () => {
    const caps = getSchedulerManipulationCapabilities(TRAINING, stdCtx);
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canResize).toBe(false);
    expect(caps.canMoveResourceOccupancy).toBe(true);
    expect(caps.canChangeDressingRoom).toBe(true);
  });

  it("match on Standardplan allows dressing reassignment only (no provider kickoff drag)", () => {
    const caps = getSchedulerManipulationCapabilities(MATCH, stdCtx);
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canResize).toBe(false);
    expect(caps.canChangeDressingRoom).toBe(true);
  });

  it("tournament on Standardplan dressing view has no fake time drag", () => {
    const caps = getSchedulerManipulationCapabilities(TOURNAMENT, {
      ...stdCtx,
      resourceCategory: "dressing",
    });
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canResize).toBe(false);
    expect(caps.canChangeDressingRoom).toBe(false);
  });

  it("alternative-plan match supports operational interval on Kalender (pitch category)", () => {
    const caps = getSchedulerManipulationCapabilities(MATCH, {
      ...altCtx,
      resourceCategory: "pitch",
    });
    expect(caps.canMoveTime).toBe(true);
    expect(caps.canResize).toBe(true);
    expect(caps.canChangePrimaryResource).toBe(true);
  });

  it("pitch allocation capability follows resource category", () => {
    const pitchCtx = { ...stdCtx, resourceCategory: "pitch" as const };
    expect(getSchedulerManipulationCapabilities(MATCH, pitchCtx).canChangePrimaryResource).toBe(true);
    expect(getSchedulerManipulationCapabilities(MATCH, pitchCtx).canChangeDressingRoom).toBe(false);
  });
});

describe("PlanningHubResourceDayView — pointer composition", () => {
  beforeEach(() => {
    if (typeof document.elementFromPoint !== "function") {
      document.elementFromPoint = () => null;
    }
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 768px)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("editable training block exposes grab cursor and resize hit zones", () => {
    renderResourceView([TRAINING]);
    const block = screen.getByTestId("planning-hub-activity-block-training");
    const body = block.querySelector("button")!;
    expect(body.className).toContain("cursor-grab");
    expect(block.querySelector('[aria-label="Startzeit anpassen"]')).toBeTruthy();
    expect(block.querySelector('[aria-label="Endzeit anpassen"]')).toBeTruthy();
  });

  it("movement threshold starts draft; pointerup opens confirmation", async () => {
    renderResourceView([TRAINING]);
    const body = screen.getByTestId("planning-hub-activity-block-training").querySelector("button")!;
    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(body, { clientX: 130, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
  });

  it("click without movement opens planning activation, not confirmation", async () => {
    const { onActivate } = renderResourceView([TRAINING]);
    const body = screen.getByTestId("planning-hub-activity-block-training").querySelector("button")!;
    await userEvent.click(body);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resize pointerdown does not activate planning sheet", async () => {
    const { onActivate } = renderResourceView([TRAINING]);
    const block = screen.getByTestId("planning-hub-activity-block-training");
    const resizeEnd = block.querySelector('[aria-label="Endzeit anpassen"]') as HTMLElement;
    fireEvent.pointerDown(resizeEnd, { clientX: 200, clientY: 50, button: 0, pointerId: 2 });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 50, pointerId: 2 });
    fireEvent.pointerUp(window, { pointerId: 2 });
    expect(onActivate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  });

  it("non-editable veranstaltung has no manipulation affordances", () => {
    renderResourceView([
      {
        ...EVENT,
        dressingRoomAllocations: [
          {
            facilityResourceId: "room-a",
            facilityId: "f-dress",
            code: "A",
            name: "Kabine A",
            facilityName: "Garderobe",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
      },
    ]);
    const block = screen.getByTestId("planning-hub-activity-block-veranstaltung");
    const body = block.querySelector("button")!;
    expect(body.className).not.toContain("cursor-grab");
    expect(block.querySelector('[aria-label="Endzeit anpassen"]')).toBeNull();
  });

  it("renders canonical multi-team tournament context", () => {
    renderResourceView([
      {
        ...TOURNAMENT,
        dressingRoomAllocations: [
          {
            facilityResourceId: "room-a",
            facilityId: "f-dress",
            code: "A",
            name: "Kabine A",
            facilityName: "Garderobe",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
      },
    ]);
    expect(screen.getByText(/Junioren F1 · Junioren F2/)).toBeTruthy();
  });

  it("does not invent team metadata when assignment is empty", () => {
    renderResourceView([
      {
        ...EVENT,
        teamNames: [],
        dressingRoomAllocations: [
          {
            facilityResourceId: "room-a",
            facilityId: "f-dress",
            code: "A",
            name: "Kabine A",
            facilityName: "Garderobe",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
      },
    ]);
    const block = screen.getByTestId("planning-hub-activity-block-veranstaltung");
    expect(block.textContent).not.toMatch(/Teams/);
  });
});

describe("WeekPlannerPage — manipulation provider mounting", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("mounts manipulation provider for Ressourcen when canonical editing is present", () => {
    const week = weekWithDay("2026-09-20", [TRAINING]);
    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-09-20"
        urlState={URL_STATE}
        canonicalEditing={{
          canManageTrainings: true,
          canManageEvents: true,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );
    const block = screen.getByTestId("planning-hub-activity-block-training").querySelector("button")!;
    expect(block.className).toContain("cursor-grab");
  });
});
