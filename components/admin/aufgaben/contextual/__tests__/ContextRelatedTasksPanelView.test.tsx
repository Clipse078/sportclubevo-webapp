/**
 * @vitest-environment jsdom
 * AUFGABEN-06F1-A2 — related panel empty states (§17).
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskContextType } from "@prisma/client";
import ContextRelatedTasksPanelView from "../ContextRelatedTasksPanelView";

vi.mock("../ContextualTaskCreateTrigger", () => ({
  default: ({ label }: { label: string }) => (
    <button type="button" data-testid="contextual-task-create-trigger">
      {label}
    </button>
  ),
}));

const baseProps = {
  contextType: TaskContextType.MATCH,
  contextId: "m1",
  actionableCount: 0,
  tasks: [],
  hasMore: false,
  locale: "de-CH",
  createDialogProps: {
    contextType: TaskContextType.MATCH,
    contextId: "m1",
    presentation: null,
    assigneeOptions: [],
    orgUnitOptions: [],
    timeZone: "Europe/Zurich",
    tenantWideVisibility: false,
  },
};

describe("ContextRelatedTasksPanelView empty states", () => {
  it("0 visible Tasks + can create shows empty state and create CTA", () => {
    render(
      <ContextRelatedTasksPanelView {...baseProps} canCreate actionableCount={0} />,
    );
    expect(screen.getByTestId("context-related-tasks-empty")).toBeInTheDocument();
    expect(screen.getAllByTestId("contextual-task-create-trigger").length).toBeGreaterThan(0);
    expect(screen.getByText(/Aufgaben · 0/)).toBeInTheDocument();
  });

  it("0 visible Tasks + cannot create shows neutral empty state without CTA", () => {
    render(
      <ContextRelatedTasksPanelView
        {...baseProps}
        canCreate={false}
        createDialogProps={null}
        actionableCount={0}
      />,
    );
    expect(screen.getByTestId("context-related-tasks-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("contextual-task-create-trigger")).not.toBeInTheDocument();
  });

  it("visible tasks render rows linked to canonical workspace", () => {
    render(
      <ContextRelatedTasksPanelView
        {...baseProps}
        canCreate={false}
        createDialogProps={null}
        actionableCount={2}
        tasks={[
          {
            id: "task-1",
            title: "First",
            status: "OPEN",
            priority: "NORMAL",
            dueAt: null,
            assignees: [{ userId: "u1", firstName: "A", lastName: "B" }],
          },
        ]}
      />,
    );
    const row = screen.getByTestId("context-related-task-row");
    expect(row).toHaveAttribute("href", "/dashboard/aufgaben/task-1");
    expect(screen.getByTestId("context-related-tasks-list")).toBeInTheDocument();
    expect(screen.queryByTestId("context-related-tasks-empty")).not.toBeInTheDocument();
  });

  it("hidden-only Tasks appear as zero visible (count 0, no task rows)", () => {
    render(
      <ContextRelatedTasksPanelView
        {...baseProps}
        canCreate={false}
        createDialogProps={null}
        actionableCount={0}
        tasks={[]}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Aufgaben · 0/)).toBeInTheDocument();
  });
});
