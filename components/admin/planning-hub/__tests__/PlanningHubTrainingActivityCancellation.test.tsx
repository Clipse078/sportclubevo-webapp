/**
 * @vitest-environment jsdom
 *
 * SCE-PLANNER-UX-08-07R4 — per-training cancellation on activity detail (not conflict cards).
 */

import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeAggregateInspectionMetrics } from "@/lib/planning-hub/aggregate-inspection";
import AggregatedActivityInspectionDialog from "../AggregatedActivityInspectionDialog";
import {
  PlanningHubPlannerWeekProvider,
  usePlanningHubPlannerWeek,
} from "../PlanningHubPlannerWeekContext";
import PlanningHubConflictResolutionActions from "../PlanningHubConflictResolutionActions";
import PlanningHubConflictWorkspaceDialog from "../PlanningHubConflictWorkspaceDialog";
import {
  PlanningHubManipulationContext,
  type PlanningHubManipulationContextValue,
} from "../PlanningHubManipulationContext";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "KR2A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const DRESSING = {
  facilityResourceId: "d1",
  facilityId: "f1",
  code: "O3",
  name: "O3",
  facilityName: "G",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const TS = "ts-senioren-30-fca";
const start = new Date("2026-10-07T18:15:00.000Z");
const trainEnd = new Date("2026-10-07T19:45:00.000Z");
const matchEnd = new Date("2026-10-07T20:15:00.000Z");

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  return {
    id: "training:30",
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: trainEnd,
    canonicalStartAt: start,
    canonicalEndAt: trainEnd,
    timeOverridden: false,
    title: "Senioren 30+",
    teamNames: ["Senioren 30+"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [DRESSING],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [DRESSING],
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
    ...overrides,
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
    dressingRoomAllocations: [DRESSING],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [DRESSING],
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

const permissionManage = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

const permissionReadOnly = {
  ...permissionManage,
  canManageTrainings: false,
};

function mockManipulation(): PlanningHubManipulationContextValue {
  return {
    enabled: true,
    isDragging: false,
    permissionContext: {
      ...permissionManage,
      resourceCategory: "pitch",
      manipulationSurface: "resource",
    },
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

function weekFromAnnotated(items: ReturnType<typeof annotateWeekplannerConflicts>) {
  return {
    days: [
      { dayKey: "2026-10-06", items: [] },
      { dayKey: "2026-10-07", items },
      { dayKey: "2026-10-08", items: [] },
      { dayKey: "2026-10-09", items: [] },
      { dayKey: "2026-10-10", items: [] },
      { dayKey: "2026-10-11", items: [] },
      { dayKey: "2026-10-12", items: [] },
    ],
    weekNumberLabel: "KW 41",
    rangeLabel: "6.–12. Okt 2026",
    param: "2026-10-06",
    previousParam: "2026-09-29",
    nextParam: "2026-10-13",
  } satisfies WeekplannerWeek;
}

function AggregateInspectionFromPlannerWeek({
  permission = permissionManage,
}: {
  permission?: typeof permissionManage;
}) {
  const plannerWeek = usePlanningHubPlannerWeek();
  const items = plannerWeek?.week.days.find((day) => day.dayKey === "2026-10-07")?.items ?? [];
  return (
    <AggregatedActivityInspectionDialog
      open
      onClose={() => {}}
      items={items}
      dayKey="2026-10-07"
      locale="de-CH"
      timezone="Europe/Zurich"
      onOpenItem={() => {}}
      permissionContext={permission}
    />
  );
}

function renderAggregate(items: ReturnType<typeof annotateWeekplannerConflicts>, permission = permissionManage) {
  const week = weekFromAnnotated(items);
  return renderWithManipulation(
    <PlanningHubPlannerWeekProvider serverWeek={week} timezone="Europe/Zurich">
      <AggregateInspectionFromPlannerWeek permission={permission} />
    </PlanningHubPlannerWeekProvider>,
  );
}

describe("PlanningHubTrainingActivityCancellation — aggregate inspection", () => {
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

  it("A–E — one Training absagen on selected training with match + multi conflict edges", async () => {
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await userEvent.setup().click(screen.getByTestId("aggregate-inspection-row-training:30"));

    const detail = screen.getByTestId("aggregate-inspection-detail-pane");
    expect(within(detail).getAllByRole("button", { name: "Training absagen" })).toHaveLength(1);
    expect(screen.queryByTestId(/aggregate-inspection-training:30-.*-cancel-training$/)).toBeNull();
  });

  it("F — match selected never shows Training absagen", async () => {
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await userEvent.setup().click(screen.getByTestId("aggregate-inspection-row-match:30"));
    expect(screen.queryByRole("button", { name: "Training absagen" })).toBeNull();
  });

  it("G — unauthorized training manager sees no cancel", async () => {
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated, permissionReadOnly);
    await userEvent.setup().click(screen.getByTestId("aggregate-inspection-row-training:30"));
    expect(screen.queryByRole("button", { name: "Training absagen" })).toBeNull();
  });

  it("H+I — switching training ↔ match toggles cancel affordance", async () => {
    const user = userEvent.setup();
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    expect(screen.getByRole("button", { name: "Training absagen" })).toBeTruthy();
    await user.click(screen.getByTestId("aggregate-inspection-row-match:30"));
    expect(screen.queryByRole("button", { name: "Training absagen" })).toBeNull();
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    expect(screen.getByRole("button", { name: "Training absagen" })).toBeTruthy();
  });

  it("B+C — training-only conflict and no match still offers cancel once", async () => {
    const other = training({
      id: "training:40",
      trainingSessionId: "sess-40",
      teamSeasonId: "ts-40",
      teamNames: ["Senioren 40+"],
      title: "Senioren 40+",
    });
    const annotated = annotateWeekplannerConflicts([training(), other]);
    renderAggregate(annotated);
    await userEvent.setup().click(screen.getByTestId("aggregate-inspection-row-training:30"));
    expect(screen.getAllByRole("button", { name: "Training absagen" })).toHaveLength(1);
  });

  it("J — confirmation identity uses training only, not match opponent", async () => {
    const user = userEvent.setup();
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training"));

    const identity = screen.getByTestId("aggregate-inspection-cancel-training-dialog-identity");
    expect(within(identity).getByText("Senioren 30+")).toBeTruthy();
    expect(within(identity).getByText("Training")).toBeTruthy();
    expect(within(identity).queryByText("FC Dardania")).toBeNull();
    expect(within(identity).queryByText(/vs FC Dardania/)).toBeNull();
    expect(screen.getByText(/Es wird nur dieses Training abgesagt/)).toBeTruthy();
  });

  it("R5 — successful cancellation removes training from open aggregate immediately", async () => {
    const user = userEvent.setup();
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    const metricsBefore = computeAggregateInspectionMetrics(annotated);
    expect(metricsBefore.activityCount).toBe(2);

    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training-dialog-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("aggregate-inspection-row-training:30")).toBeNull();
    });
    expect(screen.getByTestId("aggregate-inspection-title")).toHaveTextContent("1 gleichzeitige Aktivitäten");
    expect(screen.getByTestId("aggregate-inspection-row-match:30")).toBeTruthy();
    const patchCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      String(url).includes("/api/training-sessions/sess-30"),
    );
    expect(patchCalls).toHaveLength(1);
  });

  it("R5 — refresh failure shows warning without issuing second PATCH", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.includes("/api/training-sessions/sess-30")) {
          return new Response(JSON.stringify({ session: { id: "sess-30", status: "CANCELLED" } }), {
            status: 200,
          });
        }
        if (url.includes("/api/planning-hub/planner-revalidate")) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderAggregate(annotateWeekplannerConflicts([training(), homeMatch()]));
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training-dialog-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("aggregate-inspection-sync-warning")).toBeTruthy();
    });
    const patchCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      String(url).includes("/api/training-sessions/sess-30"),
    );
    expect(patchCalls).toHaveLength(1);
    expect(screen.queryByTestId("aggregate-inspection-row-training:30")).toBeNull();
  });

  it("K+L — confirm PATCHes session and refreshes planner", async () => {
    const user = userEvent.setup();
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training-dialog-confirm"));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/training-sessions/sess-30",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    const patchCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      String(url).includes("/api/training-sessions/sess-30"),
    );
    expect(patchCalls).toHaveLength(1);
    expect(JSON.parse(String(patchCalls[0]![1]?.body))).toEqual({ status: "CANCELLED" });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/planning-hub/planner-revalidate", { method: "POST" });
    expect(refresh).toHaveBeenCalled();
  });

  it("M — failed mutation keeps context and shows error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Nicht erlaubt" }), { status: 403 })),
    );
    const user = userEvent.setup();
    const annotated = annotateWeekplannerConflicts([training(), homeMatch()]);
    renderAggregate(annotated);
    await user.click(screen.getByTestId("aggregate-inspection-row-training:30"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training"));
    await user.click(screen.getByTestId("aggregate-inspection-cancel-training-dialog-confirm"));
    await waitFor(() => {
      expect(screen.getByTestId("aggregate-inspection-cancel-training-dialog-error")).toHaveTextContent(
        "Nicht erlaubt",
      );
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId("aggregate-inspection-detail-pane")).toBeTruthy();
  });

  it("Q — conflict cards keep resource actions without cancel", () => {
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const prefix = `aggregate-inspection-${tAnn.id}-${conflict.facilityResourceId}`;

    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        item={tAnn}
        conflict={conflict}
        itemsById={itemsById}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionManage}
        onOpenItem={vi.fn()}
        testIdPrefix="aggregate-inspection"
      />,
    );

    expect(screen.queryByTestId(`${prefix}-cancel-training`)).toBeNull();
    expect(screen.getByTestId(`${prefix}-change-pitch`)).toBeTruthy();
  });
});

describe("PlanningHubTrainingActivityCancellation — conflict workspace", () => {
  beforeEach(() => {
    refresh.mockClear();
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

  it("offers cancel on training primary activity in conflict workspace", async () => {
    const [tAnn, mAnn] = annotateWeekplannerConflicts([training(), homeMatch()]);
    const week: WeekplannerWeek = {
      days: [
        { dayKey: "2026-10-06", items: [] },
        { dayKey: "2026-10-07", items: [tAnn, mAnn] },
        { dayKey: "2026-10-08", items: [] },
        { dayKey: "2026-10-09", items: [] },
        { dayKey: "2026-10-10", items: [] },
        { dayKey: "2026-10-11", items: [] },
        { dayKey: "2026-10-12", items: [] },
      ],
      weekNumberLabel: "KW 41",
      rangeLabel: "6.–12. Okt 2026",
      param: "2026-10-06",
      previousParam: "2026-09-29",
      nextParam: "2026-10-13",
    };
    renderWithManipulation(
      <PlanningHubConflictWorkspaceDialog
        open
        onClose={() => {}}
        week={week}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionManage}
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("conflict-workspace-cancel-training")).toBeTruthy();
  });
});
