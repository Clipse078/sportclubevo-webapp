/**
 * @vitest-environment jsdom
 *
 * PLANNING-RESOURCE-UX-01-V — focused permission verification for
 * Wochenplaner canonical edit gating (Planning Hub Liste activation path).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import WeekPlannerPage from "@/components/admin/planner/WeekPlannerPage";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import { WEEKPLANNER_DRESSING_OCCUPANCY_STUB } from "@/lib/weekplanner/test-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { danger: vi.fn() } }),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const FACILITY_GROUPS = { PITCH_HALL: [], DRESSING_ROOM: [] };

const LISTE_URL = {
  week: "2026-38",
  perspective: "liste" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
    search: "",
  conflictsOnly: false,
  resourceCategory: "pitch" as const,
};

function makeWeek(items: WeekplannerWeek["days"][0]["items"]): WeekplannerWeek {
  return {
    param: "2026-38",
    previousParam: "2026-37",
    nextParam: "2026-39",
    weekNumberLabel: "KW 38",
    rangeLabel: "Montag 21. Sep – Sonntag 27. Sep 2026",
    days: [
      {
        dayKey: "2026-09-22",
        items,
      },
      ...["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-21"].map(
        (dayKey) => ({ dayKey, items: [] }),
      ),
    ],
  };
}

const TRAINING_ITEM = {
  id: "train-1",
  tenantId: "tenant-1",
  type: "TRAINING" as const,
  startAt: new Date("2026-09-22T16:00:00.000Z"),
  endAt: new Date("2026-09-22T17:30:00.000Z"),
  canonicalStartAt: new Date("2026-09-22T16:00:00.000Z"),
  canonicalEndAt: new Date("2026-09-22T17:30:00.000Z"),
  title: "E3 Training",
  teamNames: ["E3"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  timeOverridden: false,
  conflicts: [],
  trainingSeriesId: "series-1",
  trainingSessionId: "session-1",
  teamSeasonId: "ts-1",
  ...WEEKPLANNER_DRESSING_OCCUPANCY_STUB,
};

const MATCH_ITEM = {
  id: "match-1",
  tenantId: "tenant-1",
  type: "MATCH" as const,
  startAt: new Date("2026-09-22T14:00:00.000Z"),
  endAt: new Date("2026-09-22T16:00:00.000Z"),
  canonicalStartAt: new Date("2026-09-22T14:00:00.000Z"),
  canonicalEndAt: new Date("2026-09-22T16:00:00.000Z"),
  title: "Heimspiel vs. FC Test",
  teamNames: ["E3"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  awayDressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  timeOverridden: false,
  conflicts: [],
  eventId: "event-1",
  opponentName: "FC Test",
  eventSource: "MANUAL",
  homeSide: { displayName: "FC Allschwil 1", logoUrl: null, isOwnTeam: true },
  awaySide: { displayName: "FC Test", logoUrl: null, isOwnTeam: false },
  publicationVisibility: {
    websiteVisible: false,
    infoboardVisible: true,
    homepageVisible: false,
    wochenplanVisible: true,
    trainingsplanVisible: false,
    teamPageVisible: false,
  },
  ...WEEKPLANNER_DRESSING_OCCUPANCY_STUB,
};

const TOURNAMENT_ITEM = {
  id: "tournament-1",
  tenantId: "tenant-1",
  type: "TOURNAMENT" as const,
  startAt: new Date("2026-09-22T09:00:00.000Z"),
  endAt: new Date("2026-09-22T17:00:00.000Z"),
  canonicalStartAt: new Date("2026-09-22T09:00:00.000Z"),
  canonicalEndAt: new Date("2026-09-22T17:00:00.000Z"),
  title: "Juniorenturnier",
  teamNames: ["E3"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  timeOverridden: false,
  conflicts: [],
  eventId: "event-2",
  homeAway: "HOME" as const,
  teamSeasonIds: [],
  participantAllocations: [],
  ...WEEKPLANNER_DRESSING_OCCUPANCY_STUB,
};

const ALL_ITEMS = [TRAINING_ITEM, MATCH_ITEM, TOURNAMENT_ITEM];

async function openListeBearbeiten(
  user: ReturnType<typeof userEvent.setup>,
  itemId: string,
) {
  await user.click(screen.getByTestId(`planning-hub-liste-row-menu-${itemId}`));
  await user.click(screen.getByTestId(`planning-hub-liste-action-edit-${itemId}`));
}

describe("WeekPlannerPage — Planung bearbeiten permission gating", () => {
  it("TRAININGS_MANAGE only: Training opens editor, Match/Tournament do not", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek(ALL_ITEMS)}
        todayParam="2026-38"
        activePlanId={null}
        canManagePlans
        urlState={LISTE_URL}
        canonicalEditing={{
          canManageTrainings: true,
          canManageEvents: false,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(await screen.findByTestId("planning-hub-liste-operational-panel-train-1")).toBeInTheDocument();
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();

    await openListeBearbeiten(user, "train-1");
    expect(await screen.findByTestId("planning-hub-liste-operational-panel-train-1")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-training-pitch-train-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(screen.queryByTestId("planning-hub-liste-operational-panel-train-1")).toBeNull();
    await user.click(screen.getByTestId("weekplanner-item-match"));
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
    await user.click(screen.getByTestId("weekplanner-item-tournament"));
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
  });

  it("EVENTS_MANAGE only: Match/Tournament open editor, Training does not", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek(ALL_ITEMS)}
        todayParam="2026-38"
        activePlanId={null}
        canManagePlans
        urlState={LISTE_URL}
        canonicalEditing={{
          canManageTrainings: false,
          canManageEvents: true,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();

    await openListeBearbeiten(user, "match-1");
    expect(await screen.findByTestId("matchcenter-open-points-panel")).toBeInTheDocument();
  });

  it("both TRAININGS_MANAGE + EVENTS_MANAGE: all entity types open editor", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek(ALL_ITEMS)}
        todayParam="2026-38"
        activePlanId={null}
        canManagePlans
        urlState={LISTE_URL}
        canonicalEditing={{
          canManageTrainings: true,
          canManageEvents: true,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );

    const typeActivator: Record<string, string> = {
      "train-1": "weekplanner-item-training",
      "match-1": "weekplanner-item-match",
      "tournament-1": "weekplanner-item-tournament",
    };
    for (const itemId of ["train-1", "match-1", "tournament-1"]) {
      await openListeBearbeiten(user, itemId);
      if (itemId === "match-1") {
        expect(await screen.findByTestId("matchcenter-open-points-panel")).toBeInTheDocument();
      } else {
        expect(await screen.findByTestId(`planning-hub-liste-operational-panel-${itemId}`)).toBeInTheDocument();
      }
      await user.click(screen.getByTestId(typeActivator[itemId]));
    }
  });

  it("PLANNING_ALLOCATIONS_MANAGE only: Match opens operational panel from Liste menu", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek([MATCH_ITEM])}
        todayParam="2026-38"
        activePlanId={null}
        canManagePlans
        urlState={LISTE_URL}
        canonicalEditing={{
          canManageTrainings: false,
          canManageEvents: false,
          canManageAllocations: true,
          canViewTrainings: true,
          canViewEvents: true,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );

    await user.click(screen.getByTestId("planning-hub-liste-row-menu-match-1"));
    await user.click(screen.getByTestId("planning-hub-liste-action-pitch-match-1"));
    expect(await screen.findByTestId("matchcenter-open-points-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
  });

  it("no canonicalEditing: canonical editor never opens", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek(ALL_ITEMS)}
        todayParam="2026-38"
        activePlanId={null}
        canManagePlans
        urlState={LISTE_URL}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(await screen.findByTestId("planning-hub-liste-operational-panel-train-1")).toBeInTheDocument();
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
  });

  it("alternative plan active: canonical editor not used from Liste", async () => {
    const user = userEvent.setup();
    render(
      <WeekPlannerPage
        week={makeWeek(ALL_ITEMS)}
        todayParam="2026-38"
        activePlanId="plan-alt"
        canManagePlans
        urlState={LISTE_URL}
        canonicalEditing={{
          canManageTrainings: true,
          canManageEvents: true,
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
        overrideEditing={{
          planId: "plan-alt",
          planName: "Alt",
          overridesByKey: {},
          facilityGroupsByAllocationGroup: FACILITY_GROUPS,
        }}
      />,
    );

    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(await screen.findByTestId("planning-hub-liste-operational-panel-train-1")).toBeInTheDocument();
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
    await user.click(screen.getByTestId("planning-hub-liste-row-menu-train-1"));
    expect(screen.queryByTestId("planning-hub-liste-action-edit-train-1")).toBeNull();
    expect(screen.getByText(/Betriebsplan-Editor/)).toBeInTheDocument();
  });
});
