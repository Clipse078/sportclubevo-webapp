/**
 * @vitest-environment jsdom
 *
 * components/admin/planner/__tests__/WeekPlannerPage.test.tsx
 *
 * WEEKPLANNER-01C — focused tests for operational UX completion:
 *   - Standardplan is read-only: no override editor renders, canonical
 *     module safety note is shown (only for managers)
 *   - selecting an alternative plan renders Training/Match/Tournament
 *     override editors
 *   - Doppelbelegung (conflict) badges render from the already-resolved
 *     per-plan effective allocations passed in (isolation is enforced
 *     upstream by lib/weekplanner/queries.ts — see plan-overrides.test.ts)
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeekPlannerPage from "@/components/admin/planner/WeekPlannerPage";
import type { WeekplannerDay, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const LISTE_URL = {
  perspective: "liste" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
  conflictsOnly: false,
  resourceCategory: "pitch" as const,
};

function emptyDay(dayKey: string): WeekplannerDay {
  return { dayKey, items: [] };
}

function makeWeek(days: WeekplannerDay[]): WeekplannerWeek {
  const byKey = new Map(days.map((d) => [d.dayKey, d]));
  const allDayKeys = [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
  ];
  return {
    days: allDayKeys.map((k) => byKey.get(k) ?? emptyDay(k)),
    weekNumberLabel: "KW 33",
    rangeLabel: "10.–16. Aug 2026",
    param: "2026-08-10",
    previousParam: "2026-08-03",
    nextParam: "2026-08-17",
  };
}

const PLAN: WeekplannerPlanDto = {
  id: "plan-schlechtwetter",
  tenantId: "tenant-1",
  weekId: "2026-08-10",
  name: "Schlechtwetterplan",
  createdByUserId: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  archivedAt: null,
  isActive: false,
};

const FACILITY_GROUPS_BY_GROUP = {
  PITCH_HALL: [
    {
      facilityId: "facility-1",
      facilityName: "Sportanlage Bruel",
      resources: [{ id: "res-halle", name: "Halle Gartenhof", code: "HALLE", type: "FULL_PITCH" as const, facilityId: "facility-1", facilityName: "Sportanlage Bruel" }],
    },
  ] as FacilityGroup[],
  DRESSING_ROOM: [
    {
      facilityId: "facility-2",
      facilityName: "Garderobentrakt",
      resources: [{ id: "res-g3", name: "Garderobe 3", code: "G3", type: "DRESSING_ROOM" as const, facilityId: "facility-2", facilityName: "Garderobentrakt" }],
    },
  ] as FacilityGroup[],
};

const TRAINING_ITEM = {
  id: "training:session-1",
  tenantId: "tenant-1",
  type: "TRAINING" as const,
  startAt: new Date("2026-08-10T16:00:00.000Z"),
  endAt: new Date("2026-08-10T17:30:00.000Z"),
  canonicalStartAt: new Date("2026-08-10T16:00:00.000Z"),
  canonicalEndAt: new Date("2026-08-10T17:30:00.000Z"),
  timeOverridden: false,
  title: "E2 Training",
  teamNames: ["FC Allschwil E2"],
  pitchAllocations: [{
    facilityResourceId: "res-kr2",
    facilityId: "fac-1",
    code: "KR2",
    name: "Kunstrasen 2",
    facilityName: "Sportanlage Bruel",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  }],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [{
    facilityResourceId: "res-kr2",
    facilityId: "fac-1",
    code: "KR2",
    name: "Kunstrasen 2",
    facilityName: "Sportanlage Bruel",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  }],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [{ facilityResourceId: "res-kr2", facilityResourceName: "Kunstrasen 2" }],
  trainingSeriesId: "series-1",
  trainingSessionId: "session-1",
  teamSeasonId: "ts-1",
};

const TRAINING_ITEM_CONFLICT = {
  ...TRAINING_ITEM,
  id: "training:session-2",
  trainingSessionId: "session-2",
  title: "E3 Training",
  teamNames: ["FC Allschwil E3"],
  conflicts: [{ facilityResourceId: "res-kr2", facilityResourceName: "Kunstrasen 2" }],
};

const MATCH_ITEM = {
  id: "match:event-match-1",
  tenantId: "tenant-1",
  type: "MATCH" as const,
  startAt: new Date("2026-08-15T13:00:00.000Z"),
  endAt: new Date("2026-08-15T14:30:00.000Z"),
  canonicalStartAt: new Date("2026-08-15T13:00:00.000Z"),
  canonicalEndAt: new Date("2026-08-15T14:30:00.000Z"),
  timeOverridden: false,
  title: "FC Allschwil 1 - Gegner FC",
  teamNames: ["FC Allschwil 1"],
  opponentName: "Gegner FC",
  eventSource: "MANUAL",
  homeSide: { displayName: "FC Allschwil 1", logoUrl: null, isOwnTeam: true },
  awaySide: { displayName: "Gegner FC", logoUrl: null, isOwnTeam: false },
  homeAway: "HOME" as const,
  eventId: "event-match-1",
  pitchAllocations: [{ facilityResourceId: "res-pitch-standard", facilityId: "fac-1", code: "KR2", name: "Kunstrasen 2", facilityName: "Sportanlage Bruel", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
  dressingRoomAllocations: [{ facilityResourceId: "res-room-standard", facilityId: "fac-2", code: "G1", name: "Garderobe 1", facilityName: "Garderobentrakt", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
  canonicalPitchAllocations: [{ facilityResourceId: "res-pitch-standard", facilityId: "fac-1", code: "KR2", name: "Kunstrasen 2", facilityName: "Sportanlage Bruel", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
  canonicalDressingRoomAllocations: [{ facilityResourceId: "res-room-standard", facilityId: "fac-2", code: "G1", name: "Garderobe 1", facilityName: "Garderobentrakt", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  awayDressingRoomAllocations: [],
  conflicts: [],
};

const TOURNAMENT_ITEM = {
  id: "tournament:event-tournament-1",
  tenantId: "tenant-1",
  type: "TOURNAMENT" as const,
  startAt: new Date("2026-08-15T08:00:00.000Z"),
  endAt: new Date("2026-08-15T16:00:00.000Z"),
  canonicalStartAt: new Date("2026-08-15T08:00:00.000Z"),
  canonicalEndAt: new Date("2026-08-15T16:00:00.000Z"),
  timeOverridden: false,
  title: "FCA Sommerturnier",
  teamNames: ["FC Allschwil E1"],
  homeAway: "HOME" as const,
  eventId: "event-tournament-1",
  pitchAllocations: [{ facilityResourceId: "res-pitch-standard", code: "KR2", name: "Kunstrasen 2", facilityName: "Sportanlage Bruel" }],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [{ facilityResourceId: "res-pitch-standard", code: "KR2", name: "Kunstrasen 2", facilityName: "Sportanlage Bruel" }],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  participantAllocations: [
    {
      participantId: "participant-1",
      participantLabel: "FC Allschwil E1",
      dressingRoomAllocations: [{ facilityResourceId: "res-room-standard", facilityId: "fac-2", code: "G1", name: "Garderobe 1", facilityName: "Garderobentrakt", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
      canonicalDressingRoomAllocations: [{ facilityResourceId: "res-room-standard", facilityId: "fac-2", code: "G1", name: "Garderobe 1", facilityName: "Garderobentrakt", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
      dressingRoomOverridden: false,
    },
  ],
  conflicts: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ availability: [] }) }),
  );
});

describe("WeekPlannerPage — default Kalender workspace", () => {
  it("renders the week×time Kalender as the default view without legacy Standardplan banner", () => {
    const week = makeWeek([{ dayKey: "2026-08-10", items: [TRAINING_ITEM] }]);
    render(<WeekPlannerPage week={week} todayParam="2026-08-10" plans={[PLAN]} activePlanId={null} canManagePlans />);

    expect(screen.getByTestId("planning-hub-calendar")).toBeInTheDocument();
    expect(screen.queryByTestId("weekplanner-standardplan-safety-note")).not.toBeInTheDocument();
    expect(screen.queryByText("Spielfeld/Halle anpassen")).not.toBeInTheDocument();
  });
});

describe("WeekPlannerPage — alternative plan operational sheet", () => {
  it("opens the operational planning sheet when an activity is activated under an alternative plan", async () => {
    const user = userEvent.setup();
    const week = makeWeek([{ dayKey: "2026-08-10", items: [TRAINING_ITEM] }]);
    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-08-10"
        plans={[PLAN]}
        activePlanId={PLAN.id}
        canManagePlans
        urlState={LISTE_URL}
        overrideEditing={{
          planId: PLAN.id,
          planName: PLAN.name,
          overridesByKey: {},
          facilityGroupsByAllocationGroup: FACILITY_GROUPS_BY_GROUP,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(await screen.findByTestId("weekplanner-operational-editor")).toBeInTheDocument();
  });
});

describe("WeekPlannerPage — override editing per activity type", () => {
  it("supports operational override editing for TRAINING, MATCH and TOURNAMENT via the planning sheet", async () => {
    const user = userEvent.setup();
    const week = makeWeek([
      { dayKey: "2026-08-10", items: [TRAINING_ITEM] },
      { dayKey: "2026-08-15", items: [MATCH_ITEM, TOURNAMENT_ITEM] },
    ]);

    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-08-10"
        plans={[PLAN]}
        activePlanId={PLAN.id}
        canManagePlans
        urlState={LISTE_URL}
        overrideEditing={{
          planId: PLAN.id,
          planName: PLAN.name,
          overridesByKey: {},
          facilityGroupsByAllocationGroup: FACILITY_GROUPS_BY_GROUP,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(await screen.findByTestId("weekplanner-operational-editor")).toBeInTheDocument();
  });
});

describe("WeekPlannerPage — WEEKPLANNER-01D effective time drives availability (test 8)", () => {
  it("passes the EFFECTIVE (overridden) start/end — not the canonical time — into the availability lookup once 'Anpassen' is opened", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ availability: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const overriddenTraining = {
      ...TRAINING_ITEM,
      startAt: new Date("2026-08-10T18:00:00.000Z"),
      endAt: new Date("2026-08-10T19:00:00.000Z"),
      timeOverridden: true,
    };
    const week = makeWeek([{ dayKey: "2026-08-10", items: [overriddenTraining] }]);
    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-08-10"
        plans={[PLAN]}
        activePlanId={PLAN.id}
        canManagePlans
        urlState={LISTE_URL}
        overrideEditing={{
          planId: PLAN.id,
          planName: PLAN.name,
          overridesByKey: {},
          facilityGroupsByAllocationGroup: FACILITY_GROUPS_BY_GROUP,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("startAt=2026-08-10T18%3A00%3A00.000Z"),
        expect.anything(),
      ),
    );
    // Never the canonical (un-overridden) 16:00 start.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("2026-08-10T16%3A00"))).toBe(false);
  });
});

describe("WeekPlannerPage — WEEKPLANNER-01D time override indicator", () => {
  it("shows a restrained 'Schlechtwetterplan angepasst' indicator + 'Standard: …' summary when an activity's time or resources are overridden — even for read-only viewers", () => {
    const overriddenTraining = {
      ...TRAINING_ITEM,
      startAt: new Date("2026-08-10T17:00:00.000Z"),
      timeOverridden: true,
      pitchAllocations: [{ facilityResourceId: "res-halle", code: "HALLE", name: "Halle Gartenhof", facilityName: "Sportanlage Bruel" }],
      pitchOverridden: true,
    };
    const week = makeWeek([{ dayKey: "2026-08-10", items: [overriddenTraining] }]);
    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-08-10"
        plans={[PLAN]}
        activePlanId={PLAN.id}
        canManagePlans={false}
        urlState={LISTE_URL}
      />,
    );

    const trainingCard = screen.getByTestId("weekplanner-item-training");
    const indicator = within(trainingCard).getByTestId("weekplanner-override-indicator");
    expect(indicator).toHaveTextContent("Schlechtwetterplan angepasst");
  });

  it("shows no override indicator for an untouched (non-overridden) activity", () => {
    const week = makeWeek([{ dayKey: "2026-08-10", items: [TRAINING_ITEM] }]);
    render(
      <WeekPlannerPage
        week={week}
        todayParam="2026-08-10"
        plans={[PLAN]}
        activePlanId={PLAN.id}
        canManagePlans={false}
        urlState={LISTE_URL}
      />,
    );

    const trainingCard = screen.getByTestId("weekplanner-item-training");
    expect(within(trainingCard).queryByTestId("weekplanner-override-indicator")).not.toBeInTheDocument();
  });
});

describe("WeekPlannerPage — shared occupancy visibility", () => {
  it("renders a shared-occupancy badge on the affected item and a week-level conflict attention count", () => {
    const week = makeWeek([{ dayKey: "2026-08-10", items: [TRAINING_ITEM, TRAINING_ITEM_CONFLICT] }]);
    render(<WeekPlannerPage week={week} todayParam="2026-08-10" plans={[]} activePlanId={null} canManagePlans={false} />);

    expect(screen.getByTestId("planning-hub-conflict-attention")).toHaveTextContent(/Konflikt/);
  });

  it("shows compact no-conflict state when the week has zero conflicts", () => {
    const week = makeWeek([{ dayKey: "2026-08-10", items: [TRAINING_ITEM] }]);
    render(<WeekPlannerPage week={week} todayParam="2026-08-10" plans={[]} activePlanId={null} canManagePlans={false} />);

    expect(screen.getByTestId("planning-hub-conflict-none")).toBeInTheDocument();
  });
});
