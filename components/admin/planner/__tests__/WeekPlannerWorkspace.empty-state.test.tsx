/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-06R2 — workspace must not swallow Liste filtered-empty state.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeekPlannerWorkspace from "../WeekPlannerWorkspace";
import type { WeekplannerMatchItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../PlannerWeekChromeBridge", () => ({
  usePublishPlannerWeekChrome: () => vi.fn(),
}));

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

function matchItem(): WeekplannerMatchItem {
  return {
    id: "match:1",
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-09T18:30:00.000Z"),
    endAt: new Date("2026-10-09T20:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-09T18:30:00.000Z"),
    canonicalEndAt: new Date("2026-10-09T20:30:00.000Z"),
    timeOverridden: false,
    title: "Senioren 40+ vs FC Birsfelden",
    teamNames: ["Senioren 40+"],
    teamSeasonId: "ts-senioren-40",
    opponentName: "FC Birsfelden",
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "e1",
    eventSource: "SFV",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 40+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Birsfelden", logoUrl: null, isOwnTeam: false },
  };
}

function week(): WeekplannerWeek {
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [{ dayKey: "2026-10-09", items: annotateWeekplannerConflicts([matchItem()]) }],
  };
}

describe("WeekPlannerWorkspace empty states", () => {
  it("renders Liste filtered-empty copy when filters exclude all items but the week has activities", () => {
    render(
      <WeekPlannerWorkspace
        week={week()}
        urlState={{
          week: "2026-10-05",
          perspective: "liste",
          activity: "spiele",
          team: "ts-unrelated",
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
      />,
    );

    expect(screen.getByText("Keine passenden Einträge")).toBeInTheDocument();
    expect(screen.getByText(/Für die aktuellen Filter/)).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-filtered-empty-reset")).toBeInTheDocument();
    expect(screen.queryByText("Keine Planungseinträge")).not.toBeInTheDocument();
  });

  it("renders genuine empty-week state when the week has no items", () => {
    render(
      <WeekPlannerWorkspace
        week={{ ...week(), days: week().days.map((d) => ({ ...d, items: [] })) }}
        urlState={{
          week: "2026-10-05",
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
      />,
    );

    expect(screen.getByText("Keine Planungseinträge")).toBeInTheDocument();
    expect(screen.queryByText("Keine passenden Einträge")).not.toBeInTheDocument();
  });
});
