/**
 * @vitest-environment jsdom
 *
 * SCE-PLANNER-UX-08-07R3 — Training absagen from conflict resolution actions.
 */

import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanningHubConflictResolutionActions from "../PlanningHubConflictResolutionActions";
import {
  PlanningHubManipulationContext,
  type PlanningHubManipulationContextValue,
} from "../PlanningHubManipulationContext";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "A",
  name: "Hauptfeld A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const TS = "ts-senioren-30-fca";
const start = new Date("2026-10-07T18:15:00.000Z");
const trainEnd = new Date("2026-10-07T19:45:00.000Z");
const matchEnd = new Date("2026-10-07T20:15:00.000Z");

function training(): WeekplannerTrainingItem {
  return {
    id: "training:30",
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: trainEnd,
    canonicalStartAt: start,
    canonicalEndAt: trainEnd,
    timeOverridden: false,
    title: "Senioren 30+ Training",
    teamNames: ["Senioren 30+"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
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
    trainingSeriesId: "series-30",
    trainingSessionId: "sess-30",
    teamSeasonId: TS,
  };
}

function homeMatch(): WeekplannerMatchItem {
  return {
    id: "match:30",
    tenantId: "t1",
    type: "MATCH",
    startAt: start,
    endAt: matchEnd,
    canonicalStartAt: start,
    canonicalEndAt: matchEnd,
    timeOverridden: false,
    title: "Senioren 30+ vs FC Dardania",
    teamNames: ["Senioren 30+"],
    teamSeasonId: TS,
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
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
    eventId: "ev-30",
    eventSource: "SFV",
    opponentName: "FC Dardania",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 30+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Dardania", logoUrl: null, isOwnTeam: false },
    awayDressingRoomAllocations: [],
  };
}

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

function mockManipulation(): PlanningHubManipulationContextValue {
  return {
    enabled: true,
    isDragging: false,
    permissionContext: { ...permissionContext, resourceCategory: "pitch", manipulationSurface: "resource" },
    previewDraft: null,
    dragConflictPreview: null,
    hoverResourceId: null,
    getCapabilities: vi.fn(),
    beginCalendarMove: vi.fn(),
    beginCalendarResize: vi.fn(),
    beginResourceMove: vi.fn(),
    beginResourceResize: vi.fn(),
    setCalendarDragLayout: vi.fn(),
    cancelManipulation: vi.fn(),
    resolveResourceRef: vi.fn(),
    openManipulationEditor: vi.fn(),
    openActivityScheduleEditor: vi.fn(),
    openResourceEditorForConflict: vi.fn(),
    openActivityScheduleEditorForConflict: vi.fn(),
  };
}

function renderWithManipulation(ui: ReactNode) {
  return render(
    <PlanningHubManipulationContext.Provider value={mockManipulation()}>{ui}</PlanningHubManipulationContext.Provider>,
  );
}

describe("PlanningHubSameTeamTrainingCancellation", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.includes("/api/training-sessions/sess-30")) {
          return new Response(JSON.stringify({ session: { id: "sess-30", status: "CANCELLED" } }), { status: 200 });
        }
        if (url.includes("/api/planning-hub/planner-revalidate")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
      }),
    );
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

  it("E — shortcut opens confirmation without PATCH until confirm", async () => {
    const user = userEvent.setup();
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const prefix = `r3-${tAnn.id}-${conflict.facilityResourceId}`;

    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        item={tAnn}
        conflict={conflict}
        itemsById={itemsById}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
        testIdPrefix="r3"
      />,
    );

    expect(screen.getByTestId(`${prefix}-cancel-training`)).toBeTruthy();
    await user.click(screen.getByTestId(`${prefix}-cancel-training`));
    expect(screen.getByText("Training absagen?")).toBeTruthy();
    expect(screen.getByText("Senioren 30+ vs FC Dardania")).toBeTruthy();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("F+G — confirm PATCHes session id once and refreshes planner", async () => {
    const user = userEvent.setup();
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const prefix = `r3-${tAnn.id}-${conflict.facilityResourceId}`;

    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        item={tAnn}
        conflict={conflict}
        itemsById={itemsById}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
        testIdPrefix="r3"
      />,
    );

    await user.click(screen.getByTestId(`${prefix}-cancel-training`));
    await user.click(screen.getByTestId(`${prefix}-cancel-training-dialog-confirm`));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/training-sessions/sess-30", expect.objectContaining({ method: "PATCH" }));
    });
    const patchCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      String(url).includes("/api/training-sessions/sess-30"),
    );
    expect(patchCalls).toHaveLength(1);
    expect(JSON.parse(String(patchCalls[0]![1]?.body))).toEqual({ status: "CANCELLED" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/planning-hub/planner-revalidate", { method: "POST" });
    expect(refresh).toHaveBeenCalled();
  });

  it("H — failure surfaces error and does not refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Nicht erlaubt" }), { status: 403 })),
    );
    const user = userEvent.setup();
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const prefix = `r3-${tAnn.id}-${conflict.facilityResourceId}`;

    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        item={tAnn}
        conflict={conflict}
        itemsById={itemsById}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
        testIdPrefix="r3"
      />,
    );

    await user.click(screen.getByTestId(`${prefix}-cancel-training`));
    await user.click(screen.getByTestId(`${prefix}-cancel-training-dialog-confirm`));
    await waitFor(() => {
      expect(screen.getByTestId(`${prefix}-cancel-training-dialog-error`)).toHaveTextContent("Nicht erlaubt");
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("J — pitch change action remains available alongside cancel shortcut", () => {
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const prefix = `r3-${tAnn.id}-${conflict.facilityResourceId}`;

    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        item={tAnn}
        conflict={conflict}
        itemsById={itemsById}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
        testIdPrefix="r3"
      />,
    );

    expect(screen.getByTestId(`${prefix}-cancel-training`)).toBeTruthy();
    expect(screen.getByTestId(`${prefix}-change-pitch`)).toBeTruthy();
  });
});
