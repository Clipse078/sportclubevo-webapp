/**
 * @vitest-environment jsdom
 *
 * PLANNING-RESOURCE-UX-01-V — focused permission verification for
 * Wochenplaner canonical edit gating (Planning Hub Liste activation path).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WeekPlannerPage from "@/components/admin/planner/WeekPlannerPage";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import { WEEKPLANNER_DRESSING_OCCUPANCY_STUB } from "@/lib/weekplanner/test-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const FACILITY_GROUPS = { PITCH_HALL: [], DRESSING_ROOM: [] };

const LISTE_URL = {
  week: "2026-38",
  perspective: "liste" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
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
  participantAllocations: [],
  ...WEEKPLANNER_DRESSING_OCCUPANCY_STUB,
};

const ALL_ITEMS = [TRAINING_ITEM, MATCH_ITEM, TOURNAMENT_ITEM];

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
    expect(screen.getByTestId("weekplanner-canonical-editor")).toBeInTheDocument();

    await user.keyboard("{Escape}");
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

    await user.click(screen.getByTestId("weekplanner-item-match"));
    expect(screen.getByTestId("weekplanner-canonical-editor")).toBeInTheDocument();
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

    for (const testId of [
      "weekplanner-item-training",
      "weekplanner-item-match",
      "weekplanner-item-tournament",
    ]) {
      await user.click(screen.getByTestId(testId));
      expect(screen.getByTestId("weekplanner-canonical-editor")).toBeInTheDocument();
      await user.keyboard("{Escape}");
    }
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
    expect(screen.queryByTestId("weekplanner-canonical-editor")).toBeNull();
  });
});
