/**
 * @vitest-environment jsdom
 *
 * SCE-PLANNER-UX-08-05R1 — conflict contextual actions → canonical 08-02/08-03 handoff.
 */

import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanningHubConflictResolutionActions from "../PlanningHubConflictResolutionActions";
import PlanningHubConflictWorkspaceDialog from "../PlanningHubConflictWorkspaceDialog";
import {
  PlanningHubManipulationContext,
  PlanningHubManipulationProvider,
  type PlanningHubManipulationContextValue,
} from "../PlanningHubManipulationContext";
import type { WeekplannerItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const PITCH = {
  facilityResourceId: "pitch-k2a",
  facilityId: "f1",
  code: "A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const ROOM = {
  facilityResourceId: "room-e1",
  facilityId: "f2",
  code: "E1",
  name: "E1",
  facilityName: "G",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(
  id: string,
  team: string,
  startAt: Date,
  endAt: Date,
): WeekplannerTrainingItem {
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Training",
    teamNames: [team],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [ROOM],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [ROOM],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: false,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

const LOCALE = "de-CH";
const TIMEZONE = "Europe/Zurich";

function conflictActionProps(
  item: WeekplannerItem,
  conflict: { facilityResourceId: string; facilityResourceName: string; resourceKind: "PITCH_HALL" | "DRESSING_ROOM" },
  itemsById?: Map<string, WeekplannerItem>,
  overrides: Record<string, unknown> = {},
) {
  const map = itemsById ?? new Map([[item.id, item]]);
  return {
    item,
    conflict,
    itemsById: map,
    locale: LOCALE,
    timezone: TIMEZONE,
    permissionContext,
    onOpenItem: vi.fn(),
    testIdPrefix: "handoff",
    ...overrides,
  };
}

function mockManipulation(
  overrides: Partial<PlanningHubManipulationContextValue> = {},
): PlanningHubManipulationContextValue {
  return {
    enabled: true,
    isDragging: false,
    permissionContext: {
      ...permissionContext,
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
    ...overrides,
  };
}

function renderWithManipulation(ui: ReactNode, value: PlanningHubManipulationContextValue) {
  return render(
    <PlanningHubManipulationContext.Provider value={value}>{ui}</PlanningHubManipulationContext.Provider>,
  );
}

describe("PlanningHubConflictResolutionActions — canonical handoff", () => {
  beforeEach(() => {
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

  const start = new Date("2026-09-28T15:00:00.000Z");
  const end = new Date("2026-09-28T16:30:00.000Z");
  const item = training("training:f2", "Junioren F2", start, end);
  const pitchConflict = {
    facilityResourceId: PITCH.facilityResourceId,
    facilityResourceName: PITCH.name,
    resourceKind: "PITCH_HALL" as const,
  };
  const dressingConflict = {
    facilityResourceId: ROOM.facilityResourceId,
    facilityResourceName: ROOM.name,
    resourceKind: "DRESSING_ROOM" as const,
  };

  it("A — Spielfeld ändern invokes openResourceEditorForConflict with pitch category", async () => {
    const user = userEvent.setup();
    const openResourceEditorForConflict = vi.fn();
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, pitchConflict)}
      />,
      mockManipulation({ openResourceEditorForConflict }),
    );
    await user.click(screen.getByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-change-pitch`));
    expect(openResourceEditorForConflict).toHaveBeenCalledWith(item, PITCH.facilityResourceId, "pitch");
  });

  it("B — Garderobe ändern invokes openResourceEditorForConflict with dressing category", async () => {
    const user = userEvent.setup();
    const openResourceEditorForConflict = vi.fn();
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, dressingConflict)}
      />,
      mockManipulation({ openResourceEditorForConflict }),
    );
    await user.click(screen.getByTestId(`handoff-${item.id}-${ROOM.facilityResourceId}-change-dressing`));
    expect(openResourceEditorForConflict).toHaveBeenCalledWith(item, ROOM.facilityResourceId, "dressing");
  });

  it("C — Termin ändern invokes openActivityScheduleEditorForConflict", async () => {
    const user = userEvent.setup();
    const openActivityScheduleEditorForConflict = vi.fn();
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, pitchConflict)}
      />,
      mockManipulation({ openActivityScheduleEditorForConflict }),
    );
    await user.click(screen.getByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-change-time`));
    expect(openActivityScheduleEditorForConflict).toHaveBeenCalledWith(item);
  });

  it("D — Öffnen invokes onOpenItem", async () => {
    const user = userEvent.setup();
    const onOpenItem = vi.fn();
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, pitchConflict, undefined, { onOpenItem })}
      />,
      mockManipulation(),
    );
    await user.click(screen.getByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-open`));
    expect(onOpenItem).toHaveBeenCalledWith(item);
  });

  it("E — unavailable capabilities hide mutation actions", () => {
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, pitchConflict, undefined, {
          permissionContext: {
            ...permissionContext,
            canManageTrainings: false,
            canManageEvents: false,
            canManageAllocations: false,
          },
        })}
      />,
      mockManipulation(),
    );
    expect(screen.queryByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-change-pitch`)).toBeNull();
    expect(screen.queryByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-change-time`)).toBeNull();
  });

  it("F — provider-managed activity hides Termin ändern", () => {
    const providerMatch = {
      ...item,
      id: "match:sfv",
      type: "MATCH" as const,
      eventId: "ev-1",
      eventSource: "SFV" as const,
      opponentName: "FC Test",
    };
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(providerMatch, pitchConflict)}
      />,
      mockManipulation(),
    );
    expect(
      screen.queryByTestId(`handoff-${providerMatch.id}-${PITCH.facilityResourceId}-change-time`),
    ).toBeNull();
  });

  it("G — disabled manipulation context does not render mutation buttons", () => {
    renderWithManipulation(
      <PlanningHubConflictResolutionActions
        {...conflictActionProps(item, pitchConflict)}
      />,
      mockManipulation({ enabled: false }),
    );
    expect(screen.queryByTestId(`handoff-${item.id}-${PITCH.facilityResourceId}-change-pitch`)).toBeNull();
  });
});

describe("PlanningHubConflictResolutionActions — elevated editor over workspace", () => {
  beforeEach(() => {
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

  it("opens portalled 08-02 editor above conflict workspace dialog", async () => {
    const user = userEvent.setup();
    const start = new Date("2026-09-28T15:00:00.000Z");
    const end = new Date("2026-09-28T16:30:00.000Z");
    const itemA = training("training:a", "Junioren F1", start, end);
    const itemB = training("training:b", "Junioren F2", start, end);
    const week: WeekplannerWeek = {
      weekKey: "2026-W39",
      days: [
        {
          dayKey: "2026-09-28",
          items: annotateWeekplannerConflicts([itemA, itemB]),
        },
      ],
    };

    render(
      <>
        <PlanningHubManipulationProvider
          week={week}
          urlState={{
            perspective: "kalender",
            resourceCategory: "pitch",
            day: "2026-09-28",
            q: "",
            teams: [],
            facilities: [],
          }}
          locale="de-CH"
          timezone="Europe/Zurich"
          isStandardplan
          alternativePlanId={null}
          canManageTrainings
          canManageEvents={false}
          canManageAllocations
          facilityGroupsByAllocationGroup={{
            PITCH_HALL: [
              {
                facilityId: "f1",
                facilityName: "Anlage",
                resources: [
                  {
                    id: PITCH.facilityResourceId,
                    name: PITCH.name,
                    code: PITCH.code,
                    type: "FULL_PITCH",
                    facilityId: "f1",
                    facilityName: "Anlage",
                  },
                ],
              },
            ],
            DRESSING_ROOM: [],
          }}
        >
          <PlanningHubConflictWorkspaceDialog
            open
            onClose={vi.fn()}
            week={week}
            locale="de-CH"
            timezone="Europe/Zurich"
            permissionContext={permissionContext}
            onOpenItem={vi.fn()}
          />
        </PlanningHubManipulationProvider>
      </>,
    );

    expect(screen.getByTestId("planning-conflict-workspace-dialog")).toBeTruthy();

    const pitchButtons = screen.getAllByRole("button", { name: "Spielfeld ändern" });
    await user.click(pitchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("planning-hub-manipulation-edit")).toBeTruthy();
    });
    const elevated = screen.getByTestId("planning-hub-manipulation-edit");
    expect(elevated.getAttribute("data-stack-layer")).toBe("elevated");
    expect(screen.getByText("Planung ändern")).toBeTruthy();
  });
});

describe("PlanningHubConflictWorkspaceDialog — open lifecycle (08-05R8)", () => {
  it("opens from closed without violating React hook order (Prüfen UAT blocker)", async () => {
    const start = new Date("2026-09-28T15:00:00.000Z");
    const end = new Date("2026-09-28T16:30:00.000Z");
    const itemA = training("training:a", "Junioren F1", start, end);
    const itemB = training("training:b", "Junioren F2", start, end);
    const week: WeekplannerWeek = {
      weekKey: "2026-W39",
      days: [
        {
          dayKey: "2026-09-28",
          items: annotateWeekplannerConflicts([itemA, itemB]),
        },
      ],
    };

    const { rerender } = render(
      <PlanningHubConflictWorkspaceDialog
        open={false}
        onClose={vi.fn()}
        week={week}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("planning-conflict-workspace-dialog")).toBeNull();

    rerender(
      <PlanningHubConflictWorkspaceDialog
        open
        onClose={vi.fn()}
        week={week}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
      />,
    );

    expect(screen.getByTestId("planning-conflict-workspace-dialog")).toBeTruthy();
    expect(screen.getByText("Planungskonflikte prüfen")).toBeTruthy();
    expect(screen.getByText("Garderobe E1")).toBeTruthy();
  });
});

describe("PlanningHubConflictWorkspaceDialog — resource-type list clarity (08-05R7)", () => {
  it("shows Garderobe and Spielfeld primary labels in the incident list", () => {
    const start = new Date("2026-09-28T15:00:00.000Z");
    const end = new Date("2026-09-28T16:30:00.000Z");
    const itemA = training("training:a", "Junioren F1", start, end);
    const itemB = training("training:b", "Junioren F2", start, end);
    const week: WeekplannerWeek = {
      weekKey: "2026-W39",
      days: [
        {
          dayKey: "2026-09-28",
          items: annotateWeekplannerConflicts([itemA, itemB]),
        },
      ],
    };

    render(
      <PlanningHubConflictWorkspaceDialog
        open
        onClose={vi.fn()}
        week={week}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
      />,
    );

    expect(screen.getByText("Garderobe E1")).toBeTruthy();
    expect(screen.getByText(/Spielfeld Kunstrasen 2 · A/)).toBeTruthy();
    const filter = screen.getByTestId("conflict-workspace-kind-filter") as HTMLSelectElement;
    expect(filter.textContent).toMatch(/Alle Konflikte \(\d+\)/);
    expect(filter.textContent).toMatch(/Spielfelder \(\d+\)/);
    expect(filter.textContent).toMatch(/Garderoben \(\d+\)/);
  });
});

describe("PlanningHubConflictWorkspaceDialog — time presentation", () => {
  it("H/I — sport time vs resource reservation are labeled distinctly", () => {
    const start = new Date("2026-09-28T15:00:00.000Z");
    const end = new Date("2026-09-28T16:30:00.000Z");
    const itemA = training("training:a", "Junioren F1", start, end);
    const itemB = training("training:b", "Junioren F2", start, end);
    const week: WeekplannerWeek = {
      weekKey: "2026-W39",
      days: [
        {
          dayKey: "2026-09-28",
          items: annotateWeekplannerConflicts([itemA, itemB]),
        },
      ],
    };

    render(
      <PlanningHubConflictWorkspaceDialog
        open
        onClose={vi.fn()}
        week={week}
        locale="de-CH"
        timezone="Europe/Zurich"
        permissionContext={permissionContext}
        onOpenItem={vi.fn()}
      />,
    );

    const sportLine = screen.getByTestId("conflict-workspace-activity-sport-time");
    expect(sportLine.textContent).toContain("Sporttermin");
    expect(sportLine.textContent).toMatch(/17:00.*18:30/);

    const reservation = screen.getAllByTestId("conflict-workspace-own-reservation")[0];
    expect(reservation.textContent).toContain("Reservierung");
    expect(reservation.textContent).toMatch(/16:45.*18:30/);
  });
});
