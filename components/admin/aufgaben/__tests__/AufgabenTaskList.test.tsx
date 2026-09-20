/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AufgabenTaskList from "../AufgabenTaskList";
import type { TaskManagementListItem } from "@/lib/tasks/management-service";

vi.mock("@/app/(admin)/dashboard/aufgaben/actions", () => ({
  assignAufgabeAction: vi.fn().mockResolvedValue({ ok: true }),
  completeAufgabeAction: vi.fn().mockResolvedValue({ ok: true }),
  updateAufgabeStatusAction: vi.fn().mockResolvedValue({ ok: true }),
}));

const baseTask = {
  id: "task-1",
  tenantId: "tenant-1",
  title: "Heimturnier F2 vorbereiten",
  description: null,
  status: "OPEN" as const,
  priority: "HIGH" as const,
  dueAt: "2026-10-17T12:00:00.000Z",
  completedAt: null,
  contextType: null,
  contextId: null,
  parentTaskId: null,
  taskSeriesId: null,
  createdByUserId: "user-1",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  assignees: [
    {
      userId: "user-2",
      firstName: "Michael",
      lastName: "Muster",
      assignedAt: "2026-09-01T10:00:00.000Z",
    },
  ],
};

const item: TaskManagementListItem = {
  task: baseTask,
  parentTask: null,
  subtasks: [
    {
      ...baseTask,
      id: "sub-1",
      parentTaskId: "task-1",
      title: "Plätze reservieren",
      status: "DONE",
    },
    {
      ...baseTask,
      id: "sub-2",
      parentTaskId: "task-1",
      title: "Gegner bestätigen",
      status: "OPEN",
    },
  ],
  progress: {
    completedCount: 1,
    totalCount: 2,
    percent: 50,
    label: "1 / 2 erledigt",
  },
  seriesRecurrenceLabel: null,
  expandable: true,
};

describe("AufgabenTaskList", () => {
  it("renders root task progress and expands subtasks", () => {
    render(
      <AufgabenTaskList
        items={[item]}
        locale="de-CH"
        timeZone="Europe/Zurich"
        canAssign
        canComplete
        assigneeOptions={[]}
        showParentContext={false}
      />,
    );

    expect(screen.getByText("Heimturnier F2 vorbereiten")).toBeInTheDocument();
    expect(screen.getByTestId("aufgaben-progress-task-1")).toHaveTextContent("1 / 2 erledigt");
    expect(screen.queryByText("Plätze reservieren")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("aufgaben-expand-task-1"));
    expect(screen.getByText("Plätze reservieren")).toBeInTheDocument();
    expect(screen.getByText("Gegner bestätigen")).toBeInTheDocument();
  });

  it("shows parent context for assigned subtasks", () => {
    render(
      <AufgabenTaskList
        items={[
          {
            ...item,
            task: { ...baseTask, id: "sub-2", title: "Gegner bestätigen", parentTaskId: "task-1" },
            parentTask: { id: "task-1", title: "Heimturnier F2 vorbereiten" },
            subtasks: [],
            expandable: false,
          },
        ]}
        locale="de-CH"
        timeZone="Europe/Zurich"
        canAssign={false}
        canComplete
        assigneeOptions={[]}
        showParentContext
      />,
    );

    expect(screen.getByText("↳ Heimturnier F2 vorbereiten")).toBeInTheDocument();
  });
});
