/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
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
    fireEvent.dragStart(grip, { dataTransfer: { setData: () => {}, effectAllowed: "move" } });
    expect(onDragStart).toHaveBeenCalledWith("task-b");
  });
});