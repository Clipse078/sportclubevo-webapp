/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import { fireEvent, render, screen } from "@testing-library/react";
import VereinsentwicklungConnectedTaskTable from "../VereinsentwicklungConnectedTaskTable";

const rows = [
  {
    taskId: "task-a",
    title: "Alpha task",
    taskHref: "/tasks/a",
    targetTitle: null,
    targetHref: null,
    strategyTitle: null,
    strategyHref: null,
    orgUnitLabel: null,
    status: "OPEN" as const,
    statusLabel: "Offen",
    assignees: [],
  },
  {
    taskId: "task-b",
    title: "Beta task",
    taskHref: "/tasks/b",
    targetTitle: null,
    targetHref: null,
    strategyTitle: null,
    strategyHref: null,
    orgUnitLabel: null,
    status: "OPEN" as const,
    statusLabel: "Offen",
    assignees: [],
  },
];

describe("VereinsentwicklungConnectedTaskTable reorder drag handle", () => {
  it("enables draggable grip without phases when canReorder is true", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        rows={rows}
        showReorderHandle
        reorder={{
          dragEnabled: false,
          canReorder: true,
          allOrderedTaskIds: ["task-a", "task-b"],
          onPersistOrder: vi.fn(async () => ({ ok: true })),
        }}
        testId="reorder-table"
      />,
    );

    const grip = screen.getByTestId("umsetzungsplanung-unplanned-drag-task-a");
    expect(grip.getAttribute("draggable")).toBe("true");
    expect(grip.tagName.toLowerCase()).toBe("div");
  });

  it("uses a non-anchor title surface when row scheduling drag is enabled", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        rows={rows}
        showReorderHandle
        reorder={{
          dragEnabled: true,
          canReorder: true,
          allOrderedTaskIds: ["task-a", "task-b"],
          onPersistOrder: vi.fn(async () => ({ ok: true })),
        }}
      />,
    );

    const titleSurface = screen.getAllByTestId("vereinsentwicklung-backlog-title-link")[0]!;
    expect(titleSurface.tagName.toLowerCase()).toBe("span");
    expect(titleSurface.getAttribute("role")).toBe("link");
    expect(titleSurface.getAttribute("draggable")).toBe("true");
  });

  it("starts a reorder drag session from the grip", () => {
    const onDragStart = vi.fn();
    render(
      <VereinsentwicklungConnectedTaskTable
        rows={rows}
        showReorderHandle
        reorder={{
          dragEnabled: false,
          canReorder: true,
          allOrderedTaskIds: ["task-a", "task-b"],
          onPersistOrder: vi.fn(async () => ({ ok: true })),
          onDragStart,
        }}
      />,
    );

    const grip = screen.getByTestId("umsetzungsplanung-unplanned-drag-task-b");
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 8, clientY: 0, pointerId: 1 });
    fireEvent.dragStart(grip, { dataTransfer: { setData: () => {}, effectAllowed: "move" } });
    expect(onDragStart).toHaveBeenCalledWith("task-b");
  });

  it("renders Strategie and Org-Einheit columns in full layout variant", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        layoutVariant="full"
        rows={[
          {
            ...rows[0]!,
            strategyTitle: "Club 2030",
            strategyHref: "/vereinsleitung/strategie-und-ziele?ansicht=strategie",
            orgUnitLabel: "Herren",
          },
        ]}
        testId="full-layout-table"
      />,
    );

    expect(screen.getByText("Strategie")).toBeTruthy();
    expect(screen.getByText("Org-Einheit")).toBeTruthy();
    expect(screen.getByText("Club 2030")).toBeTruthy();
    expect(screen.getByText("Herren")).toBeTruthy();
  });

  it("shows inline progress only for rows with child rollup", () => {
    render(
      <VereinsentwicklungConnectedTaskTable
        showRowProgress
        rows={[
          {
            ...rows[0]!,
            progressHasChildRollup: true,
            progressCompletedCount: 2,
            progressTotalCount: 3,
          },
          rows[1]!,
        ]}
        testId="progress-table"
      />,
    );

    expect(screen.getByText("66% – 2 von 3 erledigt")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});