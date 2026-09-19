/**
 * @vitest-environment jsdom
 *
 * PLANNING-UX-03D — Aggregated activity inspection dialog
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AggregatedActivityInspectionDialog from "../AggregatedActivityInspectionDialog";
import PlanningHubCalendarClusterBlock from "../PlanningHubCalendarClusterBlock";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function baseItem(partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "id" | "type">): WeekplannerItem {
  return {
    tenantId: "t1",
    startAt: new Date("2026-09-16T16:45:00.000Z"),
    endAt: new Date("2026-09-16T18:15:00.000Z"),
    canonicalStartAt: new Date("2026-09-16T16:45:00.000Z"),
    canonicalEndAt: new Date("2026-09-16T18:15:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["Junioren B1"],
    pitchAllocations: [
      {
        facilityResourceId: "p1",
        facilityId: "f",
        code: "KR2B",
        name: "Kunstrasen 2 B",
        facilityName: "Anlage",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
    dressingRoomAllocations: [
      {
        facilityResourceId: "d1",
        facilityId: "f",
        code: "E2",
        name: "E2",
        facilityName: "G",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
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
    trainingSeriesId: "ser",
    trainingSessionId: "sess-1",
    teamSeasonId: "ts",
    ...partial,
  } as WeekplannerItem;
}

function buildItems(count: number, withConflictOnFirst = false): WeekplannerItem[] {
  return Array.from({ length: count }, (_, index) =>
    baseItem({
      id: `training:${index}`,
      type: "TRAINING",
      trainingSessionId: `sess-${index}`,
      teamNames: [`Team ${index}`],
      title: `Training ${index}`,
      startAt: new Date(`2026-09-16T${String(16 + (index % 5)).padStart(2, "0")}:45:00.000Z`),
      conflicts:
        withConflictOnFirst && index === 2
          ? [
              {
                facilityResourceId: "d1",
                facilityResourceName: "E1",
                resourceKind: "DRESSING_ROOM",
                partnerItemId: `training:${index + 1}`,
                partnerTitle: "Partner",
                occupancyStartAt: new Date("2026-09-16T17:15:00.000Z"),
                occupancyEndAt: new Date("2026-09-16T18:45:00.000Z"),
              },
            ]
          : [],
    }),
  );
}

describe("AggregatedActivityInspectionDialog", () => {
  it("shows activity count, time range, and all rows", () => {
    const items = buildItems(8);
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    expect(screen.getByTestId("aggregate-inspection-title")).toHaveTextContent(
      "8 gleichzeitige Aktivitäten",
    );
    expect(screen.getByText(/September 2026/)).toBeInTheDocument();
    const rows = within(screen.getByTestId("aggregate-inspection-table-body")).getAllByRole("row");
    expect(rows).toHaveLength(8);
    expect(screen.getAllByText("Training").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Train\.\.\.$/)).toBeNull();
    expect(screen.queryByText(/^Train…$/)).toBeNull();
  });

  it("selects first conflicting activity by default and shows conflict explanation", () => {
    const items = [
      baseItem({ id: "training:0", type: "TRAINING", teamNames: ["Team 0"] }),
      baseItem({ id: "training:1", type: "TRAINING", teamNames: ["Team 1"] }),
      baseItem({
        id: "training:3",
        type: "TRAINING",
        teamNames: ["Juniorinnen FF-14"],
        startAt: new Date("2026-09-16T17:15:00.000Z"),
        conflicts: [
          {
            facilityResourceId: "d1",
            facilityResourceName: "E1",
            resourceKind: "DRESSING_ROOM",
            partnerItemId: "training:4",
            partnerTitle: "Fallback",
            occupancyStartAt: new Date("2026-09-16T17:15:00.000Z"),
            occupancyEndAt: new Date("2026-09-16T18:45:00.000Z"),
          },
        ],
      }),
      baseItem({
        id: "training:4",
        type: "TRAINING",
        teamNames: ["Juniorinnen FF-17"],
      }),
    ];

    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    const conflictRow = screen.getByTestId("aggregate-inspection-row-training:3");
    expect(conflictRow).toHaveAttribute("data-selected", "true");
    expect(screen.getByText("Garderobe E1 doppelt belegt")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("aggregate-inspection-conflict-explanations")).getByText(
        "Juniorinnen FF-17",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Zur gleichen Zeit durch:")).toBeInTheDocument();
  });

  it("row selection updates detail pane", async () => {
    const user = userEvent.setup();
    const items = [
      baseItem({ id: "a", type: "TRAINING", teamNames: ["Alpha"] }),
      baseItem({ id: "b", type: "TRAINING", teamNames: ["Beta"] }),
    ];
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    await user.click(screen.getByTestId("aggregate-inspection-row-b"));
    expect(screen.getByTestId("aggregate-inspection-row-b")).toHaveAttribute("data-selected", "true");
    expect(within(screen.getByTestId("aggregate-inspection-detail-pane")).getByText("Beta")).toBeInTheDocument();
  });

  it("Nur Konflikte filters rows and reselects", async () => {
    const user = userEvent.setup();
    const items = [
      baseItem({ id: "ok", type: "TRAINING" }),
      baseItem({
        id: "bad",
        type: "TRAINING",
        teamNames: ["Konflikt Team"],
        conflicts: [{ facilityResourceId: "p", facilityResourceName: "Platz" }],
      }),
    ];
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    await user.click(screen.getByTestId("aggregate-inspection-conflicts-only"));
    expect(screen.getByTestId("aggregate-inspection-row-bad")).toHaveAttribute("data-selected", "true");
    expect(screen.queryByTestId("aggregate-inspection-row-ok")).not.toBeInTheDocument();
  });

  it("search filters by facility name", async () => {
    const user = userEvent.setup();
    const items = [
      baseItem({ id: "a", type: "TRAINING", teamNames: ["A"] }),
      baseItem({
        id: "b",
        type: "TRAINING",
        teamNames: ["B"],
        pitchAllocations: [
          {
            facilityResourceId: "p9",
            facilityId: "f",
            code: "X",
            name: "Sonderplatz Nord",
            facilityName: "Anlage",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
      }),
    ];
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Aktivitäten durchsuchen"), "sonderplatz");
    expect(screen.getByTestId("aggregate-inspection-row-b")).toBeInTheDocument();
    expect(screen.queryByTestId("aggregate-inspection-row-a")).not.toBeInTheDocument();
  });

  it("sort descending by start time", async () => {
    const user = userEvent.setup();
    const items = [
      baseItem({
        id: "early",
        type: "TRAINING",
        startAt: new Date("2026-09-16T16:00:00.000Z"),
        teamNames: ["Early"],
      }),
      baseItem({
        id: "late",
        type: "TRAINING",
        startAt: new Date("2026-09-16T19:00:00.000Z"),
        teamNames: ["Late"],
      }),
    ];
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );

    await user.selectOptions(screen.getByTestId("aggregate-inspection-sort"), "start-desc");
    const rows = within(screen.getByTestId("aggregate-inspection-table-body")).getAllByRole("row");
    expect(rows[0]).toHaveAttribute("data-testid", "aggregate-inspection-row-late");
  });

  it("open and edit actions invoke callbacks", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    const item = baseItem({ id: "a", type: "TRAINING" });
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[item]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={onOpen}
        onEditItem={onEdit}
        canEditItem={() => true}
      />,
    );

    await user.click(screen.getByTestId("aggregate-inspection-edit"));
    expect(onEdit).toHaveBeenCalledWith(item);
    await user.click(screen.getByTestId("aggregate-inspection-open"));
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={onClose}
        items={buildItems(2)}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders 20+ activities without crashing", () => {
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={buildItems(22)}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    expect(
      within(screen.getByTestId("aggregate-inspection-table-body")).getAllByRole("row"),
    ).toHaveLength(22);
  });

  it("handles mixed activity types and missing resources", () => {
    const items = [
      baseItem({ id: "t", type: "TRAINING", pitchAllocations: [], dressingRoomAllocations: [] }),
      baseItem({
        id: "m",
        type: "MATCH",
        eventId: "ev",
        opponentName: "Opponent",
        homeAway: "HOME",
        awayDressingRoomAllocations: [],
        pitchAllocations: [],
        dressingRoomAllocations: [],
        teamNames: ["Seniors"],
      }),
    ] as WeekplannerItem[];
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={items}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByText("Spiel")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows planned status when no conflicts", () => {
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[baseItem({ id: "a", type: "TRAINING" })]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("aggregate-inspection-detail-status")).toHaveTextContent("Geplant");
  });

  it("disables Nur Konflikte when no conflicts exist", () => {
    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[baseItem({ id: "a", type: "TRAINING" })]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    expect(screen.getByTestId("aggregate-inspection-conflicts-only")).toBeDisabled();
  });
});

describe("PlanningHubCalendarClusterBlock", () => {
  it("clicking aggregate opens inspection dialog", async () => {
    const user = userEvent.setup();
    render(
      <PlanningHubCalendarClusterBlock
        items={buildItems(3)}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
    );
    await user.click(screen.getByTestId("planning-hub-calendar-cluster"));
    expect(screen.getByTestId("aggregated-activity-inspection-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("aggregate-inspection-title")).toHaveTextContent(
      "3 gleichzeitige Aktivitäten",
    );
  });
});
